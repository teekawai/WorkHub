// H: GET /api/employer/jobs — Danh sách Job của Employer + phân trang (Business 5.2, 6.7; applicationCount: Application Business 5)
// Chạy riêng: node backend/tests/job-test/employer-list.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  EMPLOYER_LIST_KEYS, J, RESP_KEYS, TODAY, addApp, addDays, ck, errStr, isErr, isMain, makeEmployer, mkJob, note, runSuites, sameSet, setDeadline, sortedKeys, sql, sqlCol,
} from "./lib.mjs";

export const name = "H: GET /api/employer/jobs";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // Employer riêng của nhóm: E6 có 3 Job, E5 có 35 Job, E7 không có Job
  const E5 = await makeEmployer("E5"), E6 = await makeEmployer("E6"), E7 = await makeEmployer("E7");
  // ─────────────── H: list ───────────────
  console.log("\n── H: GET /employer/jobs");
  {
    // H1: E6 có 3 job, E2 có job riêng
    const o = await mkJob(E6, { jobTitle: "H open" });
    const c = await mkJob(E6, { jobTitle: "H closed" });
    await J("PATCH", `/jobs/${c.jobId}/status`, E6.token, { status: "Closed" });
    const e = await mkJob(E6, { jobTitle: "H expired" });
    setDeadline(e.jobId, addDays(TODAY, -3));
    const r = await J("GET", "/employer/jobs", E6.token);
    ck("H1-01", r.status === 200 && sameSet(r.data.items.map((x) => x.jobId), [o.jobId, c.jobId, e.jobId]), errStr(r));
    ck("H1-01", r.data.items.find((x) => x.jobId === e.jobId)?.status === "Open", "expired phải vẫn Open");
    ck("H1-02", r.data.items.every((x) => sameSet(Object.keys(x), EMPLOYER_LIST_KEYS)), `item keys=${sortedKeys(r.data.items[0] || {})}`);
    ck("H1-03", sameSet(Object.keys(r.data), ["items", "pagination"]) && sameSet(Object.keys(r.data.pagination), ["totalItems", "totalPages", "currentPage", "limit"]) && r.data.pagination.currentPage === 1 && r.data.pagination.limit === 30, JSON.stringify(r.data.pagination));
    // list item ~ detail
    const dd = await J("GET", `/employer/jobs/${o.jobId}`, E6.token);
    const it = r.data.items.find((x) => x.jobId === o.jobId);
    ck("H1-02", dd.status === 200 && RESP_KEYS.every((k) => JSON.stringify(dd.data[k]) === JSON.stringify(it[k])), "list item lệch detail");

    // H5: applicationCount (Application Business 5) — Job 0 đơn phải ra 0 (key vẫn có), đếm mọi trạng thái đơn và mọi trạng thái Job
    ck("H5-01", r.data.items.every((x) => Number.isInteger(x.applicationCount) && x.applicationCount === 0), `trước khi có đơn: ${r.data.items.map((x) => x.applicationCount)}`);
    addApp(F1, c.jobId, "Accepted"); addApp(F2, c.jobId, "Rejected"); // Job Closed: 2 đơn đã xử lý
    addApp(F1, e.jobId); // Job hết hạn: 1 đơn Pending
    const r5 = await J("GET", "/employer/jobs", E6.token);
    const cnt = (id) => r5.data.items.find((x) => x.jobId === id)?.applicationCount;
    ck("H5-01", r5.status === 200 && cnt(o.jobId) === 0, `Job 0 đơn cùng trang Job có đơn: ${cnt(o.jobId)}`);
    ck("H5-02", cnt(c.jobId) === 2 && cnt(e.jobId) === 1, `Closed(Accepted+Rejected)=${cnt(c.jobId)}, expired(Pending)=${cnt(e.jobId)}`);
    ck("H5-02", r5.data.items.every((x) => sameSet(Object.keys(x), EMPLOYER_LIST_KEYS)), "keys item sau khi có đơn");
    for (const x of r5.data.items) {
      const dx = await J("GET", `/employer/jobs/${x.jobId}`, E6.token);
      ck("H5-04", dx.status === 200 && dx.data.applicationCount === x.applicationCount, `list=${x.applicationCount} detail=${dx.data?.applicationCount}`);
    }

    // H3: E5 có 35 job
    for (let n = 0; n < 35; n++) await mkJob(E5, { jobTitle: `H3 job ${n}` });
    sql(`SET @i=0; UPDATE job SET createdAt = DATE_SUB(UTC_TIMESTAMP(), INTERVAL (@i:=@i+1) MINUTE) WHERE employerId='${E5.id}' ORDER BY jobId`);
    const expectOrder = sqlCol(`SELECT jobId FROM job WHERE employerId='${E5.id}' ORDER BY createdAt DESC`);
    const p1 = await J("GET", "/employer/jobs", E5.token);
    ck("H3-01", p1.status === 200 && p1.data.items.length === 30 && JSON.stringify(p1.data.pagination) === JSON.stringify({ totalItems: 35, totalPages: 2, currentPage: 1, limit: 30 }), errStr(p1).slice(0, 200));
    ck("H2-01", JSON.stringify(p1.data.items.map((x) => x.jobId)) === JSON.stringify(expectOrder.slice(0, 30)), `thứ tự createdAt giảm dần sai: got=${p1.data.items.slice(0,5).map((x) => x.jobId.slice(0,4)).join(",")} exp=${expectOrder.slice(0,5).map((x) => x.slice(0,4)).join(",")} lenGot=${p1.data.items.length} lenExp=${expectOrder.length} firstDiff=${p1.data.items.findIndex((x, ix) => x.jobId !== expectOrder[ix])} gotDiff=${p1.data.items.map((x) => x.jobId.slice(0,4)+"@"+x.createdAt.slice(14,19)).join(",")}`);
    const p2 = await J("GET", "/employer/jobs?page=2", E5.token);
    ck("H3-02", p2.status === 200 && p2.data.items.length === 5 && p2.data.pagination.currentPage === 2, errStr(p2).slice(0, 200));
    ck("H3-08", JSON.stringify([...p1.data.items, ...p2.data.items].map((x) => x.jobId)) === JSON.stringify(expectOrder), "gộp trang không khớp");
    const p3 = await J("GET", "/employer/jobs?limit=10&page=4", E5.token);
    ck("H3-03", p3.status === 200 && p3.data.items.length === 5 && p3.data.pagination.totalPages === 4 && p3.data.pagination.limit === 10, errStr(p3).slice(0, 200));
    const p4 = await J("GET", "/employer/jobs?limit=100", E5.token);
    ck("H3-04", p4.status === 200 && p4.data.items.length === 30 && p4.data.pagination.limit === 30, errStr(p4).slice(0, 200));
    for (const [lim, n, tp] of [[31, 30, 2], [30, 30, 2], [1, 1, 35]]) {
      const x = await J("GET", `/employer/jobs?limit=${lim}`, E5.token);
      ck("H3-05", x.status === 200 && x.data.items.length === n && x.data.pagination.totalPages === tp && x.data.pagination.limit === Math.min(lim, 30), `limit=${lim} ${errStr(x).slice(0, 160)}`);
    }
    const p6 = await J("GET", "/employer/jobs?limit=30&page=3", E5.token);
    ck("H3-06", p6.status === 200 && p6.data.items.length === 0 && p6.data.pagination.totalPages === 2 && p6.data.pagination.currentPage === 3, errStr(p6).slice(0, 200));
    // H5-03: đếm đúng cho từng trang (Job có đơn ở trang 1 và trang 2), Job còn lại = 0
    addApp(F1, expectOrder[0]); addApp(F2, expectOrder[0]); addApp(F1, expectOrder[34]);
    const q1 = await J("GET", "/employer/jobs", E5.token), q2 = await J("GET", "/employer/jobs?page=2", E5.token);
    const all = [...q1.data.items, ...q2.data.items];
    ck("H5-03", all.length === 35 && all.every((x) => x.applicationCount === (x.jobId === expectOrder[0] ? 2 : x.jobId === expectOrder[34] ? 1 : 0)),
      `trang1[0]=${q1.data.items[0]?.applicationCount}, trang2[4]=${q2.data.items[4]?.applicationCount}, tổng đơn=${all.reduce((n, x) => n + x.applicationCount, 0)}`);
    const p7 = await J("GET", "/employer/jobs", E7.token);
    ck("H3-07", p7.status === 200 && p7.data.items.length === 0 && p7.data.pagination.totalItems === 0 && p7.data.pagination.totalPages === 0, errStr(p7));
    const p9 = await J("GET", "/employer/jobs?page=999999", E5.token);
    ck("H3-09", p9.status === 200 && p9.data.items?.length === 0, errStr(p9).slice(0, 200));
    for (const pg of [80000000, 2147483647]) {
      const x = await J("GET", `/employer/jobs?page=${pg}&limit=30`, E5.token);
      ck("H3-10", x.status === 200 && Array.isArray(x.data?.items) && x.data.items.length === 0, `page=${pg} -> ${errStr(x).slice(0, 200)}`);
    }
    // H4
    for (const q of ["page=0", "page=-1"]) {
      const x = await J("GET", `/employer/jobs?${q}`, E5.token);
      ck("H4-01", isErr(x, 400, "VALIDATION_ERROR") && x.data.errors?.page, `${q} -> ${errStr(x)}`);
    }
    for (const q of ["limit=0", "limit=-5"]) {
      const x = await J("GET", `/employer/jobs?${q}`, E5.token);
      ck("H4-02", isErr(x, 400, "VALIDATION_ERROR") && x.data.errors?.limit, `${q} -> ${errStr(x)}`);
    }
    for (const [q, k] of [["page=abc", "page"], ["limit=abc", "limit"], ["page=1.5", "page"]]) {
      const x = await J("GET", `/employer/jobs?${q}`, E5.token);
      ck("H4-03", isErr(x, 400, "VALIDATION_ERROR") && x.data.errors?.[k], `${q} -> ${errStr(x)}`);
      if (q === "page=abc") note("H4-05", `message lỗi binding: ${JSON.stringify(x.data)}`);
    }
    const x4 = await J("GET", "/employer/jobs?page=0&limit=0", E5.token);
    ck("H4-04", isErr(x4, 400, "VALIDATION_ERROR") && x4.data.errors?.page && x4.data.errors?.limit, errStr(x4));
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
