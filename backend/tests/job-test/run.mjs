/**
 * Chạy API test module Job (cần BE ở http://localhost:5165 + MySQL + Redis đang chạy).
 *
 *   node backend/tests/job-test/run.mjs                      // tất cả nhóm
 *   node backend/tests/job-test/run.mjs search create        // chỉ các nhóm được chỉ định (tên file bỏ .test.mjs)
 *   cờ: --rounds=N  --skip-id14  --be-log=<file log BE, cho SQL-01>  --keep
 *
 * Theo API (JobController):   options, search, public-detail, create, update, close, delete, employer-list, employer-detail
 * Theo chức năng / service:   authorization, idempotency, concurrency, created-at, auto-close, global-checks (luôn chạy cuối)
 */
import { runSuites } from "./lib.mjs";

const ORDER = [
  "options", "create", "authorization", "public-detail", "search", "update", "close", "delete",
  "employer-list", "employer-detail", "idempotency", "concurrency", "created-at", "auto-close", "global-checks",
];

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
await runSuites(suites);
