/**
 * Chạy API test cache hồ sơ (Bước 11). Cần BE ở http://localhost:5165 + MySQL + Redis đang chạy (admin tạm tự tạo + tự xóa).
 *
 *   node backend/tests/profile-cache-test/run.mjs                      // tất cả nhóm
 *   node backend/tests/profile-cache-test/run.mjs employer-me consistency
 *   cờ: --rounds=N (race, mặc định 25)  --keep
 *
 * Theo API: employer-me (GET/PUT /employer/me), finder-me (GET/PUT /finders/me), admin-verify (PATCH verify/unverify xóa khóa employer)
 * Theo chức năng: consistency (nội dung từ cache, cache-hit, TTL, cách ly, race); cleanup (xóa khóa + kiểm sạch, luôn chạy cuối)
 */
import { runAdminSuites } from "./lib.mjs";

const ORDER = ["employer-me", "finder-me", "admin-verify", "consistency", "cleanup"];
const picked = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const unknown = picked.filter((x) => !ORDER.includes(x));
if (unknown.length) {
  console.log(`Không có nhóm: ${unknown.join(", ")}\nCác nhóm: ${ORDER.join(", ")}`);
  process.exit(1);
}
const suites = [];
for (const f of picked.length ? ORDER.filter((x) => picked.includes(x) || x === "cleanup") : ORDER) {
  const m = await import(`./${f}.test.mjs`);
  suites.push({ name: m.name, run: m.default });
}
await runAdminSuites(suites);
