// B: POST /api/jobs — Tạo Job: validation 1.5.1, salary 1.2, chống mass-assignment, UTF-8
// Chạy riêng: node backend/tests/job-test/create.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  J, RESP_KEYS, TODAY, addDays, bearer, ck, errStr, isErr, isMain, profileOf, raw, runSuites, sameSet, sortedKeys, sqlInt, sqlRow, validJob,
} from "./lib.mjs";

export const name = "B: POST /api/jobs";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── B: POST /jobs ───────────────
  console.log("\n── B: POST /jobs");
  {
    const before = sqlInt(`SELECT COUNT(*) FROM job WHERE employerId='${E1.id}'`);
    const body = validJob({ jobTitle: "B-01 job" });
    const r = await J("POST", "/jobs", E1.token, body);
    ck("B-01", r.status === 201, errStr(r));
    const d = r.data;
    ck("B-01", r.headers.get("location") === `/api/jobs/${d.jobId}`, `Location=${r.headers.get("location")}`);
    ck("B-01", (await raw("GET", `/jobs/${d.jobId}`)).status === 200, "GET theo jobId");
    ck("B-01", /^[0-9a-f-]{36}$/.test(d.jobId), "jobId guid");
    ck("B-01", d.status === "Open", `status=${d.status}`);
    ck("B-01", /Z$/.test(d.createdAt) && Math.abs(Date.parse(d.createdAt) - Date.now()) < 60000, `createdAt=${d.createdAt}`);
    ck("B-01", /^\d{4}-\d{2}-\d{2}$/.test(d.deadline) && d.deadline === body.deadline, `deadline=${d.deadline}`);
    ck("B-01", d.salaryType === "Range", `salaryType=${d.salaryType}`);
    ck("B-01", d.companyName === profileOf.E1.companyName, `companyName=${d.companyName}`);
    ck("B-01", !("employerId" in d), "lộ employerId");
    ck("B-01", sameSet(Object.keys(d), RESP_KEYS), `keys=${sortedKeys(d)}`);
    ck("B-01", sqlRow(`SELECT employerId,status FROM job WHERE jobId='${d.jobId}'`).join("|") === `${E1.id}|Open`, "DB employerId/status");

    // B-02 mass assignment
    const r2 = await J("POST", "/jobs", E1.token, { ...validJob(), jobId: "my-own-id", employerId: E2.id, status: "Closed", createdAt: "2000-01-01T00:00:00Z", isVerified: true });
    ck("B-02", r2.status === 201 && r2.data.jobId !== "my-own-id" && r2.data.status === "Open", errStr(r2));
    ck("B-02", sqlRow(`SELECT employerId,status,YEAR(createdAt)>2000 FROM job WHERE jobId='${r2.data.jobId}'`).join("|") === `${E1.id}|Open|1`, "DB sau mass-assignment");

    // B-03 tối thiểu
    const r3 = await J("POST", "/jobs", E1.token, validJob({ subCategory: undefined, skillRequired: undefined, salaryMax: undefined }));
    ck("B-03", r3.status === 201 && r3.data.subCategory === null && r3.data.skillRequired === null && r3.data.salaryMax === null, errStr(r3));
    ck("B-03", sqlRow(`SELECT subCategory IS NULL, skillRequired IS NULL, salaryMax IS NULL FROM job WHERE jobId='${r3.data.jobId}'`).join("") === "111", "DB NULL");

    // B-04 negotiable
    const r4 = await J("POST", "/jobs", E1.token, validJob({ salaryType: "Negotiable", salaryMin: -5, salaryMax: 99999999999 }));
    ck("B-04", r4.status === 201 && r4.data.salaryType === "Negotiable" && r4.data.salaryMin === null && r4.data.salaryMax === null, errStr(r4));
    ck("B-04", sqlRow(`SELECT salaryType,salaryMin IS NULL,salaryMax IS NULL FROM job WHERE jobId='${r4.data.jobId}'`).join("|") === "Negotiable|1|1", "DB Negotiable");

    // B-05 trim
    const r5 = await J("POST", "/jobs", E1.token, validJob({ jobTitle: "   Tiêu đề trim   ", description: "  mô tả  ", skillRequired: "   " }));
    ck("B-05", r5.status === 201 && r5.data.jobTitle === "Tiêu đề trim" && r5.data.description === "mô tả" && r5.data.skillRequired === null, errStr(r5));
    ck("B-05", sqlRow(`SELECT CHAR_LENGTH(jobTitle), skillRequired IS NULL FROM job WHERE jobId='${r5.data.jobId}'`).join("|") === `${"Tiêu đề trim".length}|1`, "DB trim");

    // B-06 body rỗng
    const r6 = await J("POST", "/jobs", E1.token, {});
    const need = ["jobTitle", "category", "location", "workType", "description", "requirement", "applicantBenefit", "salaryType", "yearOfExperience", "numberOfPosition", "deadline"];
    ck("B-06", isErr(r6, 400, "VALIDATION_ERROR") && r6.data.message === "Dữ liệu không hợp lệ", errStr(r6));
    ck("B-06", r6.data?.errors && sameSet(Object.keys(r6.data.errors), need), `errors keys=${r6.data?.errors && Object.keys(r6.data.errors)}`);
    ck("B-06", sqlInt(`SELECT COUNT(*) FROM job WHERE employerId='${E1.id}'`) === before + 5, "DB: số Job đổi sai sau B-06 (B-01..05 thêm 5 job, B-06 không được thêm)");

    // B-07 từng field
    const L300 = "a".repeat(256);
    const cats = OPT.categories;
    const table = [
      ["jobTitle", { jobTitle: L300 }], ["description", { description: "d".repeat(5001) }], ["requirement", { requirement: "d".repeat(5001) }],
      ["applicantBenefit", { applicantBenefit: "d".repeat(5001) }], ["skillRequired", { skillRequired: "s".repeat(256) }],
      ["category", { category: "Không có thật" }], ["category", { category: cats[0].name.toLowerCase() }],
      ["subCategory", { subCategory: cats[1].subCategories[0] }], ["subCategory", { subCategory: "Không tồn tại" }],
      ["location", { location: "Ha Noi" }], ["location", { location: OPT.locations[0].toLowerCase() }],
      ["location", { location: OPT.locations[0].normalize("NFD") }], ["workType", { workType: "onsite" }], ["workType", { workType: "Freelance" }],
      ["salaryType", { salaryType: "range" }], ["salaryType", { salaryType: "Fixed" }], ["salaryType", { salaryType: undefined }],
      ["salaryMin", { salaryMin: undefined }], ["salaryMin", { salaryMin: -1 }], ["salaryMin", { salaryMin: 1000000001, salaryMax: undefined }], ["salaryMin", { salaryMin: 999000001, salaryMax: undefined }],
      ["salaryMax", { salaryMax: 1000000001 }], ["salaryMax", { salaryMin: 20, salaryMax: 10 }],
      ["yearOfExperience", { yearOfExperience: -1 }], ["yearOfExperience", { yearOfExperience: 51 }], ["yearOfExperience", { yearOfExperience: null }],
      ["numberOfPosition", { numberOfPosition: 0 }], ["numberOfPosition", { numberOfPosition: 51 }], ["numberOfPosition", { numberOfPosition: null }],
      ["deadline", { deadline: addDays(TODAY, -1) }], ["deadline", { deadline: addDays(TODAY, 91) }], ["deadline", { deadline: undefined }],
    ];
    for (const [key, ov] of table) {
      const rr = await J("POST", "/jobs", E1.token, validJob(ov));
      ck("B-07", isErr(rr, 400, "VALIDATION_ERROR") && rr.data.errors && key in rr.data.errors, `${key} ${JSON.stringify(ov).slice(0, 60)} -> ${errStr(rr)}`);
    }

    // B-08 biên hợp lệ
    const ok = [
      { jobTitle: "T".repeat(255) },
      { description: "à".repeat(5000), requirement: "ấ".repeat(5000), applicantBenefit: "ệ".repeat(5000) },
      { salaryMin: 5000000, salaryMax: 5000000 }, { salaryMax: undefined }, { salaryMin: 0, salaryMax: undefined }, { salaryMax: 999000000, salaryMin: 999000000 },
      { yearOfExperience: 0 }, { yearOfExperience: 50 }, { numberOfPosition: 1 }, { numberOfPosition: 50 },
      { deadline: TODAY }, { deadline: addDays(TODAY, 90) },
    ];
    for (const ov of ok) {
      const rr = await J("POST", "/jobs", E1.token, validJob(ov));
      ck("B-08", rr.status === 201, `${Object.keys(ov)} ${errStr(rr)}`);
      if (rr.status === 201 && ov.description) {
        const g2 = await raw("GET", `/jobs/${rr.data.jobId}`);
        ck("B-08", g2.data.description.length === 5000 && g2.data.requirement.length === 5000 && g2.data.applicantBenefit.length === 5000, "text 5000 bị cắt");
        ck("B-08", sqlRow(`SELECT CHAR_LENGTH(description) FROM job WHERE jobId='${rr.data.jobId}'`)[0] === "5000", "DB CHAR_LENGTH");
      }
    }

    // B-08b trần lương 999tr + chênh max − min ≤ 20tr (Business 1.2 / 1.5.1, chốt 2026-11-18)
    const M = 1000000, MSG_GAP = "Không được cao hơn lương tối thiểu quá 20 triệu", MSG_ORDER = "Phải lớn hơn hoặc bằng lương tối thiểu";
    const okSalary = [
      ["min 999tr, không max", { salaryMin: 999 * M, salaryMax: undefined }],
      ["979–999tr (chênh 20tr sát trần)", { salaryMin: 979 * M, salaryMax: 999 * M }],
      ["10–30tr (chênh đúng 20tr)", { salaryMin: 10 * M, salaryMax: 30 * M }],
      ["0–20tr (chênh đúng 20tr)", { salaryMin: 0, salaryMax: 20 * M }],
    ];
    for (const [label, ov] of okSalary) {
      const rr = await J("POST", "/jobs", E1.token, validJob(ov));
      ck("B-08b", rr.status === 201, `${label}: ${errStr(rr)}`);
    }
    const badSalary = [
      ["min 999tr+1, không max", { salaryMin: 999 * M + 1, salaryMax: undefined }, "salaryMin", null],
      ["max 999tr+1 (min 990tr)", { salaryMin: 990 * M, salaryMax: 999 * M + 1 }, "salaryMax", null],
      ["980tr–1 tỷ", { salaryMin: 980 * M, salaryMax: 1000 * M }, "salaryMax", null],
      ["10–30tr+1 (chênh 20tr+1)", { salaryMin: 10 * M, salaryMax: 30 * M + 1 }, "salaryMax", MSG_GAP],
      ["10tr–500tr", { salaryMin: 10 * M, salaryMax: 500 * M }, "salaryMax", MSG_GAP],
      ["0–20tr+1", { salaryMin: 0, salaryMax: 20 * M + 1 }, "salaryMax", MSG_GAP],
      ["min > max (30tr > 10tr): vẫn câu cũ", { salaryMin: 30 * M, salaryMax: 10 * M }, "salaryMax", MSG_ORDER],
      ["min > max (10tr > 5tr): vẫn câu cũ", { salaryMin: 10 * M, salaryMax: 5 * M }, "salaryMax", MSG_ORDER],
    ];
    for (const [label, ov, key, msg] of badSalary) {
      const rr = await J("POST", "/jobs", E1.token, validJob(ov));
      const em = rr.data?.errors?.[key];
      ck("B-08b", isErr(rr, 400, "VALIDATION_ERROR") && Array.isArray(em) && (msg === null || em[0] === msg), `${label}: ${errStr(rr)}`);
    }
    // Negotiable bỏ qua cả hai rule lương
    const rn = await J("POST", "/jobs", E1.token, validJob({ salaryType: "Negotiable", salaryMin: 1 * M, salaryMax: 900 * M }));
    ck("B-08b", rn.status === 201 && rn.data.salaryMin === null && rn.data.salaryMax === null, `Negotiable: ${errStr(rn)}`);

    // B-09 lỗi tầng JSON
    const jh = { ...bearer(E1.token), "Content-Type": "application/json" };
    const bad = [
      "{bad", "", "null", "[]", '{"deadline":"abc"}', '{"deadline":"2026-13-40"}', '{"deadline":"2026-12-01T10:00:00"}',
      '{"numberOfPosition":"5"}', '{"numberOfPosition":1.5}', '{"numberOfPosition":99999999999}', '{"salaryMin":"abc"}', '{"jobTitle":123}',
    ];
    for (const b of bad) {
      const rr = await raw("POST", "/jobs", { rawBody: b, headers: jh });
      ck("B-09", isErr(rr, 400, "VALIDATION_ERROR"), `body=${b} -> ${errStr(rr)}`);
      if (b === "{bad") ck("B-09", rr.data && !("errors" in rr.data) && !/json|line|path|Position/i.test(rr.data.message.replace("JSON", "")), `lộ parser: ${errStr(rr)}`);
    }

    // B-10 UTF-8 + emoji
    const txt = "Tiếng Việt có dấu: ăâđêôơư ÀÁẢÃẠ 😀🚀 日本語";
    const r10 = await J("POST", "/jobs", E1.token, validJob({ description: txt, jobTitle: "Lập trình viên 🚀 Đà Nẵng" }));
    ck("B-10", r10.status === 201, errStr(r10));
    if (r10.status === 201) {
      const g10 = await raw("GET", `/jobs/${r10.data.jobId}`);
      ck("B-10", g10.data.description === txt && g10.data.jobTitle === "Lập trình viên 🚀 Đà Nẵng", `đọc lại: ${g10.data?.description}`);
    }

    // B-12 trùng nội dung
    const a = await J("POST", "/jobs", E1.token, validJob({ jobTitle: "Y hệt" }));
    const b = await J("POST", "/jobs", E1.token, validJob({ jobTitle: "Y hệt" }));
    ck("B-12", a.status === 201 && b.status === 201 && a.data.jobId !== b.data.jobId, `${a.status}/${b.status}`);
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
