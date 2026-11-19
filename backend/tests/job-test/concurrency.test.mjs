// CC: Request đồng thời (MySQL thật) — Nhóm service: JobService + JobRepository xử lý xung đột, Status là concurrency token (Business 2.4.1)
// Chạy riêng: node backend/tests/job-test/concurrency.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import fs from "node:fs";
import {
  BE_LOG, J, ROUNDS, TS, addApp, appCount, ck, delayed, errStr, isErr, isMain, jobExists, jobStatusDb, mkJob, note, runSuites, sleep, sqlRow, tally, validJob,
} from "./lib.mjs";

export const name = "CC: Request đồng thời (MySQL thật)";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  // ─────────────── CC: concurrency ───────────────
  console.log("\n── CC: concurrency (MySQL thật)");
  const bad500 = [];
  const chk500 = (tag, ...xs) => xs.forEach((x) => { if (x.status >= 500) bad500.push(`${tag}: ${x.status} ${x.text.slice(0, 160)}`); });
  const jobRow = (id) => sqlRow(`SELECT status,jobTitle,description FROM job WHERE jobId='${id}'`);
  const stagger = (i) => (i % 2 === 0 ? [0, Math.random() * 6] : [Math.random() * 6, 0]);

  // CC-01: PUT || PATCH Closed
  {
    const dist = {};
    for (let i = 0; i < ROUNDS + 5; i++) {
      const orig = `CC01 orig ${i} ${TS}`, nw = `CC01 new ${i} ${TS}`;
      const job = await mkJob(E1, { jobTitle: orig });
      const [dp, dq] = stagger(i);
      const [p, q] = await Promise.all([
        delayed(dp, () => J("PUT", `/jobs/${job.jobId}`, E1.token, validJob({ jobTitle: nw, description: "CC01 mô tả mới" }))),
        delayed(dq, () => J("PATCH", `/jobs/${job.jobId}/status`, E1.token, { status: "Closed" })),
      ]);
      chk500("CC-01", p, q);
      const row = jobRow(job.jobId);
      tally(dist, `PUT ${p.status}${p.data?.code ? ":" + p.data.code : ""} / PATCH ${q.status}`);
      const ok = q.status === 200 && (p.status === 200 || isErr(p, 409, "JOB_NOT_EDITABLE")) && row[0] === "Closed"
        && (p.status === 200 ? row[1] === nw : row[1] === orig && row[2] !== "CC01 mô tả mới");
      ck("CC-01", ok, `vòng ${i}: PUT ${errStr(p)} | PATCH ${errStr(q)} | DB ${row.join("|")}`);
    }
    note("CC-01", `phân bố: ${JSON.stringify(dist)}`);
  }
  // CC-02: 2 và 3 PATCH song song
  for (const n of [2, 3]) {
    const dist = {};
    for (let i = 0; i < ROUNDS; i++) {
      const job = await mkJob(E1, { jobTitle: `CC02-${n} ${i} ${TS}` });
      const res = await Promise.all(Array.from({ length: n }, () => delayed(Math.random() * 4, () => J("PATCH", `/jobs/${job.jobId}/status`, E1.token, { status: "Closed" }))));
      chk500("CC-02", ...res);
      tally(dist, res.map((x) => x.status).sort().join("/"));
      ck("CC-02", res.filter((x) => x.status === 200).length === 1 && res.filter((x) => isErr(x, 409, "JOB_ALREADY_CLOSED")).length === n - 1 && jobStatusDb(job.jobId) === "Closed",
        `${n} PATCH vòng ${i}: ${res.map((x) => errStr(x)).join(" | ")}`);
    }
    note("CC-02", `${n} PATCH: ${JSON.stringify(dist)}`);
  }
  // CC-03 / CC-07: PUT || DELETE (Job có Application)
  {
    const dist = {};
    for (let i = 0; i < ROUNDS; i++) {
      const job = await mkJob(E1, { jobTitle: `CC03 ${i} ${TS}` });
      addApp(F1, job.jobId);
      const [dp, dd] = stagger(i);
      const [p, d] = await Promise.all([
        delayed(dp, () => J("PUT", `/jobs/${job.jobId}`, E1.token, validJob({ jobTitle: `CC03 sửa ${i} ${TS}` }))),
        delayed(dd, () => J("DELETE", `/jobs/${job.jobId}`, E1.token)),
      ]);
      chk500("CC-03", p, d);
      tally(dist, `PUT ${p.status} / DELETE ${d.status}`);
      ck("CC-03", d.status === 200 && (p.status === 200 || isErr(p, 404, "JOB_NOT_FOUND")) && !jobExists(job.jobId), `vòng ${i}: PUT ${errStr(p)} | DELETE ${errStr(d)}`);
      ck("CC-07", appCount(job.jobId) === 0, `vòng ${i}: Application mồ côi sau PUT||DELETE`);
    }
    note("CC-03", `phân bố: ${JSON.stringify(dist)}`);
  }
  // CC-04: PATCH || DELETE
  {
    const dist = {};
    for (let i = 0; i < ROUNDS; i++) {
      const job = await mkJob(E1, { jobTitle: `CC04 ${i} ${TS}` });
      addApp(F1, job.jobId);
      const [dq, dd] = stagger(i);
      const [q, d] = await Promise.all([
        delayed(dq, () => J("PATCH", `/jobs/${job.jobId}/status`, E1.token, { status: "Closed" })),
        delayed(dd, () => J("DELETE", `/jobs/${job.jobId}`, E1.token)),
      ]);
      chk500("CC-04", q, d);
      tally(dist, `PATCH ${q.status} / DELETE ${d.status}`);
      ck("CC-04", d.status === 200 && (q.status === 200 || isErr(q, 404, "JOB_NOT_FOUND")) && !jobExists(job.jobId), `vòng ${i}: PATCH ${errStr(q)} | DELETE ${errStr(d)}`);
      ck("CC-07", appCount(job.jobId) === 0, `vòng ${i}: Application mồ côi sau PATCH||DELETE`);
    }
    note("CC-04", `phân bố: ${JSON.stringify(dist)}`);
  }
  // CC-05: 2 DELETE
  {
    const dist = {};
    for (let i = 0; i < ROUNDS; i++) {
      const job = await mkJob(E1, { jobTitle: `CC05 ${i} ${TS}` });
      addApp(F1, job.jobId);
      const res = await Promise.all([0, 1].map(() => delayed(Math.random() * 4, () => J("DELETE", `/jobs/${job.jobId}`, E1.token))));
      chk500("CC-05", ...res);
      tally(dist, res.map((x) => x.status).sort().join("/"));
      ck("CC-05", res.filter((x) => x.status === 200).length === 1 && res.filter((x) => isErr(x, 404, "JOB_NOT_FOUND")).length === 1 && !jobExists(job.jobId), `vòng ${i}: ${res.map(errStr).join(" | ")}`);
      ck("CC-07", appCount(job.jobId) === 0, `vòng ${i}: Application mồ côi sau 2 DELETE`);
    }
    note("CC-05", `phân bố: ${JSON.stringify(dist)}`);
  }
  // CC-06: DELETE ngay sau khi đóng
  for (let i = 0; i < 5; i++) {
    const job = await mkJob(E1, { jobTitle: `CC06 ${i} ${TS}` });
    addApp(F1, job.jobId);
    const q = await J("PATCH", `/jobs/${job.jobId}/status`, E1.token, { status: "Closed" });
    const d = await J("DELETE", `/jobs/${job.jobId}`, E1.token);
    ck("CC-06", q.status === 200 && d.status === 200 && !jobExists(job.jobId) && appCount(job.jobId) === 0, `${errStr(q)} | ${errStr(d)}`);
  }
  // Cột nội dung của Job (không gồm jobId/employerId/status/createdAt); salary ép về số nguyên để so với body
  const CONTENT_SQL = (id) => sqlRow(`SELECT jobTitle,category,IFNULL(subCategory,'NULL'),location,workType,IFNULL(skillRequired,'NULL'),description,requirement,applicantBenefit,salaryType,IFNULL(CAST(salaryMin AS SIGNED),'NULL'),IFNULL(CAST(salaryMax AS SIGNED),'NULL'),yearOfExperience,numberOfPosition,deadline FROM job WHERE jobId='${id}'`).join("|");
  const bodyContent = (b) => [b.jobTitle, b.category, b.subCategory ?? "NULL", b.location, b.workType, b.skillRequired ?? "NULL", b.description, b.requirement, b.applicantBenefit, b.salaryType,
    b.salaryType === "Negotiable" ? "NULL" : b.salaryMin, b.salaryType === "Negotiable" ? "NULL" : (b.salaryMax ?? "NULL"), b.yearOfExperience, b.numberOfPosition, b.deadline].join("|");
  // CC-08: 2 PUT song song, A chỉ đổi title, B chỉ đổi lương (phần còn lại giữ như cũ) -> bản ghi sau thắng NGUYÊN BẢN, 0 vòng trộn (Business 2.4.1)
  {
    let a = 0, b = 0, mixed = 0;
    for (let i = 0; i < ROUNDS; i++) {
      const base = validJob({ jobTitle: `CC08 base ${i} ${TS}` });
      const job = await J("POST", "/jobs", E1.token, base);
      const bA = { ...base, jobTitle: `CC08 A ${i} ${TS}` };
      const bB = { ...base, salaryMin: 33000000, salaryMax: 44000000 };
      const res = await Promise.all([bA, bB].map((bd) => delayed(Math.random() * 4, () => J("PUT", `/jobs/${job.data.jobId}`, E1.token, bd))));
      chk500("CC-08", ...res);
      const row = CONTENT_SQL(job.data.jobId);
      const isA = row === bodyContent(bA), isB = row === bodyContent(bB);
      if (isA) a++; else if (isB) b++; else mixed++;
      ck("CC-08", res.every((x) => x.status === 200) && (isA || isB), `vòng ${i}: ${res.map(errStr).join(" | ")}\n   DB=${row}\n   A =${bodyContent(bA)}\n   B =${bodyContent(bB)}`);
    }
    note("CC-08", `DB sau 2 PUT song song: nguyên A=${a}, nguyên B=${b}, TRỘN=${mixed}`);
  }
  // CC-12 (Reviewer): Job lương 10-20tr. A đổi lương sang 30-40tr; B đổi title nhưng GIỮ lương 10-20tr. DB phải đúng nguyên A hoặc nguyên B
  // (B thắng thì lương phải là 10-20tr). Có cả 2 thứ tự gửi lệch nhau 0-8ms để rải cửa sổ race
  {
    let a = 0, b = 0, mixed = 0;
    for (let i = 0; i < ROUNDS * 2; i++) {
      const base = validJob({ jobTitle: `CC12 base ${i} ${TS}`, salaryType: "Range", salaryMin: 10000000, salaryMax: 20000000 });
      const job = await J("POST", "/jobs", E1.token, base);
      const bA = { ...base, salaryMin: 30000000, salaryMax: 40000000 };
      const bB = { ...base, jobTitle: `CC12 B ${i} ${TS}` };
      const [dA, dB] = stagger(i).map((x) => x * 1.4);
      const res = await Promise.all([
        delayed(dA, () => J("PUT", `/jobs/${job.data.jobId}`, E1.token, bA)),
        delayed(dB, () => J("PUT", `/jobs/${job.data.jobId}`, E1.token, bB)),
      ]);
      chk500("CC-12", ...res);
      const row = CONTENT_SQL(job.data.jobId);
      const isA = row === bodyContent(bA), isB = row === bodyContent(bB);
      if (isA) a++; else if (isB) b++; else mixed++;
      ck("CC-12", res.every((x) => x.status === 200) && (isA || isB), `vòng ${i}: ${res.map((x) => x.status)}\n   DB=${row}\n   A =${bodyContent(bA)}\n   B =${bodyContent(bB)}`);
    }
    note("CC-12", `DB sau 2 PUT song song: nguyên A=${a}, nguyên B=${b}, TRỘN=${mixed}`);
  }
  // CC-11: PUT đổi nhiều cột || PATCH Closed -> DB Closed; nội dung nguyên bản gốc (PUT 409) hoặc nguyên bản PUT (PUT 200); không bị PATCH ghi đè về cũ
  {
    const dist = {};
    for (let i = 0; i < ROUNDS + 5; i++) {
      const base = validJob({ jobTitle: `CC11 base ${i} ${TS}` });
      const job = await J("POST", "/jobs", E1.token, base);
      const put = { ...base, jobTitle: `CC11 new ${i} ${TS}`, description: "CC11 mô tả mới", salaryMin: 55000000, salaryMax: 66000000, numberOfPosition: 9 };
      const [dp, dq] = stagger(i);
      const [p, q] = await Promise.all([
        delayed(dp, () => J("PUT", `/jobs/${job.data.jobId}`, E1.token, put)),
        delayed(dq, () => J("PATCH", `/jobs/${job.data.jobId}/status`, E1.token, { status: "Closed" })),
      ]);
      chk500("CC-11", p, q);
      const row = CONTENT_SQL(job.data.jobId), st = jobStatusDb(job.data.jobId);
      tally(dist, `PUT ${p.status}${p.data?.code ? ":" + p.data.code : ""} / PATCH ${q.status}`);
      const expect = p.status === 200 ? bodyContent(put) : bodyContent(base);
      ck("CC-11", q.status === 200 && (p.status === 200 || isErr(p, 409, "JOB_NOT_EDITABLE")) && st === "Closed" && row === expect,
        `vòng ${i}: PUT ${errStr(p)} | PATCH ${errStr(q)} | status=${st}\n   DB=${row}\n   exp=${expect}`);
    }
    note("CC-11", `phân bố: ${JSON.stringify(dist)}`);
  }
  // SQL-01: SQL thật của EF (cần --be-log=<file log của BE>): 1 PUT -> UPDATE đủ cột nội dung + WHERE status; 1 PATCH -> chỉ SET status
  if (BE_LOG && fs.existsSync(BE_LOG)) {
    const grabUpdate = async (fn) => {
      const start = fs.statSync(BE_LOG).size;
      const r = await fn();
      await sleep(600);
      const fd = fs.openSync(BE_LOG, "r"); const size = fs.fstatSync(fd).size; const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start); fs.closeSync(fd);
      const txt = buf.toString("utf8");
      const m = txt.match(/UPDATE `job` SET[\s\S]*?WHERE[^\r\n]*(\r?\n[^\r\n]*)?/);
      return { r, sqlText: m ? m[0] : "", all: txt };
    };
    const base = validJob({ jobTitle: `SQL01 ${TS}` });
    const job = await J("POST", "/jobs", E1.token, base);
    const put = await grabUpdate(() => J("PUT", `/jobs/${job.data.jobId}`, E1.token, { ...base, jobTitle: `SQL01 sửa ${TS}` }));
    const setPart = (put.sqlText.match(/SET([\s\S]*?)WHERE/) || [, ""])[1];
    const wherePart = (put.sqlText.match(/WHERE([\s\S]*)/) || [, ""])[1];
    const cols = ["jobTitle", "category", "subCategory", "location", "workType", "skillRequired", "description", "requirement", "applicantBenefit", "salaryType", "salaryMin", "salaryMax", "yearOfExperience", "numberOfPosition", "deadline"];
    const missing = cols.filter((c) => !setPart.includes("`" + c + "`"));
    const forbidden = ["jobId", "employerId", "status", "createdAt"].filter((c) => setPart.includes("`" + c + "`"));
    ck("SQL-01", put.r.status === 200 && put.sqlText !== "", `PUT ${put.r.status}, không thấy câu UPDATE trong log`);
    ck("SQL-01", missing.length === 0, `PUT thiếu cột trong SET: ${missing}`);
    ck("SQL-01", forbidden.length === 0, `PUT ghi cả cột hệ thống: ${forbidden}`);
    ck("SQL-01", /`status`\s*=/.test(wherePart) && /`jobId`\s*=/.test(wherePart), `WHERE của PUT: ${wherePart.trim()}`);
    note("SQL-01", `PUT:\n${put.sqlText.replace(/\s+/g, " ").slice(0, 700)}`);
    const patch = await grabUpdate(() => J("PATCH", `/jobs/${job.data.jobId}/status`, E1.token, { status: "Closed" }));
    const pSet = (patch.sqlText.match(/SET([\s\S]*?)WHERE/) || [, ""])[1];
    const pCols = [...pSet.matchAll(/`(\w+)`\s*=/g)].map((m) => m[1]);
    ck("SQL-01", patch.r.status === 200 && patch.sqlText !== "" && pCols.length === 1 && pCols[0] === "status", `PATCH SET cột: [${pCols}] ${patch.sqlText.slice(0, 200)}`);
    note("SQL-01", `PATCH:\n${patch.sqlText.replace(/\s+/g, " ").slice(0, 400)}`);
  } else note("SQL-01", "bỏ qua: chưa truyền --be-log=<file>");
  // ID-16: PUT y hệt dữ liệu cũ || PATCH Closed
  {
    const dist = {};
    let put200OpenAfterPatch = 0;
    for (let i = 0; i < ROUNDS + 10; i++) {
      const ov = { jobTitle: `ID16 ${i} ${TS}` };
      const job = await mkJob(E1, ov);
      const off = Math.random() * 28 - 3; // PUT lệch -3..+25ms so với PATCH
      const [p, q] = await Promise.all([
        delayed(Math.max(off, 0), () => J("PUT", `/jobs/${job.jobId}`, E1.token, validJob(ov))),
        delayed(Math.max(-off, 0), () => J("PATCH", `/jobs/${job.jobId}/status`, E1.token, { status: "Closed" })),
      ]);
      chk500("ID-16", p, q);
      const dbStatus = jobStatusDb(job.jobId);
      tally(dist, `PUT ${p.status}${p.status === 200 ? "/" + p.data.status : ""} / PATCH ${q.status}`);
      // PUT 200 "Open" chỉ hợp lệ nếu PUT hoàn tất trước PATCH. Nếu PUT được GỬI sau khi PATCH đã xong thì là phản hồi cũ (sai)
      const stale = p.status === 200 && p.data.status === "Open" && p.tSent >= q.tDone;
      if (p.status === 200 && p.data.status === "Open" && dbStatus === "Closed") put200OpenAfterPatch++;
      ck("ID-16", q.status === 200 && (p.status === 200 || isErr(p, 409, "JOB_NOT_EDITABLE")) && dbStatus === "Closed" && !stale,
        `vòng ${i}: PUT ${errStr(p)} | PATCH ${errStr(q)} | DB=${dbStatus} stale=${stale}`);
    }
    note("ID-16", `phân bố: ${JSON.stringify(dist)}; số vòng PUT 200 'Open' trong khi DB cuối là Closed (hợp lệ nếu PUT xong trước PATCH): ${put200OpenAfterPatch}`);
  }
  for (const f of bad500) note("CC-10", `500 trong nhóm concurrency: ${f}`);
  ck("CC-10", bad500.length === 0, `${bad500.length} response 5xx trong nhóm concurrency/ID-16: ${bad500.slice(0, 3).join(" || ")}`);
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
