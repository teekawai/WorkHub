/**
 * Chạy API test Bước 6 Admin (cần BE ở http://localhost:5165 + MySQL + Redis; nhóm seed cần đã `dotnet build backend`, dùng cổng 5166).
 *
 *   node backend/tests/admin-test/run.mjs              // tất cả nhóm
 *   node backend/tests/admin-test/run.mjs login list   // chỉ các nhóm được chỉ định (tên file bỏ .test.mjs)
 *   cờ của job-test lib: --keep (admin tạm vẫn luôn bị xóa)
 *
 * Theo API:  login (POST /api/admin/login), list (GET /api/admin/employers), verify, unverify (PATCH)
 * Theo chức năng: employer-me, authorization, seed (AdminSeeder); cuối run luôn có suite dọn + kiểm sạch
 */
import { runAdminSuites } from "./lib.mjs";

const ORDER = ["login", "list", "verify", "unverify", "employer-me", "authorization", "seed"];
const picked = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const unknown = picked.filter((x) => !ORDER.includes(x));
if (unknown.length) {
  console.log(`Không có nhóm: ${unknown.join(", ")}\nCác nhóm: ${ORDER.join(", ")}`);
  process.exit(1);
}
const suites = [];
for (const f of picked.length ? ORDER.filter((x) => picked.includes(x)) : ORDER) {
  const m = await import(`./${f}.test.mjs`);
  suites.push({ name: m.name, run: m.default });
}
await runAdminSuites(suites);
