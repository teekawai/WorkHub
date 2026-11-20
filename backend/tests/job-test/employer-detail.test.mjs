// I: GET /api/employer/jobs/:id — Chi tiết Job của chính Employer, không lọc Status/Deadline/IsVerified (Business 5.3)
// Chạy riêng: node backend/tests/job-test/employer-detail.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  DETAIL_KEYS, J, TODAY, addDays, ck, errStr, isErr, isMain, mkJob, profileOf, raw, runSuites, sameSet, setDeadline,
} from "./lib.mjs";

export const name = "I: GET /api/employer/jobs/:id";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── I: employer detail ───────────────
  console.log("\n── I: GET /employer/jobs/{id}");
  {
    const j = await mkJob(E1, { jobTitle: "I job" });
    const a = await J("GET", `/employer/jobs/${j.jobId}`, E1.token);
    const b = await raw("GET", `/jobs/${j.jobId}`);
    ck("I-01", a.status === 200 && sameSet(Object.keys(a.data), DETAIL_KEYS) && JSON.stringify(a.data) === JSON.stringify(b.data), `${errStr(a).slice(0, 200)}`);
    ck("I-03", !/employerId|phone|taxCode|userId/i.test(Object.keys(a.data).join(",")), "lộ field");
    const c = await mkJob(E1, { jobTitle: "I closed" });
    await J("PATCH", `/jobs/${c.jobId}/status`, E1.token, { status: "Closed" });
    const e = await mkJob(E1, { jobTitle: "I expired" });
    setDeadline(e.jobId, addDays(TODAY, -1));
    ck("I-02", (await J("GET", `/employer/jobs/${c.jobId}`, E1.token)).status === 200 && (await J("GET", `/employer/jobs/${e.jobId}`, E1.token)).status === 200, "Closed/expired");
    const u = await J("GET", `/employer/jobs/${jobE3c.jobId}`, E3.token);
    ck("I-02", u.status === 200 && u.data.status === "Closed", `E3 chưa verify: ${errStr(u)}`);
    ck("I-04", isErr(await J("GET", `/employer/jobs/${j.jobId}`, E2.token), 403, "NOT_JOB_OWNER") && isErr(await J("GET", `/employer/jobs/00000000-0000-4000-8000-0000000000bb`, E1.token), 404, "JOB_NOT_FOUND"), "403/404");
    const me = await J("GET", "/employer/me", E1.token);
    const mp = await J("PUT", "/employer/me", E1.token, profileOf.E1);
    ck("I-05", me.status === 200 && mp.status === 200, `GET me ${me.status}, PUT me ${mp.status}`);
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
