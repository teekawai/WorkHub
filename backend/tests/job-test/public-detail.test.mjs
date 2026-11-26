// D: GET /api/jobs/:id — Chi tiết Job công khai + thông tin công ty (Business 5.1, 5.4)
// Chạy riêng: node backend/tests/job-test/public-detail.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  PUBLIC_DETAIL_KEYS, J, TODAY, addDays, bigDesc, ck, errStr, isErr, isMain, mkJob, profileOf, raw, runSuites, sameSet, setDeadline, setVerified, sortedKeys,
} from "./lib.mjs";

export const name = "D: GET /api/jobs/:id";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── D: GET public ───────────────
  console.log("\n── D: GET /jobs/{id}");
  {
    const j = await mkJob(E1, { jobTitle: "D job" });
    const r = await raw("GET", `/jobs/${j.jobId}`);
    ck("D-01", r.status === 200 && sameSet(Object.keys(r.data), PUBLIC_DETAIL_KEYS), `keys=${r.data && sortedKeys(r.data)}`);
    ck("D-01", r.data.companyName === profileOf.E1.companyName && r.data.companyAddress === profileOf.E1.address && r.data.companyFoundedYear === 2015, "giá trị công ty");
    ck("D-01", r.data.companyDescription === bigDesc && r.data.companyDescription.length === 3000, `companyDescription length=${r.data.companyDescription?.length}`);
    ck("D-02", !/employerId|phone|taxCode|userId|passwordHash|token/i.test(Object.keys(r.data).join(",")), "lộ field nhạy cảm");

    // D-03
    const jc = await mkJob(E1, { jobTitle: "D closed" });
    await J("PATCH", `/jobs/${jc.jobId}/status`, E1.token, { status: "Closed" });
    const rc = await raw("GET", `/jobs/${jc.jobId}`);
    ck("D-03", rc.status === 200 && rc.data.status === "Closed", errStr(rc));
    const je = await mkJob(E1, { jobTitle: "D expired" });
    setDeadline(je.jobId, addDays(TODAY, -1));
    const re = await raw("GET", `/jobs/${je.jobId}`);
    ck("D-03", re.status === 200 && re.data.status === "Open" && re.data.deadline === addDays(TODAY, -1), errStr(re));

    // D-04 / D-05 / D-06 / D-07
    const nf = await raw("GET", `/jobs/00000000-0000-4000-8000-0000000000aa`);
    ck("D-04", isErr(nf, 404, "JOB_NOT_FOUND") && !("errors" in nf.data), errStr(nf));
    const u1 = await raw("GET", `/jobs/${jobE3.jobId}`);
    const u2 = await raw("GET", `/jobs/${jobE3c.jobId}`);
    const u3 = await J("GET", `/jobs/${jobE3.jobId}`, E3.token);
    for (const x of [u1, u2, u3]) ck("D-05", isErr(x, 404, "JOB_NOT_FOUND") && JSON.stringify(x.data) === JSON.stringify(nf.data), `body khác 404 thường: ${errStr(x)}`);
    setVerified(E3, 1);
    const v1 = await raw("GET", `/jobs/${jobE3.jobId}`);
    setVerified(E3, 0);
    const v2 = await raw("GET", `/jobs/${jobE3.jobId}`);
    ck("D-06", v1.status === 200 && v2.status === 404, `${v1.status} -> ${v2.status}`);
    const jd = await mkJob(E1, { jobTitle: "D delete" });
    await J("DELETE", `/jobs/${jd.jobId}`, E1.token);
    ck("D-07", isErr(await raw("GET", `/jobs/${jd.jobId}`), 404, "JOB_NOT_FOUND"), "sau DELETE");
    // D-08 profile không description/foundedYear (E2: cập nhật profile rỗng 2 trường)
    setVerified(E2, 0);
    const up = await J("PUT", "/employer/me", E2.token, { ...profileOf.E2, description: null, foundedYear: null });
    setVerified(E2, 1);
    const j2 = await mkJob(E2, { jobTitle: "D-08" });
    const r8 = await raw("GET", `/jobs/${j2.jobId}`);
    ck("D-08", up.status === 200 && r8.status === 200 && (r8.data.companyDescription ?? null) === null && (r8.data.companyFoundedYear ?? null) === null, `${up.status} ${errStr(r8)}`);
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
