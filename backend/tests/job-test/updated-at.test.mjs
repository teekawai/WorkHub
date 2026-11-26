// UA: updatedAt của Job — Nhóm service: JobService set khi tạo / PUT, đóng tin không đổi, chỉ lộ ở 2 API Employer (Application Business 5.1)
// Chạy riêng: node backend/tests/job-test/updated-at.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
// UA-09 (auto-close không đổi updatedAt) nằm ở auto-close.test.mjs vì dùng BE phụ cổng 5166.
import {
  J, PUBLIC_DETAIL_KEYS, RESP_KEYS, TODAY, TS, addDays, ck, errStr, isErr, isMain, makeEmployer, mkJob, raw, runSuites, sameSet, setDeadline, sleep, sql, sqlInt, validJob,
} from "./lib.mjs";
import { adminUnverify, sharedAdmin } from "../admin-test/lib.mjs";

export const name = "UA: updatedAt của Job";

const ISO_Z = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/; // UTC, không có phần lẻ giây
const dbTimes = (id) => sql(`SELECT DATE_FORMAT(createdAt,'%Y-%m-%dT%H:%i:%sZ'), DATE_FORMAT(updatedAt,'%Y-%m-%dT%H:%i:%sZ') FROM job WHERE jobId='${id}'`).split("\t");
const dbUpdated = (id) => dbTimes(id)[1];

export default async function run(ctx) {
  const { F1 } = ctx.U;
  const adm = await sharedAdmin(ctx);
  const E = await makeEmployer("UA1"), E2 = await makeEmployer("UA2"), E3 = await makeEmployer("UA3");
  const T = `UA${TS}`;

  // ── Tạo hết Job cần dùng trước, chờ 1 lần > 1s, rồi mới tác động: nếu code lỡ đổi updatedAt thành "giờ hiện tại" thì sẽ lệch createdAt
  console.log("\n── UA-01..03: tạo Job, updatedAt = createdAt, chỉ lộ ở API Employer");
  const a = await mkJob(E, { jobTitle: `${T} A sửa` });
  const bv = await mkJob(E, { jobTitle: `${T} B validate` });
  const bc = await mkJob(E, { jobTitle: `${T} B closed` });
  await J("PATCH", `/jobs/${bc.jobId}/status`, E.token, { status: "Closed" });
  const bx = await mkJob(E, { jobTitle: `${T} B expired` });
  setDeadline(bx.jobId, addDays(TODAY, -1));
  const c = await mkJob(E, { jobTitle: `${T} C đóng` });
  const d1 = await mkJob(E3, { jobTitle: `${T} D1 unverify` });
  const d2 = await mkJob(E3, { jobTitle: `${T} D2 unverify hết hạn` });
  setDeadline(d2.jobId, addDays(TODAY, -2));
  const all = [a, bv, bc, bx, c, d1, d2];

  // UA-01: response POST không có updatedAt
  ck("UA-01", all.every((j) => sameSet(Object.keys(j), RESP_KEYS)), `POST có field lạ: ${Object.keys(a)}`);
  // UA-02 / UA-03: list + detail có updatedAt dạng ...Z, == createdAt khi mới tạo, == DB
  const l0 = await J("GET", `/employer/jobs?keyword=${encodeURIComponent(T)}`, E.token);
  for (const j of [a, bv, bc, bx, c]) {
    const it = l0.data?.items?.find((x) => x.jobId === j.jobId);
    const det = await J("GET", `/employer/jobs/${j.jobId}`, E.token);
    const [dbC, dbU] = dbTimes(j.jobId);
    ck("UA-02", it && ISO_Z.test(it.updatedAt) && det.status === 200 && ISO_Z.test(det.data.updatedAt), `list=${it?.updatedAt} detail=${det.data?.updatedAt}`);
    ck("UA-03", it?.updatedAt === j.createdAt && det.data?.updatedAt === j.createdAt && dbU === dbC && dbU === j.createdAt, `createdAt=${j.createdAt} list=${it?.updatedAt} detail=${det.data?.updatedAt} db=${dbU}`);
  }

  await sleep(1100);

  // ── UA-04/05: PUT thành công
  console.log("\n── UA-04/05: PUT thành công đổi updatedAt");
  {
    const tB = Date.now();
    const r = await J("PUT", `/jobs/${a.jobId}`, E.token, validJob({ jobTitle: `${T} A đã sửa` }));
    const tA = Date.now();
    ck("UA-05", r.status === 200 && sameSet(Object.keys(r.data), RESP_KEYS), errStr(r).slice(0, 200));
    const det = await J("GET", `/employer/jobs/${a.jobId}`, E.token);
    const lst = await J("GET", `/employer/jobs?keyword=${encodeURIComponent(`${T} A đã sửa`)}`, E.token);
    const li = lst.data?.items?.find((x) => x.jobId === a.jobId);
    const u = det.data?.updatedAt;
    const ms = Date.parse(u);
    ck("UA-04", ISO_Z.test(u) && ms > Date.parse(a.createdAt), `updatedAt=${u} phải > createdAt=${a.createdAt}`);
    ck("UA-04", det.data?.createdAt === a.createdAt && li?.createdAt === a.createdAt, `createdAt bị đổi: ${det.data?.createdAt}`);
    ck("UA-04", li?.updatedAt === u && dbUpdated(a.jobId) === u, `list=${li?.updatedAt} detail=${u} db=${dbUpdated(a.jobId)}`);
    ck("UA-04", ms <= tA && ms >= Math.floor(tB / 1000) * 1000 - 1000, `updatedAt=${u} ngoài khoảng gọi PUT ${new Date(tB).toISOString()}..${new Date(tA).toISOString()}`);
  }

  // ── UA-06: PUT bị chặn không đổi updatedAt
  console.log("\n── UA-06: PUT bị chặn không đổi updatedAt");
  {
    const before = { bv: dbUpdated(bv.jobId), bc: dbUpdated(bc.jobId), bx: dbUpdated(bx.jobId) };
    const r400 = await J("PUT", `/jobs/${bv.jobId}`, E.token, validJob({ jobTitle: "" }));
    const r403 = await J("PUT", `/jobs/${bv.jobId}`, E2.token, validJob({ jobTitle: `${T} người khác` }));
    const r404 = await J("PUT", `/jobs/00000000-0000-4000-8000-0000000000cc`, E.token, validJob());
    const r409c = await J("PUT", `/jobs/${bc.jobId}`, E.token, validJob({ jobTitle: `${T} sửa closed` }));
    const r409x = await J("PUT", `/jobs/${bx.jobId}`, E.token, validJob({ jobTitle: `${T} sửa hết hạn` }));
    ck("UA-06", isErr(r400, 400, "VALIDATION_ERROR") && isErr(r403, 403, "NOT_JOB_OWNER") && isErr(r404, 404, "JOB_NOT_FOUND") && isErr(r409c, 409, "JOB_NOT_EDITABLE") && isErr(r409x, 409, "JOB_NOT_EDITABLE"),
      `${r400.status}/${r403.status}/${r404.status}/${r409c.status}/${r409x.status}`);
    const after = { bv: dbUpdated(bv.jobId), bc: dbUpdated(bc.jobId), bx: dbUpdated(bx.jobId) };
    ck("UA-06", JSON.stringify(before) === JSON.stringify(after) && before.bv === bv.createdAt && before.bc === bc.createdAt && before.bx === bx.createdAt, `trước=${JSON.stringify(before)} sau=${JSON.stringify(after)}`);
    const det = await J("GET", `/employer/jobs/${bv.jobId}`, E.token);
    ck("UA-06", det.data?.updatedAt === bv.createdAt, `detail updatedAt=${det.data?.updatedAt}`);
  }

  // ── UA-07: PATCH đóng không đổi updatedAt
  console.log("\n── UA-07: PATCH Closed không đổi updatedAt");
  {
    const r = await J("PATCH", `/jobs/${c.jobId}/status`, E.token, { status: "Closed" });
    ck("UA-07", r.status === 200 && r.data.status === "Closed" && sameSet(Object.keys(r.data), RESP_KEYS), errStr(r).slice(0, 200));
    const det = await J("GET", `/employer/jobs/${c.jobId}`, E.token);
    ck("UA-07", det.data?.status === "Closed" && det.data?.updatedAt === c.createdAt && dbUpdated(c.jobId) === c.createdAt, `updatedAt sau đóng: detail=${det.data?.updatedAt} db=${dbUpdated(c.jobId)} createdAt=${c.createdAt}`);
  }

  // ── UA-08: admin thu hồi xác minh (ExecuteUpdate) đóng Job nhưng không đổi updatedAt
  console.log("\n── UA-08: unverify đóng Job không đổi updatedAt");
  {
    const r = await adminUnverify(adm, E3.id, { reason: "QA kiểm updatedAt" });
    ck("UA-08", r.status === 200 && r.data?.closedJobCount === 2, `unverify: ${errStr(r)}`);
    const sts = [d1, d2].map((j) => sql(`SELECT status FROM job WHERE jobId='${j.jobId}'`));
    ck("UA-08", sts.every((s) => s === "Closed"), `status sau unverify: ${sts}`);
    for (const j of [d1, d2]) {
      const det = await J("GET", `/employer/jobs/${j.jobId}`, E3.token);
      ck("UA-08", det.status === 200 && det.data.updatedAt === j.createdAt && dbUpdated(j.jobId) === j.createdAt, `updatedAt sau unverify: detail=${det.data?.updatedAt} db=${dbUpdated(j.jobId)} createdAt=${j.createdAt}`);
    }
  }

  // ── UA-10: API công khai không có updatedAt
  console.log("\n── UA-10: API công khai không có updatedAt");
  {
    const pub = await raw("GET", `/jobs/${a.jobId}`);
    const pubF = await raw("GET", `/jobs/${a.jobId}`, { headers: { Authorization: `Bearer ${F1.token}` } });
    for (const [who, p] of [["ẩn danh", pub], ["Finder", pubF]])
      ck("UA-10", p.status === 200 && !("updatedAt" in p.data) && Object.keys(p.data).every((k) => PUBLIC_DETAIL_KEYS.includes(k)), `${who}: ${errStr(p).slice(0, 200)}`);
    // search giới hạn 60 req/phút/IP: dính 429 thì chờ theo Retry-After
    let s;
    for (let i = 0; i < 3; i++) {
      s = await raw("GET", `/jobs?keyword=${encodeURIComponent(`${T} A đã sửa`)}`);
      if (s.status !== 429) break;
      await sleep((Number(s.headers.get("retry-after")) || 60) * 1000 + 1000);
    }
    const it = s.data?.items?.find((x) => x.jobId === a.jobId);
    ck("UA-10", s.status === 200 && it && !("updatedAt" in it), `search: ${errStr(s).slice(0, 200)}`);
  }

  // ── UA-11: schema + dữ liệu thật (kết nối MySQL của lib.mjs)
  console.log("\n── UA-11: schema cột job.updatedAt + dữ liệu");
  {
    const col = sql(`SELECT IS_NULLABLE, IFNULL(COLUMN_DEFAULT,'<NULL>'), DATA_TYPE, IFNULL(EXTRA,'') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='job' AND COLUMN_NAME='updatedAt'`).split("\t");
    ck("UA-11", col[0] === "NO" && col[1] === "<NULL>" && col[2] === "datetime" && (col[3] ?? "") === "", `cột updatedAt: ${JSON.stringify(col)} (mong NO / <NULL> / datetime / EXTRA rỗng)`);
    ck("UA-11", sqlInt(`SELECT COUNT(*) FROM job WHERE updatedAt < createdAt`) === 0, "có Job updatedAt < createdAt");
    ck("UA-11", sqlInt(`SELECT COUNT(*) FROM job WHERE updatedAt < '2000-01-01'`) === 0, "có Job updatedAt kiểu 0001-01-01");
    ck("UA-11", sqlInt(`SELECT COUNT(*) FROM __EFMigrationsHistory WHERE MigrationId LIKE '%AddJobUpdatedAt'`) === 1, "migration AddJobUpdatedAt chưa ghi nhận");
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
