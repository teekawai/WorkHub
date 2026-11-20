/**
 * Thư viện API test module Admin (Bước 6). Dùng lại toàn bộ helper của job-test/lib.mjs, chỉ thêm phần riêng của Admin.
 * Cần BE ở http://localhost:5165 + MySQL + Redis. Chạy: xem run.mjs (mỗi file *.test.mjs cũng chạy riêng được bằng node).
 *
 * - Admin tạm: user đăng ký thường rồi UPDATE role='admin', username='qa_admin_...' (đánh dấu để dọn), đăng nhập bằng email; luôn bị xóa cuối run (kể cả --keep).
 * - Rate limit "auth" 100 req/phút/IP gộp register + login + admin/login: paceAuth() giãn nhịp theo số request auth đã gửi trong 60s gần nhất.
 * - Khóa admin (Redis admin-login:*): clearAdminLock() xóa key của IP localhost; test nào đếm lượt đều gọi trước. Ctrl-C giữa lúc test khóa có thể để lại key 30 phút: chạy lại run.mjs (xóa ở đầu run) hoặc DEL tay.
 * - KHÔNG đọc / in mật khẩu admin thật; email admin thật chỉ đọc từ appsettings.json lúc chạy.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as base from "../job-test/lib.mjs";
import { BACKEND_DIR, TS, ck, makeProfile, makeUser, raw, recorded, redisCmd, runSuites, setVerified, sleep, sql, sqlInt } from "../job-test/lib.mjs";

export * from "../job-test/lib.mjs";

// ─── Hằng ──────────────────────────────────────────────────────
export const BAD_CRED = "Sai tài khoản hoặc mật khẩu";
export const LOCK_MSG = "Đăng nhập sai quá nhiều lần";
export const TEMP_PWD = "Test1234!"; // mật khẩu của user tạm do makeUser tạo (không phải mật khẩu admin thật)
const LOCAL_IPS = ["::1", "127.0.0.1", "::ffff:127.0.0.1"];
const LOCK_KEYS = LOCAL_IPS.flatMap((ip) => [`admin-login:fail:${ip}`, `admin-login:lock:${ip}`]);

export const REAL_ADMIN_EMAIL = (() => {
  const cfg = JSON.parse(fs.readFileSync(path.join(BACKEND_DIR, "appsettings.json"), "utf8").replace(/^﻿/, ""));
  return String(cfg.Admin?.Email || "").trim().toLowerCase();
})();
export const randTag = () => crypto.randomBytes(5).toString("hex");

// ─── Giãn nhịp rate limit "auth" ───────────────────────────────
const AUTH_BUDGET = 92; // < 100: chừa chỗ cho request lạ cùng IP
const isAuthPath = (p) => p.startsWith("/auth/") || p === "/admin/login";
/** Chờ tới khi gửi thêm n request auth không vượt ngân sách (đếm sliding 60s >= đếm của fixed window thật nên an toàn) */
export async function paceAuth(n = 1) {
  for (;;) {
    const cut = Date.now() - 60_500;
    const used = recorded.filter((r) => isAuthPath(r.path) && r.tSent > cut).length;
    if (used + n <= AUTH_BUDGET) return;
    await sleep(1000);
  }
}
const isRateLimited = (r) => r.status === 429 && !String(r.data?.message || "").includes(LOCK_MSG);

/** makeUser có pace + chờ rồi thử lại khi dính rate limit */
export async function makeUserSafe(name, role) {
  for (let i = 0; i < 3; i++) {
    await paceAuth(2);
    try { return await makeUser(name, role); }
    catch (e) { if (!/429|thao tác quá nhanh/.test(String(e.message))) throw e; await sleep(61_000); }
  }
  return makeUser(name, role);
}
/** Employer có profile (companyName tùy chọn), mặc định đã xác minh */
export async function makeEmployerSafe(name, verified = true, companyName = null) {
  const u = await makeUserSafe(name, "employer");
  await makeProfile(u);
  if (companyName) sql(`UPDATE employerprofile SET companyName='${companyName}' WHERE userId='${u.id}'`);
  if (verified) setVerified(u, 1);
  return u;
}

// ─── Đăng nhập admin ───────────────────────────────────────────
/** Gọi fn tới khi không dính 429 của rate limiter (429 này bị chặn trước controller nên không tính vào lượt khóa admin).
 *  Cần vì có process khác (run trước, job-test) cùng IP đã dùng một phần ngân sách 100 req/phút mà paceAuth không thấy. */
export async function untilNotRateLimited(fn) {
  let r;
  for (let i = 0; i < 4; i++) {
    r = await fn();
    if (!isRateLimited(r)) return r;
    await sleep((parseInt(r.headers.get("retry-after") || "60", 10) + 1) * 1000);
  }
  return r;
}
/** 1 lượt POST /admin/login (tự pace + chờ khi dính rate limiter; 429 KHÓA ADMIN thì trả nguyên để test kiểm) */
export async function adminLoginOnce(email, password) {
  await paceAuth(1);
  return untilNotRateLimited(() => raw("POST", "/admin/login", { body: { email, password, rememberMe: false } }));
}
export const adminLogin = adminLoginOnce;
/** true nếu response là 429 do KHÓA ADMIN (đúng code + message + Retry-After 1790..1800), không phải 429 của rate limiter */
export const isAdminLock = (r) => {
  if (r.status !== 429 || r.data?.code !== "TOO_MANY_REQUESTS" || !String(r.data.message || "").includes(LOCK_MSG)) return false;
  const s = parseInt(r.headers.get("retry-after") || "0", 10);
  return s >= 1790 && s <= 1800;
};

export async function lockKeysLeft() {
  const ks = await redisCmd("KEYS", "admin-login:*");
  return ks.filter((k) => LOCK_KEYS.includes(k));
}
/** Xóa key khóa admin của IP localhost; trả về các key còn sót (phải rỗng nếu đúng IP mà BE nhìn thấy) */
export async function clearAdminLock() {
  await redisCmd("DEL", ...LOCK_KEYS);
  return lockKeysLeft();
}

// ─── Admin tạm ─────────────────────────────────────────────────
/** User thường -> admin (UPDATE role + username đánh dấu), rồi đăng nhập bằng email qua /api/admin/login để có token role admin */
export async function makeTempAdmin(name) {
  const u = await makeUserSafe(name, "finder");
  const username = `qa_admin_${TS}_${name}`;
  sql(`UPDATE users SET role='admin', username='${username}' WHERE userId='${u.id}'`);
  const email = `jobqa_${TS}_${name}@test.com`.toLowerCase();
  const login = await adminLogin(email, TEMP_PWD);
  if (!login.data?.accessToken) throw new Error(`admin login ${name} fail: ${login.status} ${JSON.stringify(login.data)?.slice(0, 200)}`);
  return { ...u, username, email, password: TEMP_PWD, token: login.data.accessToken };
}
/** Admin dùng chung cho cả run (cache trong ctx) để tiết kiệm lượt auth */
export async function sharedAdmin(ctx) {
  return (ctx.__adminQa ||= await makeTempAdmin("ADM"));
}

/** Xóa mọi admin tạm (username hoặc email qa_admin_*, role admin) cùng refresh token. Không đụng admin thật. */
export function cleanTempAdmins() {
  const w = `role='admin' AND (LEFT(username,9)='qa_admin_' OR LEFT(email,9)='qa_admin_')`;
  sql(`DELETE FROM refreshToken WHERE userId IN (SELECT userId FROM (SELECT userId FROM users WHERE ${w}) t)`);
  sql(`DELETE FROM users WHERE ${w}`);
}
export const tempAdminCount = () => sqlInt(`SELECT COUNT(*) FROM users WHERE LEFT(username,9)='qa_admin_' OR LEFT(email,9)='qa_admin_'`);

// ─── API admin ─────────────────────────────────────────────────
export const adminGet = (adm, qs = "") => base.J("GET", `/admin/employers${qs}`, adm.token);
/** Tên + MST admin "đang xem" = giá trị hiện tại trong DB (không có profile -> giá trị giả, chỉ để qua validation) */
export function verifyView(userId) {
  // mysql -B tự escape tab trong giá trị -> dùng '|' như các helper khác (tên công ty test không chứa '|')
  const row = sql(`SELECT CONCAT(companyName, '|', taxCode) FROM employerprofile WHERE userId='${userId}'`);
  if (!row) return { companyName: "khong co", taxCode: "0000000000" };
  const [companyName, taxCode] = row.split("|");
  return { companyName, taxCode };
}
export const adminVerify = (adm, userId, body = verifyView(userId)) => base.J("PATCH", `/admin/employers/${userId}/verify`, adm.token, body);
export const adminUnverify = (adm, userId, body) => base.J("PATCH", `/admin/employers/${userId}/unverify`, adm.token, body);
export const profileDb = (userId) => base.sqlRow(`SELECT isVerified+0, IFNULL(unverifyReason,'<NULL>') FROM employerprofile WHERE userId='${userId}'`);
export const jobCountDb = (employerId, status) => sqlInt(`SELECT COUNT(*) FROM job WHERE employerId='${employerId}' AND status='${status}'`);

// ─── Suite cuối: dọn + kiểm sạch ───────────────────────────────
export const cleanupSuite = {
  name: "Z: Dọn admin tạm + kiểm cuối",
  async run() {
    cleanTempAdmins();
    const left = await clearAdminLock();
    const tmp = tempAdminCount();
    ck("Z-01", tmp === 0, `còn ${tmp} user qa_admin_%`);
    ck("Z-02", left.length === 0, `còn key khóa admin: ${left.join(",")}`);
    ck("Z-03", REAL_ADMIN_EMAIL !== "" && sqlInt(`SELECT COUNT(*) FROM users WHERE role='admin' AND email='${REAL_ADMIN_EMAIL}'`) === 1, "admin thật phải còn đúng 1");
    ck("Z-04", sqlInt(`SELECT COUNT(*) FROM users WHERE role='admin' AND NOT (email <=> '${REAL_ADMIN_EMAIL}')`) === 0, "còn admin lạ ngoài admin thật");
  },
};

/** Thay cho runSuites: dọn sót đầu run, suite cuối tự dọn + kiểm, hook thoát / Ctrl-C vẫn xóa admin tạm */
export async function runAdminSuites(suites) {
  const sweep = () => { try { cleanTempAdmins(); } catch { /* DB không với tới được */ } };
  sweep();
  process.on("exit", sweep);
  process.on("SIGINT", () => { sweep(); process.exit(130); });
  try { await clearAdminLock(); } catch { /* Redis chưa chạy: test sẽ tự báo */ }
  await runSuites([...suites, cleanupSuite]);
}
