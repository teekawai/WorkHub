/**
 * Chạy attack-test Bước 7 (cần BE + MySQL + Redis đang chạy).
 *
 *   node backend/tests/attack-test/run.mjs                    // tất cả nhóm
 *   node backend/tests/attack-test/run.mjs checker            // chỉ các nhóm được chỉ định (tên file bỏ .test.mjs)
 *   cờ: --base=<url>  (mặc định http://localhost:5165/api; mutation Task 8 trỏ sang cổng 5166)
 *
 * Nhóm: checker (self-test bộ kiểm bất biến), load (tải nhiều tài khoản + IDOR). Các task sau thêm nhóm vào ORDER (checker luôn đứng đầu).
 */
import { runAttackSuites } from "./lib.mjs";

const ORDER = ["checker", "load", "tx-attack", "security"];

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
await runAttackSuites(suites);
