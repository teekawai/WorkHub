// RL: Rate limit policy "apply" — 5 request / phút / userId, đếm mọi request (400 / 404 / 409 / thiếu key), request thứ 6 -> 429 TOO_MANY_REQUESTS
// Chạy riêng: node backend/tests/application-test/rate-limit.test.mjs [--base=http://localhost:5166/api]
import {
  addApp, apply, ck, errStr, isErr, isMain, makeEmployerJob, makeFinder, runAdminSuites, sqlInt, uid, cloudSummary,
} from "./lib.mjs";

export const name = "RL: Rate limit apply (5/phút/user)";

export default async function run() {
  console.log("\n── RL: rate limit");
  const { job } = await makeEmployerJob("RLE1", { jobTitle: "RL job" });
  const F = await makeFinder("RLF1");
  const F2 = await makeFinder("RLF2");
  addApp(F, job.jobId); // để request #4 là 409 ALREADY_APPLIED mà không tốn upload

  const seq = [
    ["400 thiếu CV", () => apply(F, job.jobId, { file: null }), 400, "VALIDATION_ERROR"],
    ["400 fullName rỗng", () => apply(F, job.jobId, { fields: { fullName: " " } }), 400, "VALIDATION_ERROR"],
    ["404 job không có", () => apply(F, uid()), 404, "JOB_NOT_FOUND"],
    ["409 đã nộp", () => apply(F, job.jobId), 409, "ALREADY_APPLIED"],
    ["400 thiếu Idempotency-Key", () => apply(F, job.jobId, { key: null }), 400, "VALIDATION_ERROR"],
  ];
  for (const [label, f, st, code] of seq) {
    const r = await f();
    ck("RL-01", isErr(r, st, code), `${label}: ${errStr(r)}`);
  }
  const r6 = await apply(F, job.jobId);
  const ra = parseInt(r6.headers.get("retry-after") || "", 10);
  ck("RL-02", isErr(r6, 429, "TOO_MANY_REQUESTS") && typeof r6.data.message === "string", `request 6: ${errStr(r6)}`);
  ck("RL-02", ra >= 1 && ra <= 60, `Retry-After=${r6.headers.get("retry-after")}`);
  const r7 = await apply(F, job.jobId);
  ck("RL-02", isErr(r7, 429, "TOO_MANY_REQUESTS"), `request 7: ${errStr(r7)}`);
  ck("RL-02", sqlInt(`SELECT COUNT(*) FROM application WHERE finderId='${F.id}'`) === 1, "số đơn đổi khi bị 429");

  // finder khác không bị ảnh hưởng (partition theo userId)
  const o = await apply(F2, job.jobId, { file: null });
  ck("RL-03", isErr(o, 400, "VALIDATION_ERROR"), `finder khác: ${errStr(o)}`);
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }, cloudSummary]);
