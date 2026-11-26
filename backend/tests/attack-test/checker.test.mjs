// CK: self-test của bộ kiểm bất biến DB (checkInvariants) — mỗi bất biến phải ĐỎ được khi bơm đúng 1 vi phạm thật.
// Chạy riêng: node backend/tests/attack-test/checker.test.mjs [--base=http://localhost:5165/api]
// Dữ liệu bơm chỉ nằm trên user/job của chính run (atk_<TS>_*) và được trả về nguyên trạng ngay sau mỗi case.
import {
  TS, adminVerify, call, checkInvariants, ck, findDuplicates, isMain, ledger, makeCrowd, makeTempAdmin, postJob, runAttackSuites, sql, sqlInt, uid,
} from "./lib.mjs";

export const name = "CK: self-test bộ kiểm bất biến";

const codesOf = (v) => [...new Set(v.map((x) => x.split(":")[0]))].sort();
/** Kết quả chỉ chứa đúng các mã `want` (mỗi bất biến bơm 1 vi phạm -> chỉ đúng mã đó đỏ) */
const only = (id, v, want, what) => ck(id, JSON.stringify(codesOf(v)) === JSON.stringify([...want].sort()), `${what}: mong ${want}, được ${JSON.stringify(v)}`);
const errText = (e) => String(e.stderr || e.message || e);

// INSERT job tối thiểu, đủ cột NOT NULL
const insJob = (jobId, employerId) =>
  `INSERT INTO job (jobId,employerId,jobTitle,description,requirement,applicantBenefit,deadline,workType,numberOfPosition,status,location,createdAt,updatedAt,category,salaryType,yearOfExperience) ` +
  `VALUES ('${jobId}','${employerId}','atk','d','r','b','2099-01-01','Onsite',1,'Open','Hà Nội',UTC_TIMESTAMP(),UTC_TIMESTAMP(),'IT','Range',0)`;
const NO_FK = "SET FOREIGN_KEY_CHECKS=0; ";

export default async function run() {
  const { employers: [E1, E2, E3] } = await makeCrowd({ employers: 3, verified: 2, finders: 0 }); // E3 chưa xác minh, dùng cho CK-BASE
  const scope = [E1.id, E2.id, E3.id];
  const ghost = `atk_${TS}_ghost`; // employerId / userId không tồn tại, cleanAttack cũng dọn theo tên này

  const r1 = await postJob(E1);
  const r2 = await postJob(E2);
  ck("CK-I0", r1.status === 201 && r2.status === 201, `tạo job nền: ${r1.status}/${r2.status}`);
  const j1 = r1.data.jobId;
  const j2 = r2.data.jobId;

  // ── CK-I0: trạng thái sạch, gồm cả vòng tạo + xóa qua call() (sổ cái ghi đúng) ──
  ck("CK-I0", JSON.stringify(checkInvariants(scope)) === "[]", `baseline phải sạch: ${JSON.stringify(checkInvariants(scope))}`);
  const del = await call(E2, "DELETE", `/jobs/${j2}`);
  ck("CK-I0", del.status === 200, `xóa job: ${del.status}`);
  ck("CK-I0", JSON.stringify(checkInvariants(scope)) === "[]", `sau tạo + xóa vẫn phải sạch: ${JSON.stringify(checkInvariants(scope))}`);
  ck("CK-I0", JSON.stringify(checkInvariants([])) === "[]", "scope rỗng không được lỗi / đỏ");

  // ── CK-I1: Job Open của employer chưa xác minh ──
  try {
    sql(`UPDATE employerprofile SET isVerified=0 WHERE userId='${E1.id}'`);
    only("CK-I1", checkInvariants(scope), ["I1"], "hủy xác minh mà không đóng job");
    // scope giới hạn: vi phạm của E1 không được làm đỏ khi chỉ xét E2
    ck("CK-SCOPE", JSON.stringify(checkInvariants([E2.id])) === "[]", "vi phạm ngoài scope không được báo");
  } finally { sql(`UPDATE employerprofile SET isVerified=1 WHERE userId='${E1.id}'`); }

  // ── CK-I2: job.employerId phải có employerprofile — FK chặn, thử INSERT; rồi tắt FK để chứng minh checker bắt được ──
  {
    let err = "";
    try { sql(insJob(uid(), ghost)); } catch (e) { err = errText(e); }
    ck("CK-I2", /1452|foreign key constraint fails/i.test(err), `DB phải tự chặn (FK), được: ${err.slice(0, 160)}`);
    ck("CK-I2", sqlInt(`SELECT COUNT(*) FROM job WHERE employerId='${ghost}'`) === 0, "INSERT bị chặn thì không để lại dòng");
    try {
      sql(NO_FK + insJob(uid(), ghost));
      const v = checkInvariants([ghost]);
      ck("CK-I2", codesOf(v).includes("I2"), `job mồ côi (tắt FK) phải đỏ I2: ${JSON.stringify(v)}`);
      ck("CK-I2", codesOf(v).every((c) => c === "I2" || c === "I8"), `không đỏ mã lạ: ${JSON.stringify(v)}`); // I8: job này không có trong sổ cái
    } finally { sql(`DELETE FROM job WHERE employerId='${ghost}'`); }
  }

  // ── CK-I3: status chỉ Open / Closed ──
  try {
    sql(`UPDATE job SET status='Draft' WHERE jobId='${j1}'`);
    only("CK-I3", checkInvariants(scope), ["I3"], "status lạ");
  } finally { sql(`UPDATE job SET status='Open' WHERE jobId='${j1}'`); }

  // ── CK-I4: companyName / taxCode không trùng — unique index chặn; thử INSERT, rồi chứng minh câu truy vấn đỏ được trên bảng nháp ──
  {
    const tax = sql(`SELECT taxCode FROM employerprofile WHERE userId='${E1.id}'`);
    const company = sql(`SELECT companyName FROM employerprofile WHERE userId='${E1.id}'`);
    const insProfile = (companyName, taxCode) =>
      NO_FK + `INSERT INTO employerprofile (userId,companyName,slugCode,address,field,phone,taxCode,isVerified) VALUES ('${ghost}','${companyName}','${uid().replace(/[^a-z0-9]/g, '').slice(0, 6)}','a','IT','0901234567','${taxCode}',0)`;
    try {
      let err = "";
      try { sql(insProfile(`atk dup ${uid().slice(0, 8)}`, tax)); } catch (e) { err = errText(e); }
      ck("CK-I4", /1062|Duplicate entry/i.test(err), `trùng taxCode phải bị DB chặn: ${err.slice(0, 160)}`);
      err = "";
      try { sql(insProfile(company.toUpperCase(), "9999999999999")); } catch (e) { err = errText(e); }
      ck("CK-I4", /1062|Duplicate entry/i.test(err), `trùng companyName (khác hoa thường) phải bị DB chặn: ${err.slice(0, 160)}`);
    } finally { sql(`DELETE FROM employerprofile WHERE userId='${ghost}'`); }
    ck("CK-I4", JSON.stringify(checkInvariants(scope)) === "[]", "sau các INSERT bị chặn vẫn sạch");

    // Không bơm được vào employerprofile -> kiểm câu truy vấn trùng (findDuplicates, checker dùng chính hàm này) trên bảng nháp không có unique
    const t = `atk_${TS}_dup`;
    try {
      sql(`CREATE TABLE ${t} (v varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL)`);
      sql(`INSERT INTO ${t} VALUES ('Abc'),('abc'),('xyz')`);
      const d = findDuplicates(t, "v");
      ck("CK-I4", d.length === 1 && d[0].toLowerCase() === "abc", `bảng nháp có Abc/abc phải ra 1 trùng: ${JSON.stringify(d)}`);
      sql(`DELETE FROM ${t} WHERE v='abc'`);
      ck("CK-I4", findDuplicates(t, "v").length === 0, "hết trùng thì rỗng");
    } finally { sql(`DROP TABLE IF EXISTS ${t}`); }
  }

  // ── CK-I5: đã xác minh thì không còn unverifyReason ──
  try {
    sql(`UPDATE employerprofile SET unverifyReason='atk-reason' WHERE userId='${E2.id}'`);
    only("CK-I5", checkInvariants(scope), ["I5"], "verified + còn lý do hủy");
  } finally { sql(`UPDATE employerprofile SET unverifyReason=NULL WHERE userId='${E2.id}'`); }

  // ── CK-I6: sổ cái không có 500, lỗi 4xx phải có code + message chuỗi ──
  {
    const base = { who: "fake", method: "GET", path: "/x", t0: 0, t1: 0 };
    const bad = [
      [{ status: 500, code: "X", message: "m" }, "500"],
      [{ status: 400 }, "4xx thiếu code + message"],
      [{ status: 401, code: "UNAUTHORIZED" }, "4xx thiếu message"],
      [{ status: 404, code: "JOB_NOT_FOUND", message: 123 }, "message không phải chuỗi"],
    ];
    for (const [e, what] of bad) {
      ledger.push({ ...base, ...e });
      try { only("CK-I6", checkInvariants(scope), ["I6"], what); } finally { ledger.pop(); }
    }
    for (const e of [{ status: 400, code: "VALIDATION_ERROR", message: "Lỗi" }, { status: 429, code: "TOO_MANY_REQUESTS", message: "Chậm lại" }, { status: 200 }]) {
      ledger.push({ ...base, ...e });
      try { ck("CK-I6", JSON.stringify(checkInvariants(scope)) === "[]", `${e.status} hợp lệ không được đỏ`); } finally { ledger.pop(); }
    }
  }

  // ── CK-I8: số Job trong DB = số job tạo (201) trừ số xóa (200) trong sổ cái ──
  {
    const fake = { who: "fake", method: "POST", path: "/jobs", status: 201, jobId: uid(), t0: 0, t1: 0 };
    ledger.push(fake); // sổ cái nói đã tạo nhưng DB không có
    try {
      only("CK-I8", checkInvariants(scope), ["I8"], "sổ cái nhiều hơn DB");
      ledger.push({ who: "fake", method: "DELETE", path: `/jobs/${fake.jobId}`, status: 200, jobId: fake.jobId, t0: 0, t1: 0 });
      ck("CK-I8", JSON.stringify(checkInvariants(scope)) === "[]", "tạo rồi xóa (200) thì cân lại, phải sạch");
      ledger.pop();
    } finally { ledger.pop(); }
    const extra = uid(); // DB có job mà sổ cái không biết
    try {
      sql(insJob(extra, E1.id));
      only("CK-I8", checkInvariants(scope), ["I8"], "DB nhiều hơn sổ cái");
    } finally { sql(`DELETE FROM job WHERE jobId='${extra}'`); }
  }

  // ── CK-BASE: makeTempAdmin + adminVerify đi qua call()/BASE (có trong sổ cái), và thật sự verify được ──
  {
    const adm = await makeTempAdmin("CKADM");
    ck("CK-BASE", /^qa_admin_/.test(adm.username) && adm.role === "admin" && !!adm.token, "admin tạm phải có username qa_admin_* + token");
    const at = ledger.filter((e) => e.path === "/admin/login" && e.status === 200).length;
    ck("CK-BASE", at >= 1, "POST /admin/login phải nằm trong sổ cái (đi qua call/BASE)");
    const v = await adminVerify(adm, E3.id);
    const entry = ledger.findLast((e) => e.path === `/admin/employers/${E3.id}/verify`);
    ck("CK-BASE", v.status === 200 && entry?.status === 200 && entry.method === "PATCH", `adminVerify phải 200 và có trong sổ cái: ${v.status} ${JSON.stringify(v.data)?.slice(0, 120)}`);
    ck("CK-BASE", sqlInt(`SELECT isVerified FROM employerprofile WHERE userId='${E3.id}'`) === 1, "E3 phải được xác minh trong DB");
  }

  ck("CK-I0", JSON.stringify(checkInvariants(scope)) === "[]", `sau mọi case bơm, dữ liệu phải về sạch: ${JSON.stringify(checkInvariants(scope))}`);
}

if (isMain(import.meta.url)) await runAttackSuites([{ name, run }]);
