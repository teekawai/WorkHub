// A: Quyền truy cập (mọi API Job) — Theo chức năng: 401 / 403 role / profile / chưa xác minh / chủ sở hữu, 404 id lạ (Business 3)
// Chạy riêng: node backend/tests/job-test/authorization.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import crypto from "node:crypto";
import {
  API, J, addApp, appCount, ck, errStr, isErr, isMain, jobExists, jobStatusDb, mkJob, runSuites, setVerified, snap, validJob,
} from "./lib.mjs";

export const name = "A: Quyền truy cập (mọi API Job)";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── A: quyền ───────────────
  console.log("\n── A: quyền truy cập");
  {
    const fakeId = "00000000-0000-4000-8000-000000000000";
    const protectedEps = [
      ["POST", "/jobs", validJob()], ["PUT", `/jobs/${jobE1.jobId}`, validJob()], ["PATCH", `/jobs/${jobE1.jobId}/status`, { status: "Closed" }],
      ["DELETE", `/jobs/${jobE1.jobId}`], ["GET", "/employer/jobs"], ["GET", `/employer/jobs/${jobE1.jobId}`],
    ];
    for (const [m, p, b] of protectedEps) {
      const r = await J(m, p, null, b);
      ck("A-01", isErr(r, 401, "UNAUTHENTICATED") && r.data.message && !("errors" in r.data), `${m} ${p} -> ${errStr(r)}`);
    }
    // A-02 token rác + sai chữ ký
    const parts = E1.token.split(".");
    const forged = `${parts[0]}.${parts[1]}.${crypto.randomBytes(32).toString("base64url")}`;
    for (const t of ["abc.def.ghi", "garbage", forged]) {
      for (const [m, p, b] of [["GET", "/employer/jobs"], ["POST", "/jobs", validJob()]]) {
        const r = await J(m, p, t, b);
        ck("A-02", isErr(r, 401, "UNAUTHENTICATED"), `${m} ${p} token=${t.slice(0, 12)} -> ${errStr(r)}`);
      }
    }
    // A-03/A-04 Finder
    for (const [m, p, b] of [["POST", "/jobs", {}], ["PUT", `/jobs/${fakeId}`, {}], ["PATCH", `/jobs/${fakeId}/status`, {}], ["DELETE", `/jobs/${fakeId}`]]) {
      const r = await J(m, p, F1.token, b);
      ck("A-03", isErr(r, 403, "FORBIDDEN_ROLE"), `${m} ${p} -> ${errStr(r)}`);
    }
    for (const p of ["/employer/jobs", `/employer/jobs/${jobE1.jobId}`]) {
      const r = await J("GET", p, F1.token);
      ck("A-04", isErr(r, 403, "FORBIDDEN_ROLE"), `${p} -> ${errStr(r)}`);
    }
    // A-05/A-06 public
    for (const t of [null, F1.token, E1.token]) {
      const a = await J("GET", `/jobs/${jobE1.jobId}`, t);
      const o = await J("GET", "/jobs/options", t);
      ck("A-05", a.status === 200 && o.status === 200, `token=${!!t} ${a.status}/${o.status}`);
    }
    const r6a = await J("GET", `/jobs/${jobE1.jobId}`, "rac.rac.rac");
    const r6b = await J("GET", "/jobs/options", "rac.rac.rac");
    ck("A-06", r6a.status === 200 && r6b.status === 200, `${r6a.status}/${r6b.status} (suy ra U-09)`);
    // A-07 / A-08 / A-09 E4
    for (const [m, p, b] of [["POST", "/jobs", validJob()], ["PUT", `/jobs/${jobE1.jobId}`, validJob()], ["PATCH", `/jobs/${jobE1.jobId}/status`, { status: "Closed" }], ["DELETE", `/jobs/${jobE1.jobId}`]]) {
      const r = await J(m, p, E4.token, b);
      ck("A-07", isErr(r, 403, "EMPLOYER_PROFILE_NOT_FOUND") && r.data.message, `${m} ${p} -> ${errStr(r)}`);
    }
    const l4 = await J("GET", "/employer/jobs", E4.token);
    ck("A-08", l4.status === 200 && l4.data.items?.length === 0 && l4.data.pagination?.totalItems === 0, errStr(l4));
    ck("A-09", isErr(await J("GET", `/employer/jobs/${jobE1.jobId}`, E4.token), 403, "NOT_JOB_OWNER"), "E4 xem Job E1");
    ck("A-09", isErr(await J("GET", `/employer/jobs/${fakeId}`, E4.token), 404, "JOB_NOT_FOUND"), "E4 xem Job không tồn tại");
    // A-10 / A-11 E3
    const e3s = [
      ["POST", "/jobs", validJob()], ["PUT", `/jobs/${jobE3.jobId}`, validJob()], ["PUT", `/jobs/${fakeId}`, validJob()], ["PUT", `/jobs/${jobE1.jobId}`, validJob()],
      ["PUT", `/jobs/${jobE3.jobId}`, {}], ["POST", "/jobs", {}], ["PATCH", `/jobs/${jobE3.jobId}/status`, { status: "Closed" }], ["PATCH", `/jobs/${fakeId}/status`, { status: "Closed" }],
      ["DELETE", `/jobs/${jobE3.jobId}`], ["DELETE", `/jobs/${fakeId}`], ["DELETE", `/jobs/${jobE1.jobId}`],
    ];
    for (const [m, p, b] of e3s) {
      const r = await J(m, p, E3.token, b);
      ck("A-10", isErr(r, 403, "EMPLOYER_NOT_VERIFIED") && r.data.message, `${m} ${p} -> ${errStr(r)}`);
    }
    ck("A-10", jobExists(jobE3.jobId) && jobStatusDb(jobE3.jobId) === "Open", "Job E3 bị đổi/xoá khi chưa verify");
    const l3 = await J("GET", "/employer/jobs", E3.token);
    ck("A-11", l3.status === 200 && l3.data.items.some((x) => x.jobId === jobE3.jobId) && l3.data.items.some((x) => x.jobId === jobE3c.jobId), errStr(l3));
    const d3 = await J("GET", `/employer/jobs/${jobE3.jobId}`, E3.token);
    ck("A-11", d3.status === 200 && d3.data.jobId === jobE3.jobId, errStr(d3));

    // A-12 đổi verify trên cùng token
    setVerified(E1, 1);
    ck("A-12", (await J("POST", "/jobs", E1.token, validJob({ jobTitle: "A-12 a" }))).status === 201, "verified -> 201");
    setVerified(E1, 0);
    ck("A-12", isErr(await J("POST", "/jobs", E1.token, validJob()), 403, "EMPLOYER_NOT_VERIFIED"), "unverified -> 403");
    setVerified(E1, 1);
    ck("A-12", (await J("POST", "/jobs", E1.token, validJob({ jobTitle: "A-12 b" }))).status === 201, "verified lại -> 201");

    // A-13 E2 vs Job E1 (có application)
    const jx = await mkJob(E1, { jobTitle: "A-13 job" });
    addApp(F1, jx.jobId);
    addApp(F2, jx.jobId);
    const before = snap(jx.jobId);
    for (const [m, p, b] of [["PUT", `/jobs/${jx.jobId}`, validJob({ jobTitle: "hack" })], ["PATCH", `/jobs/${jx.jobId}/status`, { status: "Closed" }], ["DELETE", `/jobs/${jx.jobId}`], ["GET", `/employer/jobs/${jx.jobId}`]]) {
      const r = await J(m, p, E2.token, b);
      ck("A-13", isErr(r, 403, "NOT_JOB_OWNER"), `${m} ${p} -> ${errStr(r)}`);
    }
    ck("A-13", snap(jx.jobId) === before && appCount(jx.jobId) === 2, "Job/Application của E1 bị thay đổi");
    const l2 = await J("GET", "/employer/jobs?limit=30", E2.token);
    ck("A-13", l2.status === 200 && !l2.data.items.some((x) => x.jobId === jx.jobId), "list E2 chứa Job E1");

    // A-14 id không tồn tại
    const ids = [fakeId, "abc", "' OR 1=1 --", "x".repeat(500), "công-việc-ñ"];
    for (const id of ids) {
      const e = encodeURIComponent(id);
      for (const [m, p, b, t] of [["PUT", `/jobs/${e}`, validJob(), E1.token], ["PATCH", `/jobs/${e}/status`, { status: "Closed" }, E1.token], ["DELETE", `/jobs/${e}`, undefined, E1.token], ["GET", `/employer/jobs/${e}`, undefined, E1.token], ["GET", `/jobs/${e}`, undefined, null]]) {
        const r = await J(m, p, t, b);
        ck("A-14", isErr(r, 404, "JOB_NOT_FOUND"), `${m} ${p.slice(0, 40)} -> ${errStr(r)}`);
      }
    }
    // A-15 thứ tự kiểm
    ck("A-15", isErr(await J("PUT", `/jobs/${jx.jobId}`, E2.token, {}), 403, "NOT_JOB_OWNER"), "E2 PUT {} Job E1");
    const jc = await mkJob(E1, { jobTitle: "A-15 closed" });
    await J("PATCH", `/jobs/${jc.jobId}/status`, E1.token, { status: "Closed" });
    ck("A-15", isErr(await J("PUT", `/jobs/${jc.jobId}`, E1.token, {}), 409, "JOB_NOT_EDITABLE"), "E1 PUT {} Job Closed");
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
