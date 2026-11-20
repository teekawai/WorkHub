// F: PATCH /api/jobs/:id/status — Đóng Job một chiều Open -> Closed (Business 2.4)
// Chạy riêng: node backend/tests/job-test/close.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  J, RESP_KEYS, TODAY, addDays, bearer, ck, errStr, isErr, isMain, jobStatusDb, mkJob, note, raw, runSuites, sameSet, setDeadline,
} from "./lib.mjs";

export const name = "F: PATCH /api/jobs/:id/status";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── F: PATCH status ───────────────
  console.log("\n── F: PATCH /jobs/{id}/status");
  {
    const j = await mkJob(E1, { jobTitle: "F base" });
    const r = await J("PATCH", `/jobs/${j.jobId}/status`, E1.token, { status: "Closed" });
    ck("F-01", r.status === 200 && r.data.status === "Closed" && sameSet(Object.keys(r.data), RESP_KEYS), errStr(r));
    // CT-06: createdAt cắt về giây ở BE nên response POST và response đọc từ DB phải giống hệt
    const { status: _s, ...a } = r.data; const { status: _t, ...b } = j;
    ck("CT-06", a.createdAt === b.createdAt, `createdAt POST=${b.createdAt} vs PATCH=${a.createdAt}`);
    ck("F-01", JSON.stringify(a) === JSON.stringify(b), `field khác status bị đổi: ${Object.keys(a).filter((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])).map((k) => k + ":" + JSON.stringify(b[k]) + "->" + JSON.stringify(a[k])).join(" ")}`);
    ck("F-01", jobStatusDb(j.jobId) === "Closed", "DB status");
    const pub = await raw("GET", `/jobs/${j.jobId}`);
    ck("F-01", pub.status === 200 && pub.data.status === "Closed", "public detail");
    const lst = await J("GET", "/employer/jobs?limit=30&page=1", E1.token);
    const all = [];
    for (let pg = 1; pg <= (lst.data.pagination?.totalPages || 1); pg++) all.push(...(await J("GET", `/employer/jobs?limit=30&page=${pg}`, E1.token)).data.items);
    ck("F-01", all.some((x) => x.jobId === j.jobId && x.status === "Closed"), "list không thấy Job Closed");
    // F-02
    ck("F-02", isErr(await J("PATCH", `/jobs/${j.jobId}/status`, E1.token, { status: "Closed" }), 409, "JOB_ALREADY_CLOSED"), "đóng lần 2");
    // F-03
    const jo = await mkJob(E1, { jobTitle: "F-03" });
    const raws = ['{"status":"Open"}', '{"status":"closed"}', '{"status":"CLOSED"}', '{"status":" Closed"}', '{"status":""}', '{"status":null}', "{}", '{"status":123}', "[]"];
    for (const b of raws) {
      const rr = await J("PATCH", `/jobs/${jo.jobId}/status`, E1.token, undefined, { rawBody: b, headers: { ...bearer(E1.token), "Content-Type": "application/json" } });
      ck("F-03", isErr(rr, 400, "VALIDATION_ERROR"), `body=${b} -> ${errStr(rr)}`);
    }
    ck("F-03", jobStatusDb(jo.jobId) === "Open", "Job Open bị đổi");
    const rOpen = await J("PATCH", `/jobs/${j.jobId}/status`, E1.token, { status: "Open" });
    ck("F-03", isErr(rOpen, 400, "VALIDATION_ERROR") && jobStatusDb(j.jobId) === "Closed", `Open vào Job Closed -> ${errStr(rOpen)}`);
    // F-04
    const je = await mkJob(E1, { jobTitle: "F-04" });
    setDeadline(je.jobId, addDays(TODAY, -2));
    const r4 = await J("PATCH", `/jobs/${je.jobId}/status`, E1.token, { status: "Closed" });
    ck("F-04", r4.status === 200 && jobStatusDb(je.jobId) === "Closed", errStr(r4));
    // F-05
    const jf = await mkJob(E1, { jobTitle: "F-05" });
    const n1 = await raw("PATCH", `/jobs/${jf.jobId}/status`, { headers: bearer(E1.token), probe: true });
    const n2 = await raw("PATCH", `/jobs/${jf.jobId}/status`, { rawBody: "{bad", headers: { ...bearer(E1.token), "Content-Type": "application/json" } });
    ck("F-05", n1.status === 400 || n1.status === 415, `không body -> ${errStr(n1)}`);
    if (n1.status === 415) note("F-05", `không body/không Content-Type -> 415 (không phải VALIDATION_ERROR): ${n1.text.slice(0, 120)}`);
    ck("F-05", isErr(n2, 400, "VALIDATION_ERROR"), `JSON hỏng -> ${errStr(n2)}`);
    // F-06
    const r6 = await J("PATCH", `/jobs/${jf.jobId}/status`, E1.token, { status: "Closed", jobTitle: "BỊ ĐỔI", jobId: "x" });
    ck("F-06", r6.status === 200 && r6.data.jobTitle === jf.jobTitle && r6.data.jobId === jf.jobId, errStr(r6));
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
