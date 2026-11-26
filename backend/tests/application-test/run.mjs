/**
 * Chạy API test module Application (Bước 3: nộp đơn). Cần BE + MySQL + Redis + Cloudinary thật.
 *
 *   node backend/tests/application-test/run.mjs --base=http://localhost:5166/api             // tất cả nhóm
 *   node backend/tests/application-test/run.mjs authorization idempotency --base=...         // chỉ các nhóm chỉ định (tên file bỏ .test.mjs)
 *   cờ: --base=<url>  --rounds=N (tối đa 4 vòng/case)  --keep
 *
 * Theo API (ApplicationController.Apply): apply, rate-limit
 * Theo chức năng / service:               authorization, idempotency, concurrency, global-checks (luôn chạy cuối)
 * Mỗi lần nộp đơn 201 đẩy 1 file lên Cloudinary thật (không xóa được qua API): số file in ở cuối run.
 */
import { cloudSummary, runAdminSuites } from "./lib.mjs";

const ORDER = ["apply", "authorization", "idempotency", "concurrency", "rate-limit", "global-checks"];

const picked = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const unknown = picked.filter((x) => !ORDER.includes(x));
if (unknown.length) {
  console.log(`Không có nhóm: ${unknown.join(", ")}\nCác nhóm: ${ORDER.join(", ")}`);
  process.exit(1);
}

const files = picked.length ? ORDER.filter((x) => picked.includes(x)) : ORDER;
const suites = [];
for (const f of files) {
  const m = await import(`./${f}.test.mjs`);
  suites.push({ name: m.name, run: m.default });
}
await runAdminSuites([...suites, cloudSummary]);
