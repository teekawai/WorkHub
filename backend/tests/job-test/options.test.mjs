// C: GET /api/jobs/options — Danh sách Category / Location / WorkType cho dropdown FE (Business 6.4.1, 7)
// Chạy riêng: node backend/tests/job-test/options.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  J, ck, errStr, isMain, raw, runSuites, sameSet,
} from "./lib.mjs";

export const name = "C: GET /api/jobs/options";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── C: options ───────────────
  console.log("\n── C: GET /jobs/options");
  {
    const r = await raw("GET", "/jobs/options");
    ck("C-01", r.status === 200 && sameSet(Object.keys(r.data), ["categories", "locations", "workTypes"]), `keys ${errStr(r)}`);
    ck("C-01", r.data.categories.length === 24, `categories=${r.data.categories.length}`);
    ck("C-01", r.data.categories.every((c) => typeof c.name === "string" && Array.isArray(c.subCategories) && c.subCategories.length > 0 && sameSet(Object.keys(c), ["name", "subCategories"])), "shape category");
    ck("C-01", r.data.locations.length === 34 && new Set(r.data.locations).size === 34, `locations=${r.data.locations.length}`);
    ck("C-01", JSON.stringify(r.data.workTypes) === JSON.stringify(["Onsite", "Remote", "Hybrid"]), `workTypes=${JSON.stringify(r.data.workTypes)}`);
    const r2 = await raw("GET", "/jobs/options");
    ck("C-02", r2.status === 200 && r2.data.code !== "JOB_NOT_FOUND", "route /options bị {id} nuốt");
    const rf = await J("GET", "/jobs/options", F1.token);
    const re = await J("GET", "/jobs/options", E1.token);
    ck("C-03", JSON.stringify(rf.data) === JSON.stringify(r.data) && JSON.stringify(re.data) === JSON.stringify(r.data), "khác nhau theo token");
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
