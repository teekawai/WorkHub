// G: DELETE /api/jobs/:id — Xóa Job + cascade Application (Business 4)
// Chạy riêng: node backend/tests/job-test/delete.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  J, TODAY, addApp, addDays, appCount, ck, errStr, isErr, isMain, jobExists, mkJob, raw, runSuites, sameSet, setDeadline, setVerified, sqlInt,
} from "./lib.mjs";

export const name = "G: DELETE /api/jobs/:id";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── G: DELETE ───────────────
  console.log("\n── G: DELETE /jobs/{id}");
  {
    const j = await mkJob(E1, { jobTitle: "G-01" });
    const before = (await J("GET", "/employer/jobs?limit=1", E1.token)).data.pagination.totalItems;
    const r = await J("DELETE", `/jobs/${j.jobId}`, E1.token);
    ck("G-01", r.status === 200 && sameSet(Object.keys(r.data), ["message"]) && r.data.message.normalize("NFC") === "Đã xóa tin tuyển dụng".normalize("NFC"), errStr(r));
    ck("G-01", !jobExists(j.jobId), "DB còn dòng");
    ck("G-01", isErr(await raw("GET", `/jobs/${j.jobId}`), 404, "JOB_NOT_FOUND") && isErr(await J("GET", `/employer/jobs/${j.jobId}`, E1.token), 404, "JOB_NOT_FOUND"), "GET sau xoá");
    ck("G-01", isErr(await J("DELETE", `/jobs/${j.jobId}`, E1.token), 404, "JOB_NOT_FOUND"), "DELETE lần 2");
    ck("G-01", (await J("GET", "/employer/jobs?limit=1", E1.token)).data.pagination.totalItems === before - 1, "totalItems không giảm");

    // G-02 cascade
    const X = await mkJob(E1, { jobTitle: "G-02 X" });
    const Y = await mkJob(E1, { jobTitle: "G-02 Y" });
    addApp(F1, X.jobId); addApp(F2, X.jobId); addApp(F1, Y.jobId);
    ck("G-02", appCount(X.jobId) === 2 && appCount(Y.jobId) === 1, "dữ liệu chuẩn bị");
    const rx = await J("DELETE", `/jobs/${X.jobId}`, E1.token);
    ck("G-02", rx.status === 200, errStr(rx));
    ck("G-02", appCount(X.jobId) === 0, `Application của X còn ${appCount(X.jobId)}`);
    ck("G-02", appCount(Y.jobId) === 1 && jobExists(Y.jobId), "Application/Job Y bị ảnh hưởng");
    ck("G-02", sqlInt(`SELECT COUNT(*) FROM finderprofile WHERE userId IN ('${F1.id}','${F2.id}')`) === 2 && (await J("GET", "/finders/me", F1.token)).status === 200, "finderprofile bị mất");
    ck("G-02", sqlInt(`SELECT COUNT(*) FROM employerprofile WHERE userId='${E1.id}'`) === 1, "employerprofile bị mất");

    // G-03
    const c = await mkJob(E1, { jobTitle: "G-03 closed" });
    await J("PATCH", `/jobs/${c.jobId}/status`, E1.token, { status: "Closed" });
    addApp(F1, c.jobId);
    const ex = await mkJob(E1, { jobTitle: "G-03 expired" });
    setDeadline(ex.jobId, addDays(TODAY, -1));
    addApp(F2, ex.jobId);
    ck("G-03", (await J("DELETE", `/jobs/${c.jobId}`, E1.token)).status === 200 && appCount(c.jobId) === 0 && !jobExists(c.jobId), "Closed + app");
    ck("G-03", (await J("DELETE", `/jobs/${ex.jobId}`, E1.token)).status === 200 && appCount(ex.jobId) === 0 && !jobExists(ex.jobId), "Expired + app");

    // G-04
    const k = await mkJob(E1, { jobTitle: "G-04" });
    addApp(F1, k.jobId);
    ck("G-04", isErr(await J("DELETE", `/jobs/${k.jobId}`, E2.token), 403, "NOT_JOB_OWNER") && jobExists(k.jobId) && appCount(k.jobId) === 1, "E2 xoá Job E1");
    // G-05
    setVerified(E1, 0);
    const r5 = await J("DELETE", `/jobs/${k.jobId}`, E1.token);
    setVerified(E1, 1);
    ck("G-05", isErr(r5, 403, "EMPLOYER_NOT_VERIFIED") && jobExists(k.jobId) && appCount(k.jobId) === 1, errStr(r5));
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
