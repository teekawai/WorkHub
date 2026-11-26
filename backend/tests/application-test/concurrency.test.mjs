// AC: Nộp đơn đồng thời (MySQL thật) — 2 request song song, race với unverify / đóng / xóa Job (FOR SHARE employerprofile -> job + unique (finderId, jobId))
// Chạy riêng: node backend/tests/application-test/concurrency.test.mjs [--base=http://localhost:5166/api]
// Mỗi finder <= 5 request apply / phút. Số vòng mỗi case tối đa 4 (mỗi request qua pre-check đều upload Cloudinary thật; BE xóa file của request thua)
import {
  J, ROUNDS, appCount, apply, ck, cloudSummary, delayed, errStr, holdTx, isErr, isMain, jobExists, jobStatusDb, makeEmployerSafe, makeFinder, maxRounds, mkJob, note, runAdminSuites,
  setVerified, sleep, sqlAsync, sqlInt, tally, uid,
} from "./lib.mjs";

export const name = "AC: Nộp đơn đồng thời (MySQL thật)";

export default async function run() {
  console.log("\n── AC: concurrency");
  const R = maxRounds(ROUNDS);
  const bad500 = [];
  const chk500 = (tag, ...xs) => xs.forEach((x) => { if (x.status >= 500) bad500.push(`${tag}: ${x.status} ${x.text.slice(0, 160)}`); });
  const st = (x) => x.status + (x.data?.code ? ":" + x.data.code : "");
  const emp = await makeEmployerSafe("ACE1", true);

  // AC-01: 2 request song song, cùng finder + job, key khác -> đúng 1 x 201 + 1 x 409 ALREADY_APPLIED, DB 1 đơn
  {
    const dist = {};
    let F = null;
    for (let i = 0; i < R; i++) {
      if (i % 2 === 0) F = await makeFinder(`ACF1_${i}`); // 2 request / vòng -> 2 vòng / finder
      const job = await mkJob(emp, { jobTitle: `AC01 ${i}` });
      const res = await Promise.all([0, 1].map(() => delayed(Math.random() * 4, () => apply(F, job.jobId, { replay: true }))));
      chk500("AC-01", ...res);
      tally(dist, res.map(st).sort().join(" + "));
      ck("AC-01", res.filter((x) => x.status === 201).length === 1 && res.filter((x) => isErr(x, 409, "ALREADY_APPLIED")).length === 1 && appCount(job.jobId) === 1, `vòng ${i}: ${res.map(st)} DB=${appCount(job.jobId)}`);
    }
    note("AC-01", `phân bố: ${JSON.stringify(dist)}`);
  }

  // AC-02: cùng key song song -> 1 x 201 + (409 REQUEST_IN_PROGRESS | replay 201 y hệt), DB 1 đơn
  {
    const dist = {};
    const F = await makeFinder("ACF2");
    for (let i = 0; i < Math.min(R, 2); i++) {
      const job = await mkJob(emp, { jobTitle: `AC02 ${i}` });
      const key = uid();
      const res = await Promise.all([0, 1].map(() => delayed(Math.random() * 4, () => apply(F, job.jobId, { key, replay: true }))));
      chk500("AC-02", ...res);
      tally(dist, res.map(st).sort().join(" + "));
      const created = res.filter((x) => x.status === 201);
      ck("AC-02", created.length >= 1 && res.every((x) => x.status === 201 || isErr(x, 409, "REQUEST_IN_PROGRESS")) && new Set(created.map((x) => x.text)).size === 1 && appCount(job.jobId) === 1, `vòng ${i}: ${res.map(st)} DB=${appCount(job.jobId)}`);
    }
    note("AC-02", `phân bố: ${JSON.stringify(dist)}`);
  }

  // Giữ 1 transaction mysql chưa commit, gửi apply, đợi tới khi apply thật sự bị chặn ở FOR SHARE (innodb_trx LOCK WAIT), rồi commit / rollback
  async function raceWithHold(id, hold, f, finish) {
    const tx = await holdTx(hold);
    try {
      let done = false;
      const p = f().then((r) => { done = true; return r; });
      let blocked = false;
      for (let i = 0; i < 60 && !blocked && !done; i++) {
        blocked = parseInt(await sqlAsync("SELECT COUNT(*) FROM information_schema.innodb_trx WHERE trx_state='LOCK WAIT'"), 10) > 0 || (await sleep(500), false);
      }
      ck(id, blocked && !done, `apply không bị chặn ở FOR SHARE (blocked=${blocked}, done=${done})`);
      await (finish === "commit" ? tx.commit() : tx.rollback());
      const r = await p;
      chk500(id, r);
      return r;
    } finally { tx.kill(); }
  }

  // AC-03: race unverify. rollback -> 201; commit -> 404 JOB_NOT_FOUND, DB 0 đơn
  for (const finish of ["rollback", "commit"]) {
    const e = await makeEmployerSafe(`ACE3${finish[0]}`, true);
    const job = await mkJob(e, { jobTitle: `AC03 ${finish}` });
    const F = await makeFinder(`ACF3${finish[0]}`);
    const r = await raceWithHold("AC-03", `UPDATE employerprofile SET isVerified=0 WHERE userId='${e.id}'`, () => apply(F, job.jobId, { replay: true }), finish);
    if (finish === "rollback") ck("AC-03", r.status === 201 && appCount(job.jobId) === 1, `unverify rollback: ${errStr(r)} DB=${appCount(job.jobId)}`);
    else ck("AC-03", isErr(r, 404, "JOB_NOT_FOUND") && appCount(job.jobId) === 0, `unverify commit: ${errStr(r)} DB=${appCount(job.jobId)}`);
  }

  // AC-04: race đóng Job (UPDATE job status=Closed chưa commit) -> commit -> 409 JOB_NOT_OPEN, DB 0 đơn
  {
    const job = await mkJob(emp, { jobTitle: "AC04" });
    const F = await makeFinder("ACF4");
    const r = await raceWithHold("AC-04", `UPDATE job SET status='Closed' WHERE jobId='${job.jobId}'`, () => apply(F, job.jobId, { replay: true }), "commit");
    ck("AC-04", isErr(r, 409, "JOB_NOT_OPEN") && appCount(job.jobId) === 0 && jobStatusDb(job.jobId) === "Closed", `${errStr(r)} DB=${appCount(job.jobId)}`);
  }

  // AC-05: race xóa Job (DELETE chưa commit) -> commit -> 404 JOB_NOT_FOUND, không 500
  {
    const job = await mkJob(emp, { jobTitle: "AC05" });
    const F = await makeFinder("ACF5");
    const r = await raceWithHold("AC-05", `DELETE FROM job WHERE jobId='${job.jobId}'`, () => apply(F, job.jobId, { replay: true }), "commit");
    ck("AC-05", isErr(r, 404, "JOB_NOT_FOUND") && !jobExists(job.jobId) && sqlInt(`SELECT COUNT(*) FROM application WHERE jobId='${job.jobId}'`) === 0, `${errStr(r)} jobExists=${jobExists(job.jobId)}`);
  }

  // AC-06: apply || DELETE /jobs/{id} qua API. DELETE trễ ngẫu nhiên 0..1.2s để rơi vào lúc upload / ghi đơn.
  // Nhất quán: apply 201 <=> DELETE 409 JOB_HAS_APPLICATIONS + job còn + 1 đơn; apply 404 <=> DELETE 200 + job mất + 0 đơn
  {
    const dist = {};
    const F = await makeFinder("ACF6");
    for (let i = 0; i < R; i++) {
      const job = await mkJob(emp, { jobTitle: `AC06 ${i}` });
      const [a, d] = await Promise.all([apply(F, job.jobId, { replay: true }), delayed(Math.random() * 1200, () => J("DELETE", `/jobs/${job.jobId}`, emp.token))]);
      chk500("AC-06", a, d);
      tally(dist, `apply ${st(a)} / DELETE ${st(d)}`);
      const ok = (a.status === 201 && isErr(d, 409, "JOB_HAS_APPLICATIONS") && jobExists(job.jobId) && appCount(job.jobId) === 1)
        || (isErr(a, 404, "JOB_NOT_FOUND") && d.status === 200 && !jobExists(job.jobId) && appCount(job.jobId) === 0);
      ck("AC-06", ok, `vòng ${i}: apply ${errStr(a)} | DELETE ${errStr(d)} | job=${jobExists(job.jobId)} apps=${appCount(job.jobId)}`);
    }
    note("AC-06", `phân bố: ${JSON.stringify(dist)}`);
  }

  // AC-07: apply || PATCH Closed qua API. apply 201 (đơn có) hoặc 409 JOB_NOT_OPEN (không đơn); Job luôn Closed
  {
    const dist = {};
    const F = await makeFinder("ACF7");
    for (let i = 0; i < R; i++) {
      const job = await mkJob(emp, { jobTitle: `AC07 ${i}` });
      const [a, c] = await Promise.all([apply(F, job.jobId, { replay: true }), delayed(Math.random() * 1200, () => J("PATCH", `/jobs/${job.jobId}/status`, emp.token, { status: "Closed" }))]);
      chk500("AC-07", a, c);
      tally(dist, `apply ${st(a)} / PATCH ${st(c)}`);
      const ok = c.status === 200 && jobStatusDb(job.jobId) === "Closed"
        && ((a.status === 201 && appCount(job.jobId) === 1) || (isErr(a, 409, "JOB_NOT_OPEN") && appCount(job.jobId) === 0));
      ck("AC-07", ok, `vòng ${i}: apply ${errStr(a)} | PATCH ${errStr(c)} | status=${jobStatusDb(job.jobId)} apps=${appCount(job.jobId)}`);
    }
    note("AC-07", `phân bố: ${JSON.stringify(dist)}`);
  }

  ck("AC-500", bad500.length === 0, `có ${bad500.length} response >= 500: ${bad500.slice(0, 5).join(" | ")}`);
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }, cloudSummary]);
