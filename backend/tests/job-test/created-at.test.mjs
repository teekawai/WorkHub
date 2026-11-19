// CT: createdAt cắt về giây — Nhóm service: JobService set CreatedAt khi tạo (Business 1.6)
// Chạy riêng: node backend/tests/job-test/created-at.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  J, TS, ck, errStr, isMain, makeEmployer, raw, runSuites, sleep, sql, validJob,
} from "./lib.mjs";

export const name = "CT: createdAt cắt về giây";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // Employer riêng để đếm Job trong list chính xác
  const E7 = await makeEmployer("CT1");
  // ─────────────── CT: createdAt ───────────────
  console.log("\n── CT: createdAt cắt về giây");
  {
    const made = [];
    for (let i = 0; i < 25; i++) {
      await sleep(Math.random() * 1000);
      const tB = Date.now();
      const r = await J("POST", "/jobs", E7.token, validJob({ jobTitle: `CT ${i} ${TS}` }));
      const tA = Date.now();
      if (r.status !== 201) { ck("CT-01", false, errStr(r)); continue; }
      const c = r.data.createdAt;
      ck("CT-01", /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(c), `createdAt=${c}`);
      const ms = Date.parse(c);
      ck("CT-03", ms <= tA && ms >= Math.floor(tB / 1000) * 1000 - 1000, `createdAt=${c} tB=${new Date(tB).toISOString()} tA=${new Date(tA).toISOString()}`);
      const g1 = await raw("GET", `/jobs/${r.data.jobId}`);
      const g2 = await J("GET", `/employer/jobs/${r.data.jobId}`, E7.token);
      const db = sql(`SELECT DATE_FORMAT(createdAt,'%Y-%m-%dT%H:%i:%sZ') FROM job WHERE jobId='${r.data.jobId}'`);
      ck("CT-02", g1.data?.createdAt === c && g2.data?.createdAt === c && db === c, `POST=${c} public=${g1.data?.createdAt} owner=${g2.data?.createdAt} db=${db}`);
      made.push(r.data);
    }
    const lst = await J("GET", "/employer/jobs?limit=30", E7.token);
    ck("CT-02", made.length > 0 && made.every((m) => lst.data.items.find((x) => x.jobId === m.jobId)?.createdAt === m.createdAt), "createdAt trong list khác POST");
    // CT-05: PUT/PATCH không đổi createdAt
    if (made[0]) {
      const id = made[0].jobId;
      await J("PUT", `/jobs/${id}`, E7.token, validJob({ jobTitle: `CT sửa ${TS}` }));
      await J("PATCH", `/jobs/${id}/status`, E7.token, { status: "Closed" });
      const g = await J("GET", `/employer/jobs/${id}`, E7.token);
      ck("CT-05", g.data?.createdAt === made[0].createdAt, `${made[0].createdAt} -> ${g.data?.createdAt}`);
    }
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
