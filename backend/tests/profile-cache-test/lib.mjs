/**
 * Thư viện API test cache hồ sơ (Bước 11, T24): GET /api/employer/me, GET /api/finders/me cache Redis.
 * Dùng lại helper của admin-test/lib.mjs (job-test/lib.mjs): sql, redisCmd, J, makeEmployerSafe, adminVerify...
 * Khóa: profile:employer:{userId}, profile:finder:{userId}, TTL 10 phút. Cần BE + MySQL + Redis đang chạy.
 * Không upload Cloudinary (Lead chốt 2026-11-20): logo / avatar / cv thành công do Reviewer + xUnit của BE Dev bao.
 */
import { ck, makeUserSafe, redisCmd, runAdminSuites, J } from "../admin-test/lib.mjs";

export * from "../admin-test/lib.mjs";
export { runAdminSuites };

export const empKey = (id) => `profile:employer:${id}`;
export const finKey = (id) => `profile:finder:${id}`;
export const keyExists = async (k) => (await redisCmd("EXISTS", k)) === 1;
export const keyVal = (k) => redisCmd("GET", k);

export const EMP_KEYS = ["companyName", "address", "description", "website", "logo", "foundedYear", "taxCode", "phone", "email", "field", "isVerified", "unverifyReason"];
export const FIN_KEYS = ["fullname", "phone", "avatar", "description", "address", "educationLevel", "experience", "cv", "linkedIn", "major", "skill", "email", "dateOfBirth", "gender"];
export const LEAK_RE = /passwordHash|password|token|refresh|userId|\$2[aby]\$/i;

export function finderBody(o = {}) {
  return {
    fullname: "Nguyen Van PC", phone: "0901234567", address: "1 Le Loi, Q1", educationLevel: "Bachelor", major: "SE",
    experience: "2 years", skill: "React, C#", linkedIn: "https://linkedin.com/in/pc", description: "dev cache",
    dateOfBirth: "2000-01-02T00:00:00", gender: "Male", ...o,
  };
}
/** Finder; withProfile=false -> chưa có hồ sơ */
export async function makeFinderSafe(name, withProfile = true) {
  const u = await makeUserSafe(name, "finder");
  if (withProfile) {
    const r = await J("PUT", "/finders/me", u.token, finderBody());
    if (r.status !== 200) throw new Error(`finder profile ${name}: ${r.status} ${JSON.stringify(r.data)}`);
  }
  return u;
}
/** Dọn mọi khóa profile:* của user do run tạo (globalThis.__created do makeUser ghi nhận); trả số khóa đã xóa */
export async function dropProfileKeys(ids = globalThis.__created || []) {
  let n = 0;
  for (const id of ids) {
    const ks = [empKey(id), finKey(id)];
    n += await redisCmd("DEL", ...ks);
  }
  return n;
}
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const keysOk = (o, want) => JSON.stringify(Object.keys(o).sort()) === JSON.stringify([...want].sort());
export { ck };

/** Nạp cache: GET (miss) rồi GET (hit); primed = cả 2 lần 200 và khóa có mặt. Thiếu bước này thì test "ghi xong khóa mất" xanh cả khi không có cache */
export async function prime(path, token, key) {
  const r1 = await J("GET", path, token);
  const r2 = await J("GET", path, token);
  return { r1, r2, primed: r1.status === 200 && r2.status === 200 && (await keyExists(key)) };
}
