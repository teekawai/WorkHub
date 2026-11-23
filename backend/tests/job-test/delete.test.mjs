// G: DELETE /api/jobs/:id — Xóa Job chưa có đơn; Job có đơn -> 409 JOB_HAS_APPLICATIONS (Application Business 5)
// Chạy riêng: node backend/tests/job-test/delete.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  J, TODAY, addApp, addDays, appCount, ck, errStr, isErr, isMain, jobExists, mkJob, raw, runSuites, sameSet, setDeadline, setVerified, sql, sqlInt, validJob,
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

    // G-02: xóa Job không đơn X không ảnh hưởng Job Y (cùng Employer) có đơn, finderprofile, employerprofile
    const X = await mkJob(E1, { jobTitle: "G-02 X" });
    const Y = await mkJob(E1, { jobTitle: "G-02 Y" });
    addApp(F1, Y.jobId); addApp(F2, Y.jobId);
    ck("G-02", appCount(X.jobId) === 0 && appCount(Y.jobId) === 2, "dữ liệu chuẩn bị");
    const rx = await J("DELETE", `/jobs/${X.jobId}`, E1.token);
    ck("G-02", rx.status === 200 && !jobExists(X.jobId), errStr(rx));
    ck("G-02", appCount(Y.jobId) === 2 && jobExists(Y.jobId), "Application/Job Y bị ảnh hưởng");
    ck("G-02", sqlInt(`SELECT COUNT(*) FROM finderprofile WHERE userId IN ('${F1.id}','${F2.id}')`) === 2 && (await J("GET", "/finders/me", F1.token)).status === 200, "finderprofile bị mất");
    ck("G-02", sqlInt(`SELECT COUNT(*) FROM employerprofile WHERE userId='${E1.id}'`) === 1, "employerprofile bị mất");

    // G-03: Closed / hết hạn nhưng không có đơn vẫn xóa được
    const c = await mkJob(E1, { jobTitle: "G-03 closed" });
    await J("PATCH", `/jobs/${c.jobId}/status`, E1.token, { status: "Closed" });
    const ex = await mkJob(E1, { jobTitle: "G-03 expired" });
    setDeadline(ex.jobId, addDays(TODAY, -1));
    ck("G-03", (await J("DELETE", `/jobs/${c.jobId}`, E1.token)).status === 200 && !jobExists(c.jobId), "Closed không đơn");
    ck("G-03", (await J("DELETE", `/jobs/${ex.jobId}`, E1.token)).status === 200 && !jobExists(ex.jobId), "Expired không đơn");

    // G-04
    const k = await mkJob(E1, { jobTitle: "G-04" });
    addApp(F1, k.jobId);
    ck("G-04", isErr(await J("DELETE", `/jobs/${k.jobId}`, E2.token), 403, "NOT_JOB_OWNER") && jobExists(k.jobId) && appCount(k.jobId) === 1, "E2 xoá Job E1");
    // G-05
    setVerified(E1, 0);
    const r5 = await J("DELETE", `/jobs/${k.jobId}`, E1.token);
    setVerified(E1, 1);
    ck("G-05", isErr(r5, 403, "EMPLOYER_NOT_VERIFIED") && jobExists(k.jobId) && appCount(k.jobId) === 1, errStr(r5));

    // G-06: Job Open có đơn -> 409, không xóa gì
    const m6 = "Tin tuyển dụng đã có đơn ứng tuyển nên không thể xóa. Bạn có thể đóng tin";
    const h = await mkJob(E1, { jobTitle: "G-06" });
    addApp(F1, h.jobId); addApp(F2, h.jobId, "Accepted");
    for (let i = 0; i < 2; i++) {
      const r6 = await J("DELETE", `/jobs/${h.jobId}`, E1.token);
      ck("G-06", isErr(r6, 409, "JOB_HAS_APPLICATIONS") && r6.data.message?.normalize("NFC") === m6.normalize("NFC"), `lần ${i + 1}: ${errStr(r6)}`);
    }
    ck("G-06", jobExists(h.jobId) && appCount(h.jobId) === 2 && (await J("GET", `/employer/jobs/${h.jobId}`, E1.token)).data?.applicationCount === 2, "Job/đơn bị đổi sau 409");

    // G-07: mọi trạng thái Job x mọi trạng thái đơn -> 409, Job + đơn còn nguyên
    for (const jobSt of ["Open", "Closed", "Expired"]) {
      for (const appSt of ["Pending", "Accepted", "Rejected"]) {
        const t = `G-07 ${jobSt}/${appSt}`;
        const jx = await mkJob(E1, { jobTitle: t });
        addApp(F1, jx.jobId, appSt);
        if (jobSt === "Closed") await J("PATCH", `/jobs/${jx.jobId}/status`, E1.token, { status: "Closed" });
        if (jobSt === "Expired") setDeadline(jx.jobId, addDays(TODAY, -1));
        const r7 = await J("DELETE", `/jobs/${jx.jobId}`, E1.token);
        ck("G-07", isErr(r7, 409, "JOB_HAS_APPLICATIONS") && jobExists(jx.jobId) && appCount(jx.jobId) === 1, `${t}: ${errStr(r7)}`);
      }
    }

    // G-08: Job có đơn -> đóng tin được (200) nhưng vẫn không xóa được
    const g8 = await mkJob(E1, { jobTitle: "G-08" });
    addApp(F1, g8.jobId);
    const q8 = await J("PATCH", `/jobs/${g8.jobId}/status`, E1.token, { status: "Closed" });
    ck("G-08", q8.status === 200 && isErr(await J("DELETE", `/jobs/${g8.jobId}`, E1.token), 409, "JOB_HAS_APPLICATIONS") && jobExists(g8.jobId) && appCount(g8.jobId) === 1, errStr(q8));

    // G-09: Job Open còn hạn đã có đơn vẫn sửa được (Business 5), đơn không đổi; sau đó vẫn không xóa được
    const g9 = await mkJob(E1, { jobTitle: "G-09" });
    addApp(F1, g9.jobId); addApp(F2, g9.jobId, "Accepted");
    const stBefore = sql(`SELECT finderId,status FROM application WHERE jobId='${g9.jobId}' ORDER BY finderId`);
    const p9 = await J("PUT", `/jobs/${g9.jobId}`, E1.token, validJob({ jobTitle: "G-09 đã sửa", salaryMin: 15000000, salaryMax: 25000000 }));
    ck("G-09", p9.status === 200 && p9.data.jobTitle === "G-09 đã sửa", errStr(p9));
    const d9 = await J("GET", `/employer/jobs/${g9.jobId}`, E1.token);
    ck("G-09", d9.status === 200 && d9.data.jobTitle === "G-09 đã sửa" && d9.data.salaryMin === 15000000 && d9.data.salaryMax === 25000000 && d9.data.applicationCount === 2, errStr(d9).slice(0, 220));
    ck("G-09", appCount(g9.jobId) === 2 && sql(`SELECT finderId,status FROM application WHERE jobId='${g9.jobId}' ORDER BY finderId`) === stBefore, "đơn bị đổi sau PUT");
    ck("G-09", isErr(await J("DELETE", `/jobs/${g9.jobId}`, E1.token), 409, "JOB_HAS_APPLICATIONS") && jobExists(g9.jobId) && appCount(g9.jobId) === 2, "DELETE sau PUT");
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
