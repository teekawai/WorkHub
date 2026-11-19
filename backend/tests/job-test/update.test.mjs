// E: PUT /api/jobs/:id — Sửa Job: chỉ Open + còn hạn, ghi đè toàn bộ nội dung (Business 2.6)
// Chạy riêng: node backend/tests/job-test/update.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  J, RESP_KEYS, TODAY, addDays, ck, errStr, isErr, isMain, mkJob, runSuites, sameSet, setDeadline, snap, sql, sqlRow, validJob,
} from "./lib.mjs";

export const name = "E: PUT /api/jobs/:id";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── E: PUT ───────────────
  console.log("\n── E: PUT /jobs/{id}");
  {
    const j = await mkJob(E1, { jobTitle: "E base" });
    const creat = sql(`SELECT createdAt FROM job WHERE jobId='${j.jobId}'`);
    const body = validJob({
      jobTitle: "E sửa", category: OPT.categories[1].name, subCategory: OPT.categories[1].subCategories[0], location: OPT.locations[1], workType: OPT.workTypes[1],
      skillRequired: "Go", description: "mô tả mới", requirement: "yc mới", applicantBenefit: "ql mới", salaryMin: 1000, salaryMax: 2000, yearOfExperience: 5, numberOfPosition: 7, deadline: addDays(TODAY, 40),
    });
    const r = await J("PUT", `/jobs/${j.jobId}`, E1.token, body);
    ck("E-01", r.status === 200 && sameSet(Object.keys(r.data), RESP_KEYS), errStr(r));
    const g = await J("GET", `/employer/jobs/${j.jobId}`, E1.token);
    const fields = ["jobTitle", "category", "subCategory", "location", "workType", "skillRequired", "description", "requirement", "applicantBenefit", "salaryMin", "salaryMax", "yearOfExperience", "numberOfPosition", "deadline"];
    ck("E-01", fields.every((f) => g.data[f] === body[f]), `GET sau PUT lệch: ${errStr(g)}`);
    ck("E-01", g.data.jobId === j.jobId && g.data.status === "Open" && sql(`SELECT createdAt FROM job WHERE jobId='${j.jobId}'`) === creat && sql(`SELECT employerId FROM job WHERE jobId='${j.jobId}'`) === E1.id, "field hệ thống bị đổi");

    // E-02 Range -> Negotiable
    const ra = await J("POST", "/jobs", E1.token, validJob({ salaryMin: 5000000, salaryMax: 9000000 }));
    const rn = await J("PUT", `/jobs/${ra.data.jobId}`, E1.token, validJob({ salaryType: "Negotiable", salaryMin: 123, salaryMax: 456 }));
    ck("E-02", rn.status === 200 && rn.data.salaryType === "Negotiable" && rn.data.salaryMin === null && rn.data.salaryMax === null, errStr(rn));
    ck("E-02", sqlRow(`SELECT salaryType,salaryMin IS NULL,salaryMax IS NULL FROM job WHERE jobId='${ra.data.jobId}'`).join("|") === "Negotiable|1|1", "DB không NULL");
    // E-03
    const id3 = ra.data.jobId;
    const steps = [
      [{ salaryType: "Range", salaryMin: 7000000, salaryMax: undefined }, "Range|7000000.00|1"],
      [{ salaryType: "Range", salaryMin: 8000000, salaryMax: 9000000 }, "Range|8000000.00|9000000.00"],
      [{ salaryType: "Range", salaryMin: 3000000, salaryMax: undefined }, "Range|3000000.00|1"],
    ];
    for (const [ov, exp] of steps) {
      const rr = await J("PUT", `/jobs/${id3}`, E1.token, validJob(ov));
      const row = sqlRow(`SELECT salaryType,salaryMin,IF(salaryMax IS NULL,'1',salaryMax) FROM job WHERE jobId='${id3}'`).join("|");
      ck("E-03", rr.status === 200 && row === exp, `exp ${exp} got ${row} (${rr.status})`);
    }
    ck("E-03", true, "");
    // E-04
    const jc = await mkJob(E1, { jobTitle: "E closed" });
    await J("PATCH", `/jobs/${jc.jobId}/status`, E1.token, { status: "Closed" });
    const sc = snap(jc.jobId);
    ck("E-04", isErr(await J("PUT", `/jobs/${jc.jobId}`, E1.token, validJob({ jobTitle: "x" })), 409, "JOB_NOT_EDITABLE") && snap(jc.jobId) === sc, "PUT Job Closed");
    // E-05 / E-06
    const je = await mkJob(E1, { jobTitle: "E expired" });
    setDeadline(je.jobId, addDays(TODAY, -1));
    const se = snap(je.jobId);
    ck("E-05", isErr(await J("PUT", `/jobs/${je.jobId}`, E1.token, validJob()), 409, "JOB_NOT_EDITABLE") && snap(je.jobId) === se, "PUT Job hết hạn");
    setDeadline(je.jobId, TODAY);
    const r6 = await J("PUT", `/jobs/${je.jobId}`, E1.token, validJob({ jobTitle: "E hôm nay", deadline: addDays(TODAY, 10) }));
    ck("E-06", r6.status === 200 && r6.data.jobTitle === "E hôm nay", errStr(r6));
    // E-07
    const j7 = await mkJob(E1, { jobTitle: "E-07" });
    const s7 = snap(j7.jobId);
    const r7 = await J("PUT", `/jobs/${j7.jobId}`, E1.token, validJob({ jobTitle: "", salaryMin: -1, numberOfPosition: 99 }));
    ck("E-07", isErr(r7, 400, "VALIDATION_ERROR") && r7.data.errors?.jobTitle && r7.data.errors?.salaryMin && r7.data.errors?.numberOfPosition && snap(j7.jobId) === s7, errStr(r7));
    // E-08
    const r8 = await J("PUT", `/jobs/${j7.jobId}`, E1.token, { ...validJob({ jobTitle: "E-08" }), jobId: "xx", employerId: E2.id, status: "Closed", createdAt: "2000-01-01T00:00:00Z" });
    ck("E-08", r8.status === 200 && r8.data.jobId === j7.jobId && r8.data.status === "Open", errStr(r8));
    ck("E-08", sqlRow(`SELECT employerId,status,YEAR(createdAt)>2000 FROM job WHERE jobId='${j7.jobId}'`).join("|") === `${E1.id}|Open|1`, "DB sau PUT mass-assignment");
    // E-09
    const r9 = await J("PUT", `/jobs/${j7.jobId}`, E1.token, { jobTitle: "chỉ title" });
    ck("E-09", isErr(r9, 400, "VALIDATION_ERROR") && r9.data.errors?.description, errStr(r9));
    // E-10
    ck("E-10", (await J("PUT", `/jobs/${j7.jobId}`, E1.token, validJob({ deadline: addDays(TODAY, 90) }))).status === 200, "+90");
    ck("E-10", (await J("PUT", `/jobs/${j7.jobId}`, E1.token, validJob({ deadline: addDays(TODAY, 91) }))).data?.errors?.deadline !== undefined, "+91");
    ck("E-10", (await J("PUT", `/jobs/${j7.jobId}`, E1.token, validJob({ deadline: addDays(TODAY, -1) }))).data?.errors?.deadline !== undefined, "hôm qua");
    // E-11
    const r11 = await J("PUT", `/jobs/${j7.jobId}`, E1.token, validJob({ subCategory: "", skillRequired: "   " }));
    ck("E-11", r11.status === 200 && r11.data.subCategory === null && r11.data.skillRequired === null, errStr(r11));
    ck("E-11", sqlRow(`SELECT subCategory IS NULL, skillRequired IS NULL FROM job WHERE jobId='${j7.jobId}'`).join("") === "11", "DB NULL");
    // E-12
    const b12 = validJob({ jobTitle: "E-12" });
    const a12 = await J("PUT", `/jobs/${j7.jobId}`, E1.token, b12);
    const c12 = await J("PUT", `/jobs/${j7.jobId}`, E1.token, b12);
    ck("E-12", a12.status === 200 && c12.status === 200 && JSON.stringify(a12.data) === JSON.stringify(c12.data), "PUT lặp lại khác kết quả");
    // E-13 PUT cũng áp trần 999tr + chênh ≤ 20tr (Business 1.2); lỗi thì DB không đổi
    const M = 1000000;
    const ok13 = await J("PUT", `/jobs/${j7.jobId}`, E1.token, validJob({ jobTitle: "E-13", salaryMin: 10 * M, salaryMax: 30 * M }));
    ck("E-13", ok13.status === 200 && ok13.data.salaryMax === 30 * M, `chênh đúng 20tr: ${errStr(ok13)}`);
    const s13b = snap(j7.jobId);
    for (const [label, ov, key, msg] of [
      ["chênh 20tr+1", { salaryMin: 10 * M, salaryMax: 30 * M + 1 }, "salaryMax", "Không được cao hơn lương tối thiểu quá 20 triệu"],
      ["min 999tr+1", { salaryMin: 999 * M + 1, salaryMax: undefined }, "salaryMin", null],
      ["min > max", { salaryMin: 30 * M, salaryMax: 10 * M }, "salaryMax", "Phải lớn hơn hoặc bằng lương tối thiểu"],
    ]) {
      const rr = await J("PUT", `/jobs/${j7.jobId}`, E1.token, validJob({ jobTitle: "E-13 bad", ...ov }));
      const em = rr.data?.errors?.[key];
      ck("E-13", isErr(rr, 400, "VALIDATION_ERROR") && Array.isArray(em) && (msg === null || em[0] === msg) && snap(j7.jobId) === s13b, `${label}: ${errStr(rr)}`);
    }
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
