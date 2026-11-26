// AZ: Quyền của POST /api/jobs/{id}/applications — khách 401, employer / admin 403 FORBIDDEN_ROLE (policy chạy trước filter idempotency, rate limit, validation)
// Chạy riêng: node backend/tests/application-test/authorization.test.mjs [--base=http://localhost:5166/api]
// Lưu ý: request khách / token hỏng chia rate limit theo IP -> cả file chỉ gửi 3 request khách (giới hạn 5/phút/IP)
import {
  apply, ck, errStr, isErr, isMain, makeEmployerJob, runAdminSuites, sharedAdmin, sqlInt, cloudSummary,
} from "./lib.mjs";

export const name = "AZ: Quyền ứng tuyển (khách / employer / admin)";

export default async function run(ctx) {
  console.log("\n── AZ: quyền");
  const { e, job } = await makeEmployerJob("AZE1", { jobTitle: "AZ job" });
  const adm = await sharedAdmin(ctx);

  // khách: có key / không key / token rác (không key: 401 phải đến trước 400 thiếu key)
  const g1 = await apply(null, job.jobId);
  ck("AZ-01", isErr(g1, 401, "UNAUTHENTICATED"), `khách: ${errStr(g1)}`);
  const g2 = await apply(null, job.jobId, { key: null });
  ck("AZ-01", isErr(g2, 401, "UNAUTHENTICATED"), `khách không key: ${errStr(g2)}`);
  const g3 = await apply(null, job.jobId, { token: "abc.def.ghi" });
  ck("AZ-01", isErr(g3, 401, "UNAUTHENTICATED"), `token rác: ${errStr(g3)}`);

  // employer / admin -> 403 FORBIDDEN_ROLE, kể cả không key (policy trước filter)
  for (const [label, u] of [["employer", e], ["admin", adm]]) {
    const r = await apply(u, job.jobId);
    ck("AZ-02", isErr(r, 403, "FORBIDDEN_ROLE"), `${label}: ${errStr(r)}`);
  }
  const rn = await apply(e, job.jobId, { key: null });
  ck("AZ-02", isErr(rn, 403, "FORBIDDEN_ROLE"), `employer không key: ${errStr(rn)}`);
  ck("AZ-03", sqlInt(`SELECT COUNT(*) FROM application WHERE jobId='${job.jobId}'`) === 0, "request bị từ chối vẫn tạo đơn");
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }, cloudSummary]);
