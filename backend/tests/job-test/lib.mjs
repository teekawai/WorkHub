/**
 * Thư viện dùng chung cho API test module Job (chạy trên BE + MySQL + Redis thật).
 * Chạy: xem run.mjs. Mỗi file *.test.mjs export { name, run } và chạy riêng được: node backend/tests/job-test/<file>.test.mjs
 *
 * - Cần SQL trực tiếp (chưa có API verify employer / ứng tuyển): đọc connection string từ appsettings.json lúc chạy,
 *   mật khẩu truyền qua biến môi trường MYSQL_PWD, không hardcode. mysql.exe: biến MYSQL_EXE hoặc đường dẫn mặc định.
 * - Redis: gửi lệnh RESP thô (máy không có redis-cli).
 * - Dọn dữ liệu: mặc định CHỈ xóa dữ liệu do run này tạo (lọc theo userId của run). --keep để giữ lại.
 * - Cờ: --rounds=N (số vòng test song song, mặc định 25), --skip-id14, --be-log=<file log BE> (cho SQL-01), --keep.
 */
import { execFile, execFileSync, spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const API = ((process.argv.find((a) => a.startsWith("--base=")) || "").slice(7) || "http://localhost:5165/api").replace(/\/+$/, ""); // --base=<url> cho mutation Task 8 (BE cổng 5166)
const KEEP = process.argv.includes("--keep");
export const ROUNDS = parseInt((process.argv.find((a) => a.startsWith("--rounds=")) || "--rounds=25").split("=")[1], 10);
export const SKIP_ID14 = process.argv.includes("--skip-id14");
export const BE_LOG = (process.argv.find((x) => x.startsWith("--be-log=")) || "").split("=").slice(1).join("=");
export const TS = Date.now();
export const BACKEND_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ─── SQL helper (đọc connection string lúc chạy) ───────────────
const MYSQL = process.env.MYSQL_EXE || "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe";
const cfg = JSON.parse(fs.readFileSync(path.join(BACKEND_DIR, "appsettings.json"), "utf8").replace(/^\uFEFF/, ""));
const cs = Object.fromEntries(
  cfg.ConnectionStrings.DefaultConnection.split(";").filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i).trim().toLowerCase(), p.slice(i + 1)];
  })
);
export function sql(q) {
  return execFileSync(
    MYSQL,
    ["-h", cs.server, "-P", cs.port || "3306", "-u", cs.user, "--default-character-set=utf8mb4", "-N", "-B", cs.database, "-e", q],
    { env: { ...process.env, MYSQL_PWD: cs.password }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();
}
// bản không chặn event loop, dùng khi cần chạy SQL song song với request API (race)
export const sqlAsync = (q) => new Promise((resolve, reject) =>
  execFile(MYSQL, ["-h", cs.server, "-P", cs.port || "3306", "-u", cs.user, "--default-character-set=utf8mb4", "-N", "-B", cs.database, "-e", q],
    { env: { ...process.env, MYSQL_PWD: cs.password }, encoding: "utf8" }, (e, out, err) => (e ? reject(new Error(err || e.message)) : resolve(out.trim()))));
// mysql.exe trên Windows xuống dòng bằng \r\n
export const sqlRow = (q) => sql(q).split(/\r?\n/)[0].split("\t");
export const sqlCol = (q) => { const o = sql(q); return o === "" ? [] : o.split(/\r?\n/); };
export const sqlInt = (q) => parseInt(sql(q), 10);

// ─── Redis (RESP thô qua net, máy không có redis-cli) ──────────
const redisCs = String(cfg.Redis?.ConnectionString || "localhost:6379").split(",").map((x) => x.trim());
const [RHOST, RPORT] = (() => { const [h, p] = redisCs[0].split(":"); return [h || "localhost", parseInt(p || "6379", 10)]; })();
const RPASS = (redisCs.find((x) => /^password=/i.test(x)) || "").split("=").slice(1).join("=") || null;
function parseReply(buf, off = 0) {
  if (off >= buf.length) return null;
  const t = String.fromCharCode(buf[off]);
  const eol = buf.indexOf("\r\n", off);
  if (eol < 0) return null;
  const line = buf.toString("utf8", off + 1, eol);
  if (t === "+") return [line, eol + 2];
  if (t === "-") return [new Error(line), eol + 2];
  if (t === ":") return [parseInt(line, 10), eol + 2];
  if (t === "$") {
    const n = parseInt(line, 10);
    if (n < 0) return [null, eol + 2];
    if (buf.length < eol + 2 + n + 2) return null;
    return [buf.toString("utf8", eol + 2, eol + 2 + n), eol + 2 + n + 2];
  }
  if (t === "*") {
    const n = parseInt(line, 10);
    let p = eol + 2;
    const arr = [];
    for (let i = 0; i < n; i++) { const r = parseReply(buf, p); if (!r) return null; arr.push(r[0]); p = r[1]; }
    return [arr, p];
  }
  throw new Error("RESP lạ: " + t);
}
export function redisCmd(...args) {
  const cmds = RPASS ? [["AUTH", RPASS], args] : [args];
  const wire = cmds.map((c) => `*${c.length}\r\n` + c.map((a) => "$" + Buffer.byteLength(String(a)) + `\r\n${a}\r\n`).join("")).join("");
  return new Promise((resolve, reject) => {
    const sock = net.connect(RPORT, RHOST);
    let buf = Buffer.alloc(0);
    const timer = setTimeout(() => { sock.destroy(); reject(new Error("redis timeout")); }, 5000);
    sock.on("error", (e) => { clearTimeout(timer); reject(e); });
    sock.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      let off = 0, last;
      for (let i = 0; i < cmds.length; i++) {
        const r = parseReply(buf, off);
        if (!r) return;
        last = r[0]; off = r[1];
      }
      clearTimeout(timer);
      sock.end();
      last instanceof Error ? reject(last) : resolve(last);
    });
    sock.write(wire);
  });
}

// ─── Kết quả ───────────────────────────────────────────────────
const results = new Map(); // id -> { pass, fail, notes[] }
function rec(id) {
  if (!results.has(id)) results.set(id, { pass: 0, fail: 0, fails: [], notes: [] });
  return results.get(id);
}
export function ck(id, ok, detail = "") {
  const r = rec(id);
  if (ok) r.pass++;
  else {
    r.fail++;
    r.fails.push(detail);
    if (r.fail <= 6) console.log(`   ❌ ${id}: ${detail}`);
    else if (r.fail === 7) console.log(`   ❌ ${id}: ... (còn nữa, ẩn bớt)`);
  }
  return ok;
}
export function note(id, text) {
  rec(id).notes.push(text);
  console.log(`   📝 ${id}: ${text}`);
}

// ─── HTTP ──────────────────────────────────────────────────────
export const recorded = []; // mọi response, để kiểm tra toàn cục J-01/02/03/06
// Bước 4.1: POST /jobs bắt buộc Idempotency-Key -> tự sinh UUID mới mỗi lần, trừ khi noIdem:true hoặc đã truyền sẵn header
export async function raw(method, p, { body, headers = {}, rawBody, probe = false, noIdem = false } = {}) {
  const opts = { method, headers: { ...headers } };
  if (method === "POST" && p === "/jobs" && !noIdem && !Object.keys(opts.headers).some((k) => k.toLowerCase() === "idempotency-key"))
    opts.headers["Idempotency-Key"] = crypto.randomUUID();
  if (rawBody !== undefined) opts.body = rawBody;
  else if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const tSent = Date.now();
  const res = await fetch(`${API}${p}`, opts);
  let data = null;
  const ct = res.headers.get("content-type") || "";
  let text = "";
  try { text = await res.text(); } catch { /* rỗng */ }
  if (ct.includes("json")) { try { data = JSON.parse(text); } catch { data = null; } } else data = text;
  const out = { status: res.status, data, headers: res.headers, ct, text, tSent, tDone: Date.now() };
  recorded.push({ method, path: p, probe, ...out });
  return out;
}
export const bearer = (t) => ({ Authorization: `Bearer ${t}` });
export const J = (method, p, token, body, extra = {}) => raw(method, p, { body, headers: token ? bearer(token) : {}, ...extra });

export const sortedKeys = (o) => Object.keys(o).sort();
export const sameSet = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
export const isErr = (r, status, code) => r.status === status && r.data && r.data.code === code;
export const errStr = (r) => `${r.status} ${JSON.stringify(r.data)?.slice(0, 220)}`;

// ─── Ngày theo lịch VN ─────────────────────────────────────────
const vnToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
export function addDays(d, n) {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
export const TODAY = vnToday();

// ─── Setup tài khoản ───────────────────────────────────────────
function userIdOf(token) {
  const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
  const k = Object.keys(p).find((x) => /nameidentifier$/.test(x));
  return (k && p[k]) || p.nameid || p.sub;
}
export async function makeUser(name, role) {
  const email = `jobqa_${TS}_${name}@test.com`;
  const reg = await raw("POST", "/auth/register", { body: { username: `jobqa_${TS}_${name}`.slice(0, 50), email, password: "Test1234!", role } });
  const login = await raw("POST", "/auth/login", { body: { email, password: "Test1234!", rememberMe: false } });
  if (!login.data?.accessToken) throw new Error(`login ${name} fail: reg=${reg.status} ${JSON.stringify(reg.data)} login=${errStr(login)}`);
  const id = userIdOf(login.data.accessToken);
  // ghi nhận ngay để cleanup biết user này kể cả khi setup lỗi giữa chừng
  (globalThis.__created ||= []).push(id);
  return { name, token: login.data.accessToken, id };
}
let taxSeq = 0;
let profileSeq = 0;
export const bigDesc = ("Mô tả công ty rất dài, có xuống dòng.\n" + "Ký tự tiếng Việt: ăâđêôơư. ").repeat(60).slice(0, 3000);
export const profileOf = {};
export async function makeProfile(u) {
  const i = ++profileSeq;
  const body = {
    companyName: `JobQA_${u.name}_${TS}`,
    address: `${i} Đường Kiểm Thử, Quận 1, TP HCM`,
    field: "IT",
    phone: "0901234567",
    taxCode: `${String(TS).slice(-8)}${String(10 + taxSeq++)}`,
    description: u.name === "E1" ? bigDesc : "Công ty kiểm thử",
    website: "https://example.com",
    foundedYear: 2015,
  };
  const r = await J("PUT", "/employer/me", u.token, body);
  if (r.status !== 200) throw new Error(`profile ${u.name}: ${errStr(r)}`);
  profileOf[u.name] = body;
}
export const setVerified = (u, v) => sql(`UPDATE employerprofile SET isVerified=${v} WHERE userId='${u.id}'`);

// ─── Builder Job ───────────────────────────────────────────────
let OPT; // /jobs/options, gán ở setup
export function validJob(o = {}) {
  return {
    jobTitle: `QA Job ${TS}`,
    category: OPT.categories[0].name,
    subCategory: OPT.categories[0].subCategories[0],
    location: OPT.locations[0],
    workType: OPT.workTypes[0],
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
export async function mkJob(u, o = {}) {
  const r = await J("POST", "/jobs", u.token, validJob(o));
  if (r.status !== 201) throw new Error(`mkJob ${u.name}: ${errStr(r)}`);
  return r.data;
}
export const setDeadline = (jobId, d) => sql(`UPDATE job SET deadline='${d}' WHERE jobId='${jobId}'`);
export const jobStatusDb = (jobId) => sql(`SELECT status FROM job WHERE jobId='${jobId}'`);
export const jobExists = (jobId) => sqlInt(`SELECT COUNT(*) FROM job WHERE jobId='${jobId}'`) === 1;
export const snap = (jobId) => sql(`SELECT * FROM job WHERE jobId='${jobId}'`);
export const appCount = (jobId) => sqlInt(`SELECT COUNT(*) FROM application WHERE jobId='${jobId}'`);
// status: Pending | Accepted | Rejected (đơn đã xử lý có statusChangedAt)
export const appInsertSql = (finder, jobId, status = "Pending") =>
  `INSERT INTO application (applicationId,finderId,jobId,fullName,email,cvUrl,status,appliedAt,statusChangedAt,coverLetter) VALUES (UUID(),'${finder.id}','${jobId}','QA Finder','qa@test.com','https://example.com/cv.pdf','${status}',UTC_TIMESTAMP(),${status === "Pending" ? "NULL" : "UTC_TIMESTAMP()"},NULL)`;
export const addApp = (finder, jobId, status = "Pending") => sql(appInsertSql(finder, jobId, status));

// Mở 1 phiên mysql riêng (child process), chạy `stmts` trong transaction và GIỮ MỞ tới khi commit()/rollback().
// Dùng để dựng race thật: INSERT đơn chưa commit trong lúc gọi DELETE. Phiên chết thì MySQL tự rollback.
export function holdTx(stmts) {
  const child = spawn(MYSQL, ["-h", cs.server, "-P", cs.port || "3306", "-u", cs.user, "--default-character-set=utf8mb4", "-N", "-B", "--unbuffered", cs.database], {
    env: { ...process.env, MYSQL_PWD: cs.password },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let out = "", err = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { err += d; });
  const end = (word) => new Promise((resolve) => {
    child.on("exit", resolve);
    child.stdin.end(`${word};
`);
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`holdTx quá hạn: ${err || out}`)); }, 15000);
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    const tick = setInterval(() => {
      if (err && !/Using a password/i.test(err)) { clearInterval(tick); clearTimeout(timer); child.kill(); reject(new Error(`holdTx lỗi SQL: ${err}`)); }
      else if (out.includes("READY")) {
        clearInterval(tick); clearTimeout(timer);
        resolve({ commit: () => end("COMMIT"), rollback: () => end("ROLLBACK"), kill: () => child.kill() });
      }
    }, 20);
    child.stdin.write(`START TRANSACTION;
${stmts};
SELECT 'READY';
`);
  });
}

export const RESP_KEYS = [
  "jobId", "jobTitle", "category", "subCategory", "location", "workType", "skillRequired", "description", "requirement",
  "applicantBenefit", "salaryType", "salaryMin", "salaryMax", "yearOfExperience", "numberOfPosition", "deadline", "status",
  "createdAt", "companyName", "logo",
];
export const DETAIL_KEYS = [...RESP_KEYS, "companyAddress", "companyFoundedYear", "companyDescription"];
// chi tiết công khai có thêm hasApplied (Application Business 2.5); chi tiết của Employer không có
export const PUBLIC_DETAIL_KEYS = [...DETAIL_KEYS, "hasApplied"];
// 2 API của Employer có thêm applicationCount (Application Business 5); các API khác không có
export const EMPLOYER_LIST_KEYS = [...RESP_KEYS, "applicationCount"];
export const EMPLOYER_DETAIL_KEYS = [...DETAIL_KEYS, "applicationCount"];

// ─── Tiện ích chạy song song ───────────────────────────────────
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = () => crypto.randomUUID();
export const delayed = (ms, f) => sleep(ms).then(f);
export const tally = (o, k) => { o[k] = (o[k] || 0) + 1; };

// Employer có profile, mặc định đã xác minh
export async function makeEmployer(name, verified = true) {
  const u = await makeUser(name, "employer");
  await makeProfile(u);
  if (verified) setVerified(u, 1);
  return u;
}

// ─── BE phụ cổng 5166 (dotnet run --no-build, cần đã build) ───
// Bật BE phụ với biến môi trường riêng, chờ sẵn sàng, chạy fn(base, getLog) rồi tắt. Cổng đang bận -> ghi nhận và bỏ qua
export async function withExtraBackend(id, env, fn) {
  const base = "http://localhost:5166/api";
  const busy = await fetch(`${base}/jobs/options`).then(() => true).catch(() => false);
  if (busy) return note(id, "cổng 5166 đang bị chiếm, bỏ qua");
  const child = spawn("dotnet", ["run", "--no-build", "--no-launch-profile", "--urls", "http://localhost:5166"], {
    cwd: BACKEND_DIR,
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: "Development", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let log = "";
  child.stdout.on("data", (d) => { log += d; });
  child.stderr.on("data", (d) => { log += d; });
  try {
    let up = false;
    for (let i = 0; i < 60 && !up; i++) {
      up = await fetch(`${base}/jobs/options`).then((r) => r.status === 200).catch(() => false);
      if (!up) await sleep(1500);
    }
    ck(id, up, `BE phụ không khởi động được. Log: ${log.slice(-400)}`);
    if (up) await fn(base, () => log);
  } finally {
    try { execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" }); } catch { /* đã thoát */ }
  }
}

// ─── Setup chung cho mọi nhóm ──────────────────────────────────
// Nhóm nào cần đếm Job chính xác (list, createdAt, search) thì tự tạo Employer riêng bằng makeEmployer
export const ctx = { U: {}, OPT: null, jobE1: null, jobE3: null, jobE3c: null };
async function setup() {
  console.log(`\n🔧 SETUP (TS=${TS}, hôm nay VN=${TODAY})`);
  const U = ctx.U;
  for (const [n, role] of [["E1", "employer"], ["E2", "employer"], ["E3", "employer"], ["E4", "employer"], ["F1", "finder"], ["F2", "finder"]])
    U[n] = await makeUser(n, role);
  // E4 không có profile
  for (const n of ["E1", "E2", "E3"]) await makeProfile(U[n]);
  for (const n of ["F1", "F2"]) {
    const r = await J("PUT", "/finders/me", U[n].token, {
      fullname: "Nguyen Van A", phone: "0901234567", address: "123 Le Loi, Quan 1", educationLevel: "Bachelor", major: "SE",
      experience: "2 years", skill: "React, C#", linkedIn: "https://linkedin.com/in/x", description: "dev",
    });
    if (r.status !== 200) throw new Error(`finder profile ${n}: ${errStr(r)}`);
  }
  for (const n of ["E1", "E2", "E3"]) setVerified(U[n], 1);

  OPT = (await raw("GET", "/jobs/options")).data;
  if (!OPT?.categories) throw new Error("options lỗi");
  ctx.OPT = OPT;

  ctx.jobE1 = await mkJob(U.E1, { jobTitle: "Fixture E1 Open" });
  // E3: 1 Job Open + 1 Job Closed rồi bị hủy xác minh (dùng ở authorization, public-detail, employer-detail, idempotency)
  ctx.jobE3 = await mkJob(U.E3, { jobTitle: "E3 open" });
  ctx.jobE3c = await mkJob(U.E3, { jobTitle: "E3 closed" });
  const closed = await J("PATCH", `/jobs/${ctx.jobE3c.jobId}/status`, U.E3.token, { status: "Closed" });
  if (closed.status !== 200) throw new Error(`đóng job E3: ${errStr(closed)}`);
  setVerified(U.E3, 0);
}

async function cleanup() {
  const ids = globalThis.__created || [];
  if (!ids.length) return;
  // chỉ xoá key idem của userId do run này tạo
  try {
    let n = 0;
    // cache hồ sơ (Bước 11): khóa profile:*:{userId} của user do run tạo
    for (const id of ids) { const ks = [...(await redisCmd("KEYS", `idem:${id}:*`)), `profile:employer:${id}`, `profile:finder:${id}`]; await redisCmd("DEL", ...ks); n += ks.length; }
    console.log(`🧹 Redis: đã gửi DEL ${n} key idem + profile của run`);
  } catch (e) { console.log("⚠️ Redis cleanup lỗi:", e.message); }
  const l = ids.map((i) => `'${i}'`).join(",");
  try {
    sql(`DELETE FROM application WHERE finderId IN (${l}) OR jobId IN (SELECT jobId FROM job WHERE employerId IN (${l}))`);
    sql(`DELETE FROM job WHERE employerId IN (${l})`);
    sql(`DELETE FROM employerprofile WHERE userId IN (${l})`);
    sql(`DELETE FROM finderprofile WHERE userId IN (${l})`);
    sql(`DELETE FROM refreshToken WHERE userId IN (${l})`);
    sql(`DELETE FROM users WHERE userId IN (${l})`);
    const left = sqlInt(`SELECT (SELECT COUNT(*) FROM users WHERE userId IN (${l})) + (SELECT COUNT(*) FROM job WHERE employerId IN (${l}))`);
    console.log(`\n🧹 Cleanup: đã xoá dữ liệu của ${ids.length} user của run, còn lại ${left} dòng`);
  } catch (e) {
    console.log("\n⚠️ Cleanup lỗi:", e.message);
  }
}

function printSummary(crashed) {
  console.log("\n" + "═".repeat(70) + "\n  KẾT QUẢ THEO ID\n" + "═".repeat(70));
  const ids = [...results.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  let passIds = 0, failIds = 0, assertPass = 0, assertFail = 0;
  for (const id of ids) {
    const r = results.get(id);
    assertPass += r.pass; assertFail += r.fail;
    const asserts = r.pass + r.fail;
    const st = asserts === 0 ? "GHI NHẬN" : r.fail === 0 ? "PASS" : "FAIL";
    if (st === "PASS") passIds++; else if (st === "FAIL") failIds++;
    console.log(`${st === "PASS" ? "✅" : st === "FAIL" ? "❌" : "📝"} ${id.padEnd(8)} ${st.padEnd(9)} (${r.pass}/${asserts})`);
  }
  console.log(`\nTổng: ${passIds} ID PASS, ${failIds} ID FAIL | assertion: ${assertPass} pass, ${assertFail} fail${crashed ? " | CÓ NHÓM BỊ LỖI CHẠY" : ""}`);
  return failIds > 0 || crashed;
}

// setup 1 lần, chạy lần lượt từng nhóm (nhóm lỗi giữa chừng không chặn nhóm sau), dọn dẹp, in tổng kết
export async function runSuites(suites) {
  let crashed = false;
  try {
    await setup();
    for (const s of suites) {
      console.log(`\n══════ ${s.name}`);
      try {
        await s.run(ctx);
      } catch (e) {
        crashed = true;
        ck("CRASH", false, `${s.name}: ${e.stack || e}`);
      }
    }
  } catch (e) {
    crashed = true;
    console.log("\n💥 Lỗi setup:", e.stack || e);
  } finally {
    if (!KEEP) await cleanup();
  }
  process.exit(printSummary(crashed) ? 1 : 0);
}

// file test được chạy trực tiếp bằng node (không phải import từ run.mjs)
export const isMain = (url) => path.resolve(fileURLToPath(url)) === path.resolve(process.argv[1] || "");
