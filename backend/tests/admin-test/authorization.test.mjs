// Quyền truy cập 3 API admin (401 / 403 FORBIDDEN_ROLE) + admin không dùng được API Employer
// Chạy riêng: node backend/tests/admin-test/authorization.test.mjs   (chạy tất cả: node backend/tests/admin-test/run.mjs)
import { J, adminVerify, ck, errStr, isErr, isMain, makeEmployerSafe, mkJob, profileDb, raw, runAdminSuites, sharedAdmin, snap, validJob } from "./lib.mjs";

export const name = "A: Quyền truy cập API admin";

export default async function run(ctx) {
  const adm = await sharedAdmin(ctx);
  const { E1, F1 } = ctx.U;
  const target = await makeEmployerSafe("A_tgt", true); // employer thật làm đích: verify/unverify trái phép không được đổi gì
  await adminVerify(adm, target.id);

  const calls = [
    ["GET", "/admin/employers", undefined],
    ["PATCH", `/admin/employers/${target.id}/verify`, undefined],
    ["PATCH", `/admin/employers/${target.id}/unverify`, { reason: "trái phép" }],
  ];

  console.log("\n── A-01: không token / token rác -> 401 UNAUTHENTICATED");
  for (const [m, p, b] of calls) {
    const r = await J(m, p, null, b);
    ck("A-01", isErr(r, 401, "UNAUTHENTICATED"), `${m} ${p} -> ${errStr(r)}`);
    const bad = await J(m, p, "abc.def.ghi", b);
    ck("A-01", isErr(bad, 401, "UNAUTHENTICATED"), `${m} ${p} token rác -> ${errStr(bad)}`);
  }

  console.log("\n── A-02: Finder / Employer -> 403 FORBIDDEN_ROLE");
  for (const [label, who] of [["finder", F1], ["employer", E1], ["employer đích", target]]) {
    for (const [m, p, b] of calls) {
      const r = await J(m, p, who.token, b);
      ck("A-02", isErr(r, 403, "FORBIDDEN_ROLE"), `${label} ${m} ${p} -> ${errStr(r)}`);
    }
  }
  const [v, reason] = profileDb(target.id);
  ck("A-02", v === "1" && reason === "<NULL>", `request trái phép không được đổi DB: isVerified=${v} reason=${reason}`);

  console.log("\n── A-03: token admin không dùng được API Employer");
  const jobs = await J("GET", "/employer/jobs", adm.token);
  ck("A-03", isErr(jobs, 403, "FORBIDDEN_ROLE"), errStr(jobs));
  const post = await J("POST", "/jobs", adm.token, validJob({ jobTitle: "admin tạo job" }));
  ck("A-03", isErr(post, 403, "FORBIDDEN_ROLE"), errStr(post));
  // admin gọi sửa / đổi trạng thái / xóa job thật của employer verified -> 403 và DB không đổi
  const job = await mkJob(target, { jobTitle: "A-03 job thật" });
  const before = snap(job.jobId);
  for (const [m, p, b] of [["PUT", `/jobs/${job.jobId}`, validJob()], ["PATCH", `/jobs/${job.jobId}/status`, { status: "Closed" }], ["DELETE", `/jobs/${job.jobId}`, undefined]]) {
    const r = await J(m, p, adm.token, b);
    ck("A-03", isErr(r, 403, "FORBIDDEN_ROLE"), `admin ${m} ${p} -> ${errStr(r)}`);
  }
  ck("A-03", before !== "" && snap(job.jobId) === before, "job không đổi sau 3 request của admin");
  const me = await J("GET", "/employer/me", adm.token);
  ck("A-03", me.status === 403, `GET /employer/me bằng token admin -> ${errStr(me)}`);
  const own = await raw("GET", "/admin/employers?limit=1", { headers: { Authorization: `Bearer ${adm.token}` } });
  ck("A-03", own.status === 200, `token admin vào được API admin: ${errStr(own)}`);
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
