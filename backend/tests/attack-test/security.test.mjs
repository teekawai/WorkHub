// SEC: bảo mật (Bước 7, Task 7) — JWT giả, injection, payload xấu, mass assignment đánh thật vào BE.
// Chạy riêng: node backend/tests/attack-test/security.test.mjs [--base=http://localhost:5165/api]
//
// JWT tự ký bằng node:crypto (HMAC-SHA256), JWT:Key/Issuer/Audience đọc từ appsettings.json vào bộ nhớ, KHÔNG in / ghi ra đâu.
// Payload token tự ký dựng từ payload token thật (giữ đúng tên claim BE dùng: ClaimTypes.NameIdentifier / Role + token_type),
// và có case ĐỐI CHỨNG SEC-01-ctl: token tự ký hợp lệ được BE chấp nhận (2xx) -> các case 401 bên dưới mới có nghĩa.
// Mỗi case: status/code đúng VÀ DB (job/employerprofile/users của scope) không đổi. Mutation làm từng ID đỏ ghi ở comment đầu mỗi nhóm.
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE, TS, adminUnverify, adminVerify, call, ck, isMain, jobBody, makeCrowd, makeTempAdmin, paceAuth, postJob, runAttackSuites, sleep, sql, sqlInt, verifyView,
} from "./lib.mjs";
import { TEMP_PWD, untilNotRateLimited } from "../admin-test/lib.mjs";

export const name = "SEC: bảo mật (JWT giả, injection, payload xấu, mass assignment)";

// ─── Cấu hình JWT (chỉ trong bộ nhớ) ───────────────────────────
const CFG = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "appsettings.json"), "utf8").replace(/^﻿/, ""));
const KEY = String(CFG.JWT?.Key || "");
const ISS = String(CFG.JWT?.Issuer || "");
const AUD = String(CFG.JWT?.Audience || "");
const GHOST = `atk_${TS}_ghost`; // userId không tồn tại; cleanAttack của lib cũng dọn theo tên này

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const payloadOf = (t) => JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString());
const keyOf = (p, re) => Object.keys(p).find((k) => re.test(k));
/** Ký JWT; alg "none" = không chữ ký (phần 3 rỗng) */
function sign(payload, { key = KEY, alg = "HS256" } = {}) {
  const head = `${b64({ alg, typ: "JWT" })}.${b64(payload)}`;
  return alg === "none" ? `${head}.` : `${head}.${crypto.createHmac("sha256", key).update(head).digest("base64url")}`;
}

const show = (r) => `${r.status} ${r.data?.code ?? ""} ${String(r.data?.message ?? "").slice(0, 60)}`;
const okAny = (r, alts) => alts.some(([s, c]) => r.status === s && (c === undefined || r.data?.code === c));
const inList = (ids) => ids.map((i) => `'${i}'`).join(",");
/** Ảnh chụp DB của scope: job + employerprofile + users (SELECT * -> mọi cột, kể cả passwordHash, chỉ so sánh trong bộ nhớ) */
const snap = (ids) => {
  const l = inList(ids);
  return [
    sql(`SELECT * FROM job WHERE employerId IN (${l}) ORDER BY jobId`),
    sql(`SELECT * FROM employerprofile WHERE userId IN (${l}) ORDER BY userId`),
    sql(`SELECT * FROM users WHERE userId IN (${l}) ORDER BY userId`),
  ].join("\n--\n");
};

let n429 = 0; // 429 của job_search: hợp lệ, đếm riêng, không tính là lỗi
/** GET có chờ + thử lại khi dính rate limit (không tính vào assertion) */
async function getRetry(user, p) {
  let r;
  for (let i = 0; i < 3; i++) {
    r = await call(user, "GET", p);
    if (r.status !== 429) return r;
    n429++;
    await sleep((parseInt(r.headers.get("retry-after") || "60", 10) + 1) * 1000);
  }
  return r;
}

/** HTTP thô qua net (fetch từ chối ký tự CR/LF/NUL trong header nên không gửi được) */
function rawHttp(reqText) {
  const u = new URL(BASE);
  return new Promise((resolve) => {
    const sock = net.connect(Number(u.port || 80), u.hostname);
    let buf = "";
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      sock.destroy();
      const m = /^HTTP\/1\.[01] (\d{3})/.exec(buf);
      resolve({ status: m ? Number(m[1]) : 0, text: buf });
    };
    const timer = setTimeout(done, 4000);
    sock.on("data", (d) => { buf += d.toString("latin1"); });
    sock.on("close", done);
    sock.on("error", done);
    sock.write(reqText);
  });
}

// ══ SEC-01: JWT giả ═══════════════════════════════════════════
// Đỏ khi: SEC-01-none/-nosig: RequireSignedTokens=false | SEC-01-tamper/-key: gán SignatureValidator bỏ qua chữ ký (ValidateIssuerSigningKey=false KHÔNG tắt kiểm chữ ký nên không làm đỏ) | SEC-01-exp: ValidateLifetime=false (M5)
// SEC-01-refresh / -notype: bỏ kiểm token_type trong OnTokenValidated (M5) | SEC-01-iss/-aud: ValidateIssuer / ValidateAudience = false
// SEC-01-ghost/-deleted: handler VerifiedEmployer bỏ kiểm profile tồn tại (mất 403 EMPLOYER_PROFILE_NOT_FOUND)
// SEC-01-ctl (đối chứng dương tính): đỏ nếu token tự ký không được BE nhận (khi đó mọi case 401 vô nghĩa) hoặc refresh thật không dùng được ở /auth/refresh.
async function sec01(W) {
  const { E1, E2, EDEL, adm } = W;
  console.log("\n── SEC-01: JWT giả trên POST /jobs, GET /admin/employers, PUT /jobs/:id");
  const PE = payloadOf(E1.token), PA = payloadOf(adm.token);
  const kId = keyOf(PE, /nameidentifier$/), kRole = keyOf(PE, /\/role$|^role$/);
  if (!kId || !kRole || !PE.token_type || !PA[keyOf(PA, /\/role$|^role$/)]) throw new Error("token thật thiếu claim NameIdentifier/Role/token_type: test không dựng được token tự ký");
  const now = Math.floor(Date.now() / 1000);
  /** Token tự ký đúng key; o: { id, exp, iss, aud, type (undefined=giữ, null=xóa claim), role } */
  const forge = (role, o = {}, signOpt = {}) => {
    const p = { ...(role === "admin" ? PA : PE) };
    p[kId] = o.id ?? (role === "admin" ? adm.id : E1.id);
    p[kRole] = role;
    p.exp = o.exp ?? now + 900;
    if (o.iss !== undefined) p.iss = o.iss;
    if (o.aud !== undefined) p.aud = o.aud;
    if (o.type === null) delete p.token_type; else if (o.type !== undefined) p.token_type = o.type;
    return sign(p, signOpt);
  };

  // ── đối chứng dương tính: token tự ký hợp lệ -> 2xx ──
  const ctlBody = await jobBody({ jobTitle: `SEC ctl ${TS}` });
  const c1 = await call(forge("employer"), "POST", "/jobs", ctlBody);
  if (!ck("SEC-01-ctl", c1.status === 201 && typeof c1.data?.jobId === "string", `token employer tự ký hợp lệ phải tạo được Job: ${show(c1)}`)) throw new Error("token tự ký không được BE nhận: dừng SEC-01");
  const jobId = c1.data.jobId;
  const c2 = await call(forge("employer"), "PUT", `/jobs/${jobId}`, ctlBody);
  ck("SEC-01-ctl", c2.status === 200, `token employer tự ký hợp lệ phải sửa được Job: ${show(c2)}`);
  const c3 = await call(forge("admin"), "GET", "/admin/employers");
  ck("SEC-01-ctl", c3.status === 200 && Array.isArray(c3.data?.items), `token admin tự ký hợp lệ phải xem được danh sách: ${show(c3)}`);
  const c4 = await call(forge("employer"), "GET", "/admin/employers");
  ck("SEC-01-ctl", okAny(c4, [[403, "FORBIDDEN_ROLE"]]), `token employer tự ký trên endpoint admin phải 403 FORBIDDEN_ROLE (role được đọc từ token): ${show(c4)}`);
  // refresh token thật (cookie lúc login): dùng đúng ở /auth/refresh (đối chứng cho SEC-01-refresh: token hợp lệ, chỉ sai LOẠI)
  await paceAuth(2);
  const lg = await untilNotRateLimited(() => call(null, "POST", "/auth/login", { email: E1.email, password: TEMP_PWD, rememberMe: false }));
  const cookie = (lg.headers.getSetCookie?.() ?? []).find((s) => s.startsWith("refreshToken="));
  if (!cookie) throw new Error("login không trả cookie refreshToken");
  const refresh = cookie.split(";")[0].slice("refreshToken=".length);
  const rf = await untilNotRateLimited(() => call(null, "POST", "/auth/refresh", undefined, { headers: { Cookie: `refreshToken=${refresh}` } }));
  ck("SEC-01-ctl", rf.status === 200 && typeof rf.data?.accessToken === "string", `refresh token thật phải dùng được ở /auth/refresh: ${show(rf)}`);

  // ── 3 endpoint bị tấn công ──
  const BODY = await jobBody({ jobTitle: `SEC attack ${TS}`, description: "bị sửa bởi token giả" });
  const eps = [
    { n: "POST /jobs", role: "employer", send: (t) => call(t, "POST", "/jobs", BODY), deny: [[403, "EMPLOYER_PROFILE_NOT_FOUND"], [401, "UNAUTHENTICATED"]] },
    { n: "GET /admin/employers", role: "admin", send: (t) => call(t, "GET", "/admin/employers"), deny: [[403, "FORBIDDEN_ROLE"], [401, "UNAUTHENTICATED"]] },
    { n: "PUT /jobs/:id", role: "employer", send: (t) => call(t, "PUT", `/jobs/${jobId}`, BODY), deny: [[403, "EMPLOYER_PROFILE_NOT_FOUND"], [401, "UNAUTHENTICATED"]] },
  ];
  const scope = [E1.id, E2.id, EDEL.id, adm.id, GHOST];
  const before = snap(scope);
  const U401 = [[401, "UNAUTHENTICATED"]];
  // tokens(ep) -> [[nhãn, token]]; expectOf(ep) -> danh sách [status, code] chấp nhận
  async function attack(id, tokens, expectOf = () => U401) {
    for (const ep of eps)
      for (const [label, tok] of tokens(ep)) {
        const r = await ep.send(tok);
        ck(id, okAny(r, expectOf(ep)), `${ep.n} [${label}]: mong ${expectOf(ep).map((a) => a.join(" ")).join(" | ")}, được ${show(r)}`);
      }
    ck(id, snap(scope) === before, "DB (job/employerprofile/users của scope) bị đổi sau tấn công");
  }
  const both = ["admin", "employer"];

  await attack("SEC-01-none", () => both.map((r) => [`alg none ${r}`, forge(r, {}, { alg: "none" })]));
  await attack("SEC-01-nosig", (ep) => [["header HS256, chữ ký rỗng", forge(ep.role).split(".").slice(0, 2).join(".") + "."]]);
  // payload đổi (role -> admin / sub -> employer khác), giữ nguyên chữ ký của token E1 thật
  const [h, , s] = E1.token.split(".");
  const swap = (mut) => { const p = { ...PE }; mut(p); return `${h}.${b64(p)}.${s}`; };
  await attack("SEC-01-tamper", () => [
    ["đổi role thành admin, giữ chữ ký cũ", swap((p) => { p[kRole] = "admin"; })],
    ["đổi NameIdentifier sang employer khác, giữ chữ ký cũ", swap((p) => { p[kId] = E2.id; })],
    ["kéo dài exp, giữ chữ ký cũ", swap((p) => { p.exp = now + 86400 * 365; })],
  ]);
  await attack("SEC-01-key", (ep) => [["ký bằng key sai", forge(ep.role, {}, { key: crypto.randomBytes(32).toString("hex") })]]);
  // ClockSkew mặc định 5 phút: exp quá khứ phải lùi xa hơn 5 phút
  await attack("SEC-01-exp", (ep) => [["exp = -10 phút", forge(ep.role, { exp: now - 600 })], ["exp = -1 ngày", forge(ep.role, { exp: now - 86400 })]]);
  await attack("SEC-01-refresh", (ep) => [
    ["refresh token thật (cookie login) làm Bearer", refresh],
    ["tự ký: token_type=refresh + đủ role", forge(ep.role, { type: "refresh" })],
  ]);
  await attack("SEC-01-notype", (ep) => [["tự ký, thiếu claim token_type", forge(ep.role, { type: null })]]);
  await attack("SEC-01-iss", (ep) => [["iss sai", forge(ep.role, { iss: `${ISS}-evil` })]]);
  await attack("SEC-01-aud", (ep) => [["aud sai", forge(ep.role, { aud: `${AUD}-evil` })]]);
  // ký đúng nhưng user không tồn tại / đã xóa: không 2xx, không 500 (token stateless -> DB quyết định ở policy)
  await attack("SEC-01-ghost", (ep) => [["NameIdentifier chưa từng tồn tại, role employer", forge("employer", { id: GHOST })]], (ep) => ep.deny);
  await attack("SEC-01-deleted", () => [["token thật của employer đã bị xóa khỏi DB", EDEL.token]], (ep) => ep.deny);
}

// ══ SEC-02: injection ═════════════════════════════════════════
// Đỏ khi: nối chuỗi SQL thay vì tham số (500 / kết quả lệch / mất bảng) | LIKE không escape % _ \ (kiểm khớp + đối chứng 50% / a_b / p\q)
// | bỏ giới hạn 255 ký tự keyword (SEC-02-len) | id path đi vào truy vấn dạng chuỗi nối (500).
async function sec02(W) {
  const { E1, E2, adm } = W;
  console.log("\n── SEC-02: injection keyword / path id");
  const C1 = `SEC ${TS} 50% ${TS}a_b Co`, C2 = `SEC ${TS} 50X ${TS}aXb Co`;
  sql(`UPDATE employerprofile SET companyName='${C1}' WHERE userId='${E1.id}'`);
  sql(`UPDATE employerprofile SET companyName='${C2}' WHERE userId='${E2.id}'`);
  const t1 = `SEC ${TS} 50% ${TS}a_b`, t3 = `SEC ${TS} ${TS}p\\q`, t2 = `SEC ${TS} 50X ${TS}aXb ${TS}pXq`;
  const j1 = await postJob(E1, { jobTitle: t1 }), j3 = await postJob(E1, { jobTitle: t3 }), j2 = await postJob(E2, { jobTitle: t2 });
  if (![j1, j2, j3].every((r) => r.status === 201)) { ck("SEC-02-wild", false, `tạo Job đối chứng lỗi: ${[j1, j2, j3].map(show)}`); return; }
  const scope = [E1.id, E2.id];
  const before = snap(scope);
  const tableOk = () => sqlInt("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('job','employerprofile','users')") === 3;
  const q = (kw) => `keyword=${encodeURIComponent(kw)}`;

  // ký tự đại diện: chỉ khớp chuỗi chứa đúng ký tự đó (E2 "50X"/"aXb" mà khớp tức là % _ bị coi là wildcard)
  const jobs = (r) => (Array.isArray(r.data?.items) ? r.data.items : []);
  for (const kw of [`${TS} 50%`, `${TS}a_b`]) {
    const r = await getRetry(null, `/jobs?${q(kw)}`);
    const items = jobs(r);
    ck("SEC-02-wild", r.status === 200 && items.length >= 1 && items.every((i) => i.companyName === C1), `GET /jobs keyword="${kw}": mong ≥1 Job chỉ của ${C1}, được ${show(r)} companies=${[...new Set(items.map((i) => i.companyName))]}`);
    const a = await call(adm, "GET", `/admin/employers?${q(kw)}`);
    const rows = Array.isArray(a.data?.items) ? a.data.items : [];
    ck("SEC-02-wild", a.status === 200 && rows.length === 1 && rows[0].companyName === C1, `GET /admin/employers keyword="${kw}": mong đúng 1 công ty ${C1}, được ${show(a)} n=${rows.length}`);
  }
  const rb = await getRetry(null, `/jobs?${q(`${TS}p\\q`)}`);
  ck("SEC-02-wild", rb.status === 200 && jobs(rb).length === 1 && jobs(rb)[0].jobId === j3.data.jobId, `GET /jobs keyword="${TS}p\\q" (backslash): mong đúng Job ${j3.data.jobId}, được ${show(rb)} n=${jobs(rb).length}`);

  // payload: 200 hoặc 400, không 500; ký tự dấu câu thì mọi kết quả phải CHỨA chuỗi đó nguyên văn
  const VN = "Đà".repeat(200).slice(0, 255);
  const PAY = [
    ["' OR 1=1 --", true], ["%", true], ["_", true], ["\\", true], ["\\\\", true], ['"; DROP TABLE job; --', true],
    [VN, false], ["a".repeat(255), false],["a\u0000b", false],
  ];
  for (const [kw, literal] of PAY) {
    const label = kw === VN ? "255 ký tự tiếng Việt" : kw.length === 255 ? "255 ký tự a" : JSON.stringify(kw);
    // đúng 255 ký tự (kể cả tiếng Việt, 510 byte UTF-8) phải 200, đối xứng với 256 -> 400 (nếu đếm byte thì 400 -> đỏ)
    const alts = kw.length === 255 ? [[200]] : [[200], [400, "VALIDATION_ERROR"]];
    const r = await getRetry(null, `/jobs?${q(kw)}`);
    const a = await call(adm, "GET", `/admin/employers?${q(kw)}`);
    for (const [ep, x, list] of [["GET /jobs", r, jobs(r)], ["GET /admin/employers", a, Array.isArray(a.data?.items) ? a.data.items : []]]) {
      ck("SEC-02-inj", okAny(x, alts), `${ep} keyword=${label}: mong ${alts.map((a) => a.join(" ")).join(" | ")}, được ${show(x)}`);
      if (x.status === 200 && literal) {
        const bad = list.filter((i) => !`${i.jobTitle ?? ""}|${i.companyName ?? ""}|${i.email ?? ""}`.toLowerCase().includes(kw.trim().toLowerCase()));
        ck("SEC-02-inj", bad.length === 0, `${ep} keyword=${label}: ${bad.length}/${list.length} kết quả không chứa chuỗi này (LIKE/SQL bị hiểu như cú pháp)`);
      }
    }
    ck("SEC-02-inj", tableOk(), `sau keyword=${label}: bảng job/employerprofile/users mất`);
  }
  // 256 ký tự: vượt giới hạn -> 400 VALIDATION_ERROR (cả hai endpoint)
  const long = "a".repeat(256);
  const lj = await getRetry(null, `/jobs?${q(long)}`), la = await call(adm, "GET", `/admin/employers?${q(long)}`);
  ck("SEC-02-len", okAny(lj, [[400, "VALIDATION_ERROR"]]) && okAny(la, [[400, "VALIDATION_ERROR"]]), `keyword 256 ký tự phải 400 VALIDATION_ERROR: jobs=${show(lj)} admin=${show(la)}`);

  // path id
  const enc = encodeURIComponent("' OR 1=1");
  const NF = [[404, "JOB_NOT_FOUND"]];
  const ids = [
    ["' OR 1=1", `/jobs/${enc}`, NF],
    ["..%2F..%2Fadmin", "/jobs/..%2F..%2Fadmin", NF],
    ["id 2000 ký tự", `/jobs/${"a".repeat(2000)}`, NF], // trong giới hạn Kestrel: phải tới app và trả 404 JOB_NOT_FOUND
    // 10 000 ký tự vượt giới hạn dòng request của Kestrel (8 KB) -> 414/400 từ server (không có body JSON), không tới được app
    ["id 10 000 ký tự", `/jobs/${"a".repeat(10000)}`, [[414], [400], [404, "JOB_NOT_FOUND"]]],
  ];
  for (const [label, p, alts] of ids) {
    const r = await call(null, "GET", p);
    ck("SEC-02-path", okAny(r, alts), `GET /jobs/${label}: mong ${alts.map((a) => a.join(" ")).join(" | ")}, được ${show(r)}`);
  }
  const em = await call(E1, "GET", `/employer/jobs/${enc}`);
  ck("SEC-02-path", okAny(em, [[404, "JOB_NOT_FOUND"], [400]]), `GET /employer/jobs/' OR 1=1: ${show(em)}`);
  const pj = await call(E1, "PUT", `/jobs/${enc}`, await jobBody());
  ck("SEC-02-path", okAny(pj, [[404, "JOB_NOT_FOUND"], [400]]), `PUT /jobs/' OR 1=1: ${show(pj)}`);
  const pv = await adminVerify(adm, enc, { companyName: "x", taxCode: "0000000000" });
  ck("SEC-02-path", okAny(pv, [[404, "EMPLOYER_NOT_FOUND"], [400]]), `PATCH /admin/employers/' OR 1=1/verify: ${show(pv)}`);
  ck("SEC-02-path", tableOk() && snap(scope) === before, "sau các request path độc: bảng mất hoặc DB của scope đổi");
}

// ══ SEC-03: payload xấu ═══════════════════════════════════════
// Đỏ khi: body lớn / JSON lồng sâu / kiểu sai làm BE trả 500 hoặc tạo Job (bỏ giới hạn độ dài, bỏ bắt JsonException) | Idempotency-Key không kiểm UUID
// | BE chết / treo sau payload (SEC-03-alive).
async function sec03(W) {
  const { E1 } = W;
  console.log("\n── SEC-03: payload xấu (body 5 MB, JSON lồng 10 000 tầng, kiểu sai, Idempotency-Key lạ)");
  const BODY = await jobBody({ jobTitle: `SEC payload ${TS}` });
  const scope = [E1.id];
  const before = snap(scope);
  const JSON_H = { "Content-Type": "application/json" };
  const alive = async (ctx) => {
    const r = await call(null, "GET", "/jobs/options");
    ck("SEC-03-alive", r.status === 200 && Array.isArray(r.data?.categories), `BE không trả lời GET /jobs/options sau "${ctx}": ${show(r)}`);
  };
  // errKey: 400 phải do đúng field này (tránh BODY hỏng làm case xanh vì lý do khác)
  const bad = async (label, rawBody, headers = JSON_H, alts = [[400, "VALIDATION_ERROR"], [413]], errKey = null) => {
    const r = await call(E1, "POST", "/jobs", undefined, { rawBody, headers });
    ck("SEC-03", okAny(r, alts), `${label}: mong ${alts.map((a) => a.join(" ")).join(" | ")}, được ${show(r)}`);
    if (errKey) ck("SEC-03", Array.isArray(r.data?.errors?.[errKey]), `${label}: errors phải có key ${errKey}, được ${JSON.stringify(r.data?.errors)?.slice(0, 120)}`);
    await alive(label);
    return r;
  };
  const MB5 = 5 * 1024 * 1024;
  await bad("body 5 MB (description dài)", JSON.stringify({ ...BODY, description: "x".repeat(MB5) }));
  await bad("body 5 MB không phải JSON", "A".repeat(MB5));
  await bad("JSON lồng 10 000 tầng trong field", `{"jobTitle":${'{"a":'.repeat(10000)}1${"}".repeat(10000)}}`);
  await bad("JSON mảng lồng 10 000 tầng", "[".repeat(10000) + "]".repeat(10000));
  const withRaw = (field, rawValue) => JSON.stringify({ ...BODY, [field]: "__RAW__" }).replace('"__RAW__"', rawValue);
  for (const [label, body] of [
    ['salaryMin: "1e309" (chuỗi)', withRaw("salaryMin", '"1e309"')],
    ["salaryMin: 1e309 (số tràn decimal)", withRaw("salaryMin", "1e309")],
    ["salaryMax: -1e308", withRaw("salaryMax", "-1e308")],
    ['salaryMin: ["1"] (mảng thay số)', withRaw("salaryMin", '["1"]')],
    ['jobTitle: ["a","b"] (mảng thay chuỗi)', withRaw("jobTitle", '["a","b"]')],
    ['jobTitle: {"a":1} (object thay chuỗi)', withRaw("jobTitle", '{"a":1}')],
    ["numberOfPosition: 1e10", withRaw("numberOfPosition", "1e10")],
    ['yearOfExperience: "abc"', withRaw("yearOfExperience", '"abc"')],
    ["deadline: 20261231 (số thay ngày)", withRaw("deadline", "20261231")],
    ['deadline: "9999-99-99"', withRaw("deadline", '"9999-99-99"')],
    ["salaryMin: true", withRaw("salaryMin", "true")],
  ]) await bad(label, body);

  // Idempotency-Key (qua fetch: không CR/LF thật; literal "\r\n" là 4 ký tự văn bản)
  const uuid = crypto.randomUUID();
  for (const [label, key] of [
    ["10 000 ký tự", "1".repeat(10000)],
    ["UUID + 10 000 ký tự", uuid + "1".repeat(10000)],
    ["chứa literal \\r\\n", `${uuid}\\r\\nX-Injected: 1`],
    ["chứa %0d%0a", `${uuid}%0d%0aX-Injected: 1`],
    ["không phải UUID", "abc"],
    ["rỗng", ""],
  ]) await bad(`Idempotency-Key ${label}`, JSON.stringify(BODY), { ...JSON_H, "Idempotency-Key": key }, [[400, "VALIDATION_ERROR"]], "idempotencyKey");
  const noKey = await call(E1, "POST", "/jobs", BODY, { noIdem: true });
  ck("SEC-03", okAny(noKey, [[400, "VALIDATION_ERROR"]]) && Array.isArray(noKey.data?.errors?.idempotencyKey), `thiếu Idempotency-Key: mong 400 kèm errors.idempotencyKey, được ${show(noKey)}`);

  // CR/LF/NUL thật trong header (socket thô): Kestrel phải từ chối 400, không phản chiếu header lạ ở response
  const body = JSON.stringify(BODY);
  for (const [label, v] of [["CR đơn lẻ", `${uuid}\rX-Injected: 1`], ["obs-fold (CRLF + space)", `${uuid}\r\n X-Injected: 1`], ["NUL", `${uuid}\u0000x`]]) {
    const req = `POST ${new URL(BASE).pathname}/jobs HTTP/1.1\r\nHost: ${new URL(BASE).host}\r\nAuthorization: Bearer ${E1.token}\r\nContent-Type: application/json\r\nContent-Length: ${Buffer.byteLength(body)}\r\nConnection: close\r\nIdempotency-Key: ${v}\r\n\r\n${body}`;
    const r = await rawHttp(req);
    ck("SEC-03", r.status === 400 && !/\r\nX-Injected:/i.test(r.text), `header Idempotency-Key có ${label}: mong 400 và không phản chiếu header, được status=${r.status}`);
    await alive(`raw header ${label}`);
  }
  ck("SEC-03", snap(scope) === before, "DB của E1 (job/profile/users) bị đổi sau các payload xấu");
}

// ══ SEC-04: mass assignment ═══════════════════════════════════
// Đỏ khi: DTO/controller bind thêm IsVerified/UnverifyReason/UserId/Logo từ body (SEC-04-put) | verify/unverify đọc isVerified / userId / closedJobCount từ body (SEC-04-admin)
// | POST /jobs nhận employerId/status/jobId/createdAt từ body (SEC-04-job).
async function sec04(W) {
  const { E1, E3, adm } = W;
  console.log("\n── SEC-04: mass assignment qua PUT /employer/me, admin verify/unverify, POST /jobs");
  const [name0, tax] = sql(`SELECT CONCAT(companyName,'|',taxCode) FROM employerprofile WHERE userId='${E3.id}'`).split("|");
  const prof = { companyName: name0, address: "9 Đường Tấn Công, Quận 1, TP HCM", field: "IT", phone: "0901234567", taxCode: tax, description: "mass assignment", website: "https://example.com", foundedYear: 2015 };
  const EXTRA = { isVerified: true, IsVerified: true, unverifyReason: null, userId: E1.id, UserId: E1.id, logo: "https://evil.example/x.png", role: "admin", user: { role: "admin" }, jobs: [] };
  const row = (id) => sql(`SELECT CONCAT(isVerified+0,'|',IFNULL(unverifyReason,'<NULL>'),'|',IFNULL(logo,'<NULL>'),'|',userId,'|',companyName,'|',taxCode) FROM employerprofile WHERE userId='${id}'`);
  const e1Before = snap([E1.id]);

  // nhánh INSERT (hồ sơ chưa có): hồ sơ mới phải chưa verify, thuộc về chính E3, không có logo
  sql(`DELETE FROM employerprofile WHERE userId='${E3.id}'`);
  const p1 = await call(E3, "PUT", "/employer/me", { ...prof, ...EXTRA });
  ck("SEC-04-put", p1.status === 200 && !/passwordhash|refreshtoken|accesstoken/i.test(p1.text), `PUT tạo mới kèm field lạ: mong 200 không lộ secret, được ${show(p1)}`);
  ck("SEC-04-put", row(E3.id) === `0|<NULL>|<NULL>|${E3.id}|${name0}|${tax}`, `INSERT: isVerified/unverifyReason/logo/userId bị body ghi đè: ${row(E3.id)}`);
  ck("SEC-04-put", sqlInt(`SELECT COUNT(*) FROM employerprofile WHERE companyName='${name0}'`) === 1, "INSERT: có hồ sơ thừa");
  // nhánh UPDATE: có lý do thu hồi cũ; body gửi isVerified:true, unverifyReason:null, userId của E1
  const reason = "SEC4 lý do cũ";
  sql(`UPDATE employerprofile SET unverifyReason='${reason}' WHERE userId='${E3.id}'`);
  const p2 = await call(E3, "PUT", "/employer/me", { ...prof, description: "sửa lần 2", ...EXTRA });
  ck("SEC-04-put", p2.status === 200, `PUT sửa kèm field lạ: ${show(p2)}`);
  ck("SEC-04-put", row(E3.id) === `0|${reason}|<NULL>|${E3.id}|${name0}|${tax}`, `UPDATE: isVerified/unverifyReason/logo/userId bị body ghi đè: ${row(E3.id)}`);
  ck("SEC-04-put", snap([E1.id]) === e1Before, "PUT của E3 kèm userId của E1 làm đổi dữ liệu của E1");

  // admin verify: body kèm isVerified:false và field lạ -> vẫn verify, bỏ qua field lạ
  const v = await adminVerify(adm, E3.id, { ...verifyView(E3.id), isVerified: false, role: "admin", userId: E1.id, unverifyReason: "x", foo: { bar: 1 } });
  ck("SEC-04-admin", v.status === 200 && v.data?.message === "Đã xác minh công ty", `verify kèm isVerified:false: mong 200 "Đã xác minh công ty", được ${show(v)}`);
  ck("SEC-04-admin", row(E3.id) === `1|<NULL>|<NULL>|${E3.id}|${name0}|${tax}`, `sau verify: mong isVerified=1, unverifyReason NULL, tên/MST/userId giữ nguyên: ${row(E3.id)}`);
  ck("SEC-04-admin", snap([E1.id]) === e1Before, "verify kèm userId của E1 làm đổi dữ liệu của E1");

  // POST /jobs kèm employerId/status/jobId/createdAt (E3 đã verified)
  const forgedId = "00000000-0000-4000-8000-000000000000";
  const pj = await postJob(E3, { jobTitle: `SEC4 job ${TS}`, employerId: E1.id, EmployerId: E1.id, status: "Closed", jobId: forgedId, createdAt: "2000-01-01T00:00:00Z" });
  ck("SEC-04-job", pj.status === 201 && pj.data?.jobId !== forgedId, `POST /jobs kèm field hệ thống: mong 201 và jobId do BE sinh, được ${show(pj)}`);
  const jr = sql(`SELECT CONCAT(employerId,'|',status,'|',YEAR(createdAt)) FROM job WHERE jobId='${pj.data?.jobId}'`);
  ck("SEC-04-job", jr.startsWith(`${E3.id}|Open|`) && Number(jr.split("|")[2]) >= 2026, `Job tạo ra: mong employerId=E3, Open, createdAt hiện tại; được ${jr}`);
  ck("SEC-04-job", sqlInt(`SELECT COUNT(*) FROM job WHERE jobId='${forgedId}'`) === 0, "có Job mang jobId do client gửi");
  ck("SEC-04-job", snap([E1.id]) === e1Before, "POST /jobs của E3 kèm employerId của E1 làm đổi dữ liệu của E1");

  // admin unverify: body kèm isVerified:true, closedJobCount:99, userId của E1
  const u = await adminUnverify(adm, E3.id, { reason: "SEC4 thu hồi", isVerified: true, closedJobCount: 99, userId: E1.id });
  ck("SEC-04-admin", u.status === 200 && u.data?.closedJobCount === 1, `unverify kèm closedJobCount:99: mong 200 và closedJobCount=1 (số Job thật), được ${show(u)} closed=${u.data?.closedJobCount}`);
  ck("SEC-04-admin", row(E3.id) === `0|SEC4 thu hồi|<NULL>|${E3.id}|${name0}|${tax}`, `sau unverify: mong isVerified=0, reason từ body.reason: ${row(E3.id)}`);
  ck("SEC-04-admin", sqlInt(`SELECT COUNT(*) FROM job WHERE employerId='${E3.id}' AND status='Open'`) === 0, "unverify: E3 còn Job Open");
  ck("SEC-04-admin", snap([E1.id]) === e1Before, "unverify kèm userId của E1 làm đổi dữ liệu của E1 (verified / Job Open phải còn nguyên)");
}

export default async function run() {
  console.log(`BASE = ${BASE}`);
  if (!KEY || !ISS || !AUD) throw new Error("appsettings.json thiếu JWT:Key/Issuer/Audience");
  // E1, E2, EDEL đã xác minh; E3 chưa (dùng cho SEC-04)
  const { employers: [E1, E2, EDEL, E3] } = await makeCrowd({ employers: 4, verified: 3 });
  const adm = await makeTempAdmin("SEC");
  // EDEL: token vẫn hợp lệ 15 phút nhưng user + hồ sơ đã bị xóa khỏi DB
  sql(`DELETE FROM refreshToken WHERE userId='${EDEL.id}'`);
  sql(`DELETE FROM employerprofile WHERE userId='${EDEL.id}'`);
  sql(`DELETE FROM users WHERE userId='${EDEL.id}'`);
  const W = { E1, E2, EDEL, E3, adm };
  await sec01(W);
  await sec02(W);
  await sec03(W);
  await sec04(W);
  console.log(`   429 của job_search (hợp lệ, đã chờ + thử lại): ${n429}`);
}

if (isMain(import.meta.url)) await runAttackSuites([{ name, run }]);
