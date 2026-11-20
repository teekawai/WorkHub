/**
 * Thư viện dùng chung cho bộ attack-test (Bước 7): tải + IDOR, tấn công transaction, bảo mật, mutation.
 * Dùng lại helper của job-test/admin-test (không chép lại); phần riêng: BASE, sổ cái request, đám đông user `atk_<TS>_<n>`,
 * bộ kiểm bất biến DB (checkInvariants) và dọn dẹp.
 *
 * - BASE: --base=<url> (mặc định http://localhost:5165/api). Mọi request của attack-test (call/makeCrowd/postJob) đi qua BASE.
 *   Không re-export raw/J/makeUser/makeEmployer (job-test) và makeTempAdmin/adminVerify/adminUnverify (admin-test): chúng gọi cứng 5165, tạo user ngoài sổ cái / ngoài cleanAttack.
 *   Bản qua BASE nằm trong lib này: makeCrowd, makeTempAdmin, adminVerify, adminUnverify, postJob, call.
 * - validJob/mkJob của job-test KHÔNG dùng lại được: chúng phụ thuộc biến OPT chỉ được gán trong setup() của job-test. Thay bằng jobBody/postJob.
 * - Rate limit "auth" 100/phút/IP: makeCrowd dùng paceAuth của admin-test (call() ghi request auth vào `recorded` để paceAuth đếm).
 */
import crypto from "node:crypto";
import {
  TEMP_PWD, TS, TODAY, addDays, ck as baseCk, isMain, paceAuth, recorded, redisCmd, sleep, sql, sqlCol, sqlInt, untilNotRateLimited, uid, verifyView,
} from "../admin-test/lib.mjs";

export { TS, TODAY, addDays, isMain, paceAuth, redisCmd, sleep, sql, sqlCol, sqlInt, uid };
export { verifyView }; // chỉ SQL, không gọi HTTP

// ─── BASE ──────────────────────────────────────────────────────
export const BASE = ((process.argv.find((a) => a.startsWith("--base=")) || "").slice(7) || "http://localhost:5165/api").replace(/\/+$/, "");
const PWD = "Test1234!";
const PREFIX = `atk_${TS}_`;
const GHOST = `${PREFIX}ghost`; // employerId / userId giả mà self-test bơm vào, cleanAttack dọn theo tên này
let dirty = false; // đã tạo dữ liệu cần dọn

// ─── Kết quả (bọc ck của job-test để có bảng tổng riêng, không cần setup của job-test) ───
const results = new Map();
export function ck(id, ok, detail = "") {
  const r = results.get(id) || results.set(id, { pass: 0, fail: 0 }).get(id);
  ok ? r.pass++ : r.fail++;
  return baseCk(id, ok, detail);
}

// ─── Sổ cái request + call ─────────────────────────────────────
/** Mọi request qua call(): { who, uid?, method, path, status, code, message, jobId?, t0, t1 } */
export const ledger = [];
const JOB_ID_IN_PATH = /\/jobs\/([0-9a-fA-F-]{36})(?:[/?]|$)/;
const isAuthPath = (p) => p.startsWith("/auth/") || p === "/admin/login";

/**
 * Gửi request tới BASE bằng token của user (object có .token, chuỗi token, hoặc null = ẩn danh) và ghi sổ cái.
 * Request tạo / xóa Job phải truyền OBJECT user (không phải chuỗi token): I8 lọc theo scope bằng user.id.
 * extra: { headers, rawBody, noIdem }. POST /jobs tự thêm Idempotency-Key mới trừ khi noIdem hoặc đã truyền sẵn.
 * Trả { status, data, headers, text, t0, t1 }; lỗi mạng: ghi status 0 rồi ném lại.
 */
export async function call(user, method, p, body, extra = {}) {
  const token = typeof user === "string" ? user : user?.token;
  const headers = { ...(extra.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (method === "POST" && p === "/jobs" && !extra.noIdem && !Object.keys(headers).some((k) => k.toLowerCase() === "idempotency-key"))
    headers["Idempotency-Key"] = crypto.randomUUID();
  const opts = { method, headers };
  if (extra.rawBody !== undefined) opts.body = extra.rawBody;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }

  const entry = { who: user?.name ?? (token ? "token" : "anon"), uid: user?.id, method, path: p, status: 0, code: null, message: null, t0: Date.now(), t1: 0 };
  ledger.push(entry);
  if (isAuthPath(p)) recorded.push({ method, path: p, tSent: entry.t0 }); // cho paceAuth đếm
  try {
    const res = await fetch(`${BASE}${p}`, opts);
    const text = await res.text().catch(() => "");
    let data = null;
    if ((res.headers.get("content-type") || "").includes("json")) { try { data = JSON.parse(text); } catch { data = null; } } else data = text;
    entry.t1 = Date.now();
    entry.status = res.status;
    entry.code = data?.code ?? null;
    entry.message = data?.message ?? null;
    entry.jobId = (typeof data?.jobId === "string" && data.jobId) || JOB_ID_IN_PATH.exec(p)?.[1];
    return { status: res.status, data, headers: res.headers, text, t0: entry.t0, t1: entry.t1 };
  } catch (e) {
    entry.t1 = Date.now();
    entry.code = "NETWORK";
    throw e;
  }
}

// ─── Đám đông ──────────────────────────────────────────────────
let seq = 0;
let taxSeq = 0;
function userIdOf(token) {
  const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  const k = Object.keys(p).find((x) => /nameidentifier$/.test(x));
  return (k && p[k]) || p.nameid || p.sub;
}
async function makeAtkUser(role) {
  const name = `${PREFIX}${++seq}`;
  const email = `${name}@test.com`;
  dirty = true; // đánh dấu trước khi gọi API để dọn được cả khi lỗi giữa chừng
  await paceAuth(2);
  const reg = await untilNotRateLimited(() => call(null, "POST", "/auth/register", { username: name, email, password: PWD, role }));
  const login = await untilNotRateLimited(() => call(null, "POST", "/auth/login", { email, password: PWD, rememberMe: false }));
  if (!login.data?.accessToken) throw new Error(`login ${name} lỗi: reg=${reg.status} login=${login.status} ${JSON.stringify(login.data)?.slice(0, 200)}`);
  return { name, email, role, token: login.data.accessToken, id: userIdOf(login.data.accessToken) };
}
async function makeAtkProfile(u) {
  const n = ++taxSeq;
  const r = await call(u, "PUT", "/employer/me", {
    companyName: `Atk ${TS} ${n}`,
    address: `${n} Đường Tấn Công, Quận 1, TP HCM`,
    field: "IT",
    phone: "0901234567",
    taxCode: `${String(TS).slice(-8)}${String(n).padStart(5, "0")}`, // 13 chữ số, khác dạng 10 số của job-test
    description: "Công ty attack-test",
    website: "https://example.com",
    foundedYear: 2015,
  });
  if (r.status !== 200) throw new Error(`profile ${u.name}: ${r.status} ${JSON.stringify(r.data)?.slice(0, 200)}`);
}

/**
 * Tạo `employers` employer (có profile) và `finders` finder, tên atk_<TS>_<n>, giãn nhịp auth.
 * verified: số employer ĐẦU TIÊN được xác minh (SQL); true = tất cả, false = không ai. Mặc định = tất cả.
 */
export async function makeCrowd({ employers = 0, verified = employers, finders = 0 } = {}) {
  await loadOptions();
  const nv = verified === true ? employers : verified === false ? 0 : verified;
  const out = { employers: [], finders: [] };
  for (let i = 0; i < employers; i++) {
    const u = await makeAtkUser("employer");
    await makeAtkProfile(u);
    if (i < nv) sql(`UPDATE employerprofile SET isVerified=1 WHERE userId='${u.id}'`);
    out.employers.push(u);
  }
  for (let i = 0; i < finders; i++) out.finders.push(await makeAtkUser("finder"));
  return out;
}

// ─── Admin (qua BASE) ──────────────────────────────────────────
const ADMIN_PREFIX = `qa_admin_${TS}_`;
/** Admin tạm: user atk đăng ký qua BASE, SQL đổi role=admin + username qa_admin_<TS>_<name>, đăng nhập /admin/login qua BASE */
export async function makeTempAdmin(name) {
  const u = await makeAtkUser("finder");
  const username = `${ADMIN_PREFIX}${name}`;
  sql(`UPDATE users SET role='admin', username='${username}' WHERE userId='${u.id}'`);
  await paceAuth(1);
  const login = await untilNotRateLimited(() => call(null, "POST", "/admin/login", { email: u.email, password: TEMP_PWD, rememberMe: false }));
  if (!login.data?.accessToken) throw new Error(`admin login ${name} lỗi: ${login.status} ${JSON.stringify(login.data)?.slice(0, 200)}`);
  return { ...u, name: username, username, role: "admin", token: login.data.accessToken };
}
/** Body mặc định = tên + MST hiện có trong DB của employer (như admin đang xem) */
export const adminVerify = (adm, userId, body = verifyView(userId)) => call(adm, "PATCH", `/admin/employers/${userId}/verify`, body);
export const adminUnverify = (adm, userId, body) => call(adm, "PATCH", `/admin/employers/${userId}/unverify`, body);
/** Xóa admin tạm của RUN NÀY (qa_admin_<TS>_*) + refresh token; không đụng admin thật / của run khác */
export function cleanTempAdmins() {
  const w = `role='admin' AND LEFT(username,${ADMIN_PREFIX.length})='${ADMIN_PREFIX}'`;
  sql(`DELETE FROM refreshToken WHERE userId IN (SELECT userId FROM (SELECT userId FROM users WHERE ${w}) t)`);
  sql(`DELETE FROM users WHERE ${w}`);
}

// ─── Job ───────────────────────────────────────────────────────
let OPT = null;
async function loadOptions() {
  if (!OPT) {
    const r = await call(null, "GET", "/jobs/options");
    if (!r.data?.categories) throw new Error(`/jobs/options lỗi: ${r.status}`);
    OPT = r.data;
  }
  return OPT;
}
/** Body Job hợp lệ (options lấy qua BASE); o ghi đè từng trường */
export async function jobBody(o = {}) {
  const opt = await loadOptions();
  return {
    jobTitle: `Atk Job ${TS}`,
    category: opt.categories[0].name,
    subCategory: opt.categories[0].subCategories[0],
    location: opt.locations[0],
    workType: opt.workTypes[0],
    skillRequired: "C#, SQL",
    description: "Mô tả công việc",
    requirement: "Yêu cầu ứng viên",
    applicantBenefit: "Quyền lợi ứng viên",
    salaryType: "Range",
    salaryMin: 10000000,
    salaryMax: 20000000,
    yearOfExperience: 2,
    numberOfPosition: 3,
    deadline: addDays(TODAY, 30),
    ...o,
  };
}
/** POST /jobs (có Idempotency-Key mới) -> response nguyên vẹn, không ném khi != 201 */
export async function postJob(user, o = {}, extra = {}) {
  return call(user, "POST", "/jobs", await jobBody(o), extra);
}

// ─── Bộ kiểm bất biến ──────────────────────────────────────────
const IDENT = /^\w+$/;
/** Các giá trị của cột `col` xuất hiện > 1 lần trong `table` (so khớp theo collation của cột); where tùy chọn */
export function findDuplicates(table, col, where = "1=1") {
  if (!IDENT.test(table) || !IDENT.test(col)) throw new Error("tên bảng/cột không hợp lệ");
  return sqlCol(`SELECT ${col} FROM ${table} WHERE ${where} GROUP BY ${col} HAVING COUNT(*)>1`);
}

/**
 * Kiểm bất biến DB + sổ cái, giới hạn theo employer trong scope (dữ liệu pm_*, job-test sẵn có không làm đỏ). Rỗng = sạch.
 * Mỗi dòng vi phạm bắt đầu bằng mã: "I1: ...".
 *  I1 không có Job Open của employer chưa xác minh | I2 job.employerId có employerprofile | I3 status ∈ {Open, Closed}
 *  I4 companyName / taxCode không trùng (TOÀN BẢNG: unique index nên luôn sạch, rẻ) | I5 isVerified=1 ⇒ unverifyReason NULL
 *  I6 sổ cái không có 500, mọi 4xx có code + message chuỗi | I8 số Job của scope trong DB = số jobId khác nhau trong 201 trừ DELETE 200
 * CHỈ gọi sau khi mọi request đã await xong (request đang bay làm DB và sổ cái lệch nhau tạm thời -> I8 đỏ giả).
 * Entry sổ cái có `uid` ngoài scope bị bỏ qua ở I8; entry không có uid (vd bản ghi giả) vẫn được tính.
 */
export function checkInvariants(scopeEmployerIds) {
  for (const id of scopeEmployerIds) if (!/^[\w-]+$/.test(id)) throw new Error(`employerId không hợp lệ: ${id}`);
  const inScope = scopeEmployerIds.length ? scopeEmployerIds.map((i) => `'${i}'`).join(",") : "''";
  const v = [];
  for (const r of sqlCol(`SELECT j.jobId FROM job j JOIN employerprofile e ON e.userId=j.employerId WHERE j.employerId IN (${inScope}) AND j.status='Open' AND e.isVerified=0`))
    v.push(`I1: job Open ${r} thuộc employer chưa xác minh`);
  for (const r of sqlCol(`SELECT j.jobId FROM job j LEFT JOIN employerprofile e ON e.userId=j.employerId WHERE j.employerId IN (${inScope}) AND e.userId IS NULL`))
    v.push(`I2: job ${r} có employerId không có employerprofile`);
  for (const r of sqlCol(`SELECT CONCAT(jobId,' status=',status) FROM job WHERE employerId IN (${inScope}) AND status COLLATE utf8mb4_bin NOT IN ('Open','Closed')`))
    v.push(`I3: job ${r} có status ngoài Open/Closed`);
  for (const col of ["companyName", "taxCode"])
    for (const d of findDuplicates("employerprofile", col)) v.push(`I4: ${col} trùng: ${d}`);
  for (const r of sqlCol(`SELECT userId FROM employerprofile WHERE userId IN (${inScope}) AND isVerified=1 AND unverifyReason IS NOT NULL`))
    v.push(`I5: employer ${r} đã xác minh nhưng còn unverifyReason`);

  for (const e of ledger) {
    if (e.status === 500) v.push(`I6: 500 ở ${e.method} ${e.path} (${e.who})`);
    else if (e.status >= 400 && e.status < 500 && !(typeof e.code === "string" && e.code && typeof e.message === "string" && e.message))
      v.push(`I6: ${e.status} thiếu code/message chuỗi ở ${e.method} ${e.path} (${e.who})`);
  }

  const inScopeEntry = (e) => e.uid === undefined || scopeEmployerIds.includes(e.uid);
  const created = new Set(ledger.filter((e) => inScopeEntry(e) && e.method === "POST" && e.path === "/jobs" && e.status === 201 && e.jobId).map((e) => e.jobId));
  const deleted = new Set(ledger.filter((e) => inScopeEntry(e) && e.method === "DELETE" && /^\/jobs\/[^/?]+$/.test(e.path) && e.status === 200 && created.has(e.jobId)).map((e) => e.jobId));
  const expected = created.size - deleted.size;
  const actual = sqlInt(`SELECT COUNT(*) FROM job WHERE employerId IN (${inScope})`);
  if (actual !== expected) v.push(`I8: DB có ${actual} job của scope, sổ cái ghi ${created.size} tạo - ${deleted.size} xóa = ${expected}`);
  return v;
}

// ─── Dọn dẹp ───────────────────────────────────────────────────
const userIdsOfRun = () => sqlCol(`SELECT userId FROM users WHERE LEFT(username,${PREFIX.length})='${PREFIX}'`);
/** Phần SQL (đồng bộ, dùng được trong hook exit): job, refresh token, profile, user atk_<TS>_*, bảng nháp, admin tạm */
function cleanSql() {
  const l = [...userIdsOfRun(), GHOST].map((i) => `'${i}'`).join(",");
  sql(`DELETE FROM application WHERE finderId IN (${l}) OR jobId IN (SELECT jobId FROM job WHERE employerId IN (${l}))`);
  sql(`DELETE FROM job WHERE employerId IN (${l})`);
  sql(`DELETE FROM employerprofile WHERE userId IN (${l})`);
  sql(`DELETE FROM finderprofile WHERE userId IN (${l})`);
  sql(`DELETE FROM refreshToken WHERE userId IN (${l})`);
  sql(`DELETE FROM users WHERE userId IN (${l})`);
  sql(`DROP TABLE IF EXISTS ${PREFIX}dup`);
  cleanTempAdmins();
}
/** Xóa dữ liệu của run: key Redis idem:* của user atk_<TS>_*, rồi toàn bộ phần SQL + admin tạm. Chạy lại an toàn. */
export async function cleanAttack() {
  try {
    for (const id of userIdsOfRun()) {
      const ks = await redisCmd("KEYS", `idem:${id}:*`);
      if (ks.length) await redisCmd("DEL", ...ks);
    }
  } catch (e) { console.log("⚠️ Redis cleanup lỗi:", e.message); }
  cleanSql();
  dirty = false;
}
/** Số dòng còn sót của run (user atk_<TS>_*, job của họ, admin tạm) — phải 0 sau cleanAttack */
export function leftover() {
  const l = [...userIdsOfRun(), GHOST].map((i) => `'${i}'`).join(",");
  return sqlInt(`SELECT (SELECT COUNT(*) FROM users WHERE userId IN (${l})) + (SELECT COUNT(*) FROM job WHERE employerId IN (${l})) + (SELECT COUNT(*) FROM users WHERE role='admin' AND LEFT(username,${ADMIN_PREFIX.length})='${ADMIN_PREFIX}')`);
}

// Hook: thoát bình thường / lỗi -> dọn SQL; Ctrl-C -> dọn đủ (cả Redis) rồi thoát 130
process.on("exit", () => { if (dirty) { try { cleanSql(); } catch { /* DB không với tới được */ } } });
process.on("SIGINT", async () => {
  try { await cleanAttack(); } catch { /* bỏ qua */ }
  process.exit(130);
});

// ─── Chạy nhóm ─────────────────────────────────────────────────
function printSummary(crashed) {
  console.log("\n" + "═".repeat(70) + "\n  KẾT QUẢ THEO ID\n" + "═".repeat(70));
  let passIds = 0, failIds = 0, ap = 0, af = 0;
  for (const id of [...results.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
    const r = results.get(id);
    ap += r.pass; af += r.fail;
    r.fail === 0 ? passIds++ : failIds++;
    console.log(`${r.fail === 0 ? "✅" : "❌"} ${id.padEnd(10)} ${r.fail === 0 ? "PASS" : "FAIL"} (${r.pass}/${r.pass + r.fail})`);
  }
  console.log(`\nTổng: ${passIds} ID PASS, ${failIds} ID FAIL | assertion: ${ap} pass, ${af} fail${crashed ? " | CÓ NHÓM BỊ LỖI CHẠY" : ""}`);
  return failIds > 0 || crashed;
}

/** Chạy lần lượt các suite { name, run(ctx) } (suite lỗi không chặn suite sau), luôn dọn + kiểm sạch, in tổng, exit 0/1 */
export async function runAttackSuites(suites) {
  let crashed = false;
  const ctx = {};
  console.log(`BASE = ${BASE} | TS = ${TS}`);
  try {
    for (const s of suites) {
      console.log(`\n══════ ${s.name}`);
      try { await s.run(ctx); } catch (e) { crashed = true; ck("CRASH", false, `${s.name}: ${e.stack || e}`); }
    }
  } finally {
    try { await cleanAttack(); } catch (e) { crashed = true; console.log("\n⚠️ Cleanup lỗi:", e.message); }
  }
  let left = -1;
  try { left = leftover(); } catch (e) { console.log("⚠️ Không kiểm được dữ liệu sót:", e.message); }
  console.log(`\n🧹 Cleanup: còn lại ${left} dòng của run`);
  ck("CLEAN", left === 0, `còn ${left} dòng atk_${TS}_* / qa_admin_${TS}_*`);
  process.exit(printSummary(crashed) ? 1 : 0);
}
