// J/K: Kiểm tra toàn cục (chạy cuối) — Format lỗi { code, message, errors }, không lộ field nhạy cảm, không có 500 — quét mọi response đã gọi trong run
// Chạy riêng: node backend/tests/job-test/global-checks.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  J, bearer, ck, isMain, note, raw, recorded, runSuites, validJob,
} from "./lib.mjs";

export const name = "J/K: Kiểm tra toàn cục (chạy cuối)";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── K / J-05 probe ───────────────
  console.log("\n── Probe (ghi nhận)");
  {
    const bodyS = JSON.stringify(validJob());
    for (const [label, opts] of [
      ["text/plain", { rawBody: bodyS, headers: { ...bearer(E1.token), "Content-Type": "text/plain" } }],
      ["application/xml", { rawBody: "<a/>", headers: { ...bearer(E1.token), "Content-Type": "application/xml" } }],
      ["không Content-Type", { rawBody: new Uint8Array(Buffer.from(bodyS)), headers: bearer(E1.token) }],
    ]) {
      const r = await raw("POST", "/jobs", { ...opts, probe: true });
      note("K-03", `${label}: ${r.status} ${r.ct} ${r.text.slice(0, 160)}`);
    }
    for (const q of ["page=", "limit=", "page=99999999999", "limit=99999999999"]) {
      const r = await raw("GET", `/employer/jobs?${q}`, { headers: bearer(E1.token), probe: true });
      note("K-04", `?${q}: ${r.status} ${r.text.slice(0, 160)}`);
    }
    for (const [m, p] of [["PUT", "/jobs"], ["DELETE", "/jobs"], ["POST", `/jobs/${jobE1.jobId}`]]) {
      const r = await raw(m, p, { headers: bearer(E1.token), probe: true });
      note("J-05", `${m} ${p.replace(jobE1.jobId, "{id}")}: ${r.status} ${r.text.slice(0, 100)}`);
    }
  }

  // ─────────────── J: kiểm tra toàn cục ───────────────
  console.log("\n── J: kiểm tra toàn cục");
  {
    const jobRecs = recorded.filter((r) => /^\/(jobs|employer\/jobs)/.test(r.path));
    const walk = (v, f) => { if (Array.isArray(v)) v.forEach((x) => walk(x, f)); else if (v && typeof v === "object") { f(v); Object.values(v).forEach((x) => walk(x, f)); } };
    const codes = new Set(["VALIDATION_ERROR", "UNAUTHENTICATED", "FORBIDDEN_ROLE", "EMPLOYER_PROFILE_NOT_FOUND", "EMPLOYER_NOT_VERIFIED", "NOT_JOB_OWNER", "JOB_NOT_FOUND", "EMPLOYER_NOT_FOUND", "JOB_ALREADY_CLOSED", "JOB_NOT_EDITABLE", "JOB_HAS_APPLICATIONS", "INTERNAL_ERROR", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "SERVICE_UNAVAILABLE", "TOO_MANY_REQUESTS", "REQUEST_IN_PROGRESS", "IDEMPOTENCY_KEY_REUSED", "COMPANY_NAME_TAKEN", "TAX_CODE_TAKEN", "COMPANY_NAME_LOCKED", "TAX_CODE_LOCKED"]);
    let nErr = 0, nAll = 0, n500 = [];
    for (const r of jobRecs.filter((x) => !x.probe)) {
      nAll++;
      if (r.status >= 400) {
        nErr++;
        const ok = r.ct.includes("json") && r.data && typeof r.data === "object" && Object.keys(r.data).every((k) => ["code", "message", "errors"].includes(k)) && codes.has(r.data.code) && typeof r.data.message === "string";
        ck("J-01", ok, `${r.method} ${r.path.slice(0, 50)} ${r.status} ct=${r.ct} body=${r.text.slice(0, 120)}`);
      }
      if (r.data && typeof r.data === "object") {
        walk(r.data, (o) => {
          for (const k of Object.keys(o)) {
            if (/^(passwordHash|refreshToken|accessToken|taxCode|phone|employerId|userId)$/i.test(k)) ck("J-02", false, `${r.method} ${r.path} chứa key ${k}`);
          }
          if ("jobId" in o && "deadline" in o) {
            ck("J-06", /^\d{4}-\d{2}-\d{2}$/.test(o.deadline) && /Z$/.test(o.createdAt), `deadline=${o.deadline} createdAt=${o.createdAt}`);
          }
        });
        if ("items" in r.data || "jobId" in r.data) ck("J-02", true);
      }
    }
    for (const r of recorded) if (r.status === 500) n500.push(`${r.method} ${r.path} ${r.probe ? "(probe)" : ""}`);
    ck("J-03", n500.length === 0, `có ${n500.length} response 500: ${n500.slice(0, 6).join(" | ")}`);
    note("J-01", `đã quét ${nAll} response job (${nErr} lỗi)`);
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
