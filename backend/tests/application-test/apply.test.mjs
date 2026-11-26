// AP: POST /api/jobs/{id}/applications — happy path 2 nguồn CV, validation từng field, thứ tự lỗi, upload CV hồ sơ (.doc), request lạ (Business 2)
// Chạy riêng: node backend/tests/application-test/apply.test.mjs [--base=http://localhost:5166/api]   (chạy tất cả: node backend/tests/application-test/run.mjs)
import {
  GOOD, J, TODAY, addDays, addApp, apply, bearer, ck, cloud, errKeys, errMsg, errStr, finderPool, isErr, isMain, makeEmployerJob, makeEmployerSafe, makeFinder,
  mkJob, note, raw, runAdminSuites, setDeadline, setVerified, sql, sqlInt, sqlRow, uid, uploadProfileCv, uploadAvatar, appRows, cloudSummary,
} from "./lib.mjs";

export const name = "AP: POST /api/jobs/{id}/applications";

const APP_KEYS = ["applicationId", "jobId", "fullName", "email", "cvUrl", "coverLetter", "status", "appliedAt"].sort();
const ISO_Z = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/;
const dbRow = (id) => sqlRow(`SELECT applicationId,finderId,jobId,fullName,email,cvUrl,status,DATE_FORMAT(appliedAt,'%Y-%m-%dT%H:%i:%sZ'),IFNULL(coverLetter,'<NULL>'),IFNULL(statusChangedAt,'<NULL>') FROM application WHERE applicationId='${id}'`);
const occurrences = (s, sub) => s.split(sub).length - 1;
// cvUrl raw: .../raw/upload/v123/WorkHub/applications/{applicationId}[.ext] — folder chỉ được xuất hiện 1 lần (publicId đã chứa folder)
const cvOk = (d) => typeof d.cvUrl === "string" && /\/raw\/upload\//.test(d.cvUrl)
  && new RegExp(`/WorkHub/applications/${d.applicationId}(\\.\\w+)?$`).test(d.cvUrl) && occurrences(d.cvUrl, "WorkHub/applications/") === 1;

export default async function run(ctx) {
  console.log("\n── AP: nộp đơn (Cloudinary thật)");

  // ─────────────── Happy path ───────────────
  const { job: J1 } = await makeEmployerJob("APE1", { jobTitle: "AP happy 1" });
  const emp = await makeEmployerSafe("APE2", true);
  const jobs = {};
  for (const k of ["h2", "h3", "h4", "h4b", "h5"]) jobs[k] = await mkJob(emp, { jobTitle: `AP ${k}` });

  // AP-H1: 201 file máy (tên có dấu cách / chữ hoa / tiếng Việt)
  {
    const A = await makeFinder("APFa");
    const t0 = Date.now();
    const r = await apply(A, J1.jobId, { file: { name: "CV Của Tôi.PDF", size: 2048 } });
    ck("AP-H1", r.status === 201, errStr(r));
    const d = r.data || {};
    ck("AP-H1", JSON.stringify(Object.keys(d).sort()) === JSON.stringify(APP_KEYS), `field body: ${Object.keys(d)}`);
    ck("AP-H1", d.status === "Pending" && d.jobId === J1.jobId && d.fullName === GOOD.fullName && d.email === GOOD.email && d.coverLetter === GOOD.coverLetter, errStr(r));
    ck("AP-H1", ISO_Z.test(d.appliedAt || "") && Math.abs(Date.parse(d.appliedAt) - t0) < 120_000, `appliedAt=${d.appliedAt}`);
    ck("AP-H1", r.headers.get("location") === null, `có header Location: ${r.headers.get("location")}`);
    ck("AP-H1", !/finderId|passwordHash|accessToken|refreshToken/i.test(r.text), `body lộ field nhạy cảm: ${r.text.slice(0, 200)}`);
    ck("AP-CV2", cvOk(d), `cvUrl=${d.cvUrl} (kỳ vọng .../WorkHub/applications/{id}[.ext], folder đúng 1 lần)`);
    const row = dbRow(d.applicationId);
    ck("AP-H1", sqlInt(appRows(A.id)) === 1 && row[1] === A.id && row[2] === J1.jobId && row[3] === GOOD.fullName && row[4] === GOOD.email && row[5] === d.cvUrl
      && row[6] === "Pending" && row[7] === d.appliedAt && row[8] === GOOD.coverLetter && row[9] === "<NULL>", `DB: ${row.join(" | ")}`);
    const get = await fetch(d.cvUrl).catch((e) => ({ status: `lỗi ${e.message}` }));
    note("AP-CV2", `GET cvUrl -> ${get.status}`);

    // AP-H3: trim + coverLetter chỉ khoảng trắng -> null (cùng finder, job khác, file .docx)
    const r3 = await apply(A, jobs.h3.jobId, { fields: { fullName: "  Nguyễn Văn B  ", email: "  b@test.com  ", coverLetter: "   " }, file: { name: "cv.docx", size: 500 } });
    ck("AP-H3", r3.status === 201 && r3.data.fullName === "Nguyễn Văn B" && r3.data.email === "b@test.com" && r3.data.coverLetter === null, errStr(r3));
    const row3 = r3.status === 201 ? dbRow(r3.data.applicationId) : [];
    ck("AP-H3", row3[3] === "Nguyễn Văn B" && row3[4] === "b@test.com" && row3[8] === "<NULL>", `DB: ${row3.join(" | ")}`);
    // coverLetter bỏ hẳn field cũng là null (test ở H4 bên dưới không cần)
  }

  // AP-H4 / AP-A4: finder khác — field thừa bị bỏ qua; file đúng 5 MB hợp lệ
  {
    const B = await makeFinder("APFb");
    const other = await makeFinder("APFb2");
    const r = await apply(B, jobs.h4.jobId, { fields: { finderId: other.id, status: "Accepted", jobId: J1.jobId, applicationId: uid(), appliedAt: "2000-01-01T00:00:00Z", statusChangedAt: "2000-01-01T00:00:00Z", coverLetter: null } });
    ck("AP-A4", r.status === 201 && r.data.status === "Pending" && r.data.jobId === jobs.h4.jobId && r.data.coverLetter === null, errStr(r));
    const row = r.status === 201 ? dbRow(r.data.applicationId) : [];
    ck("AP-A4", row[1] === B.id && row[2] === jobs.h4.jobId && row[6] === "Pending" && row[7] !== "2000-01-01T00:00:00Z" && row[9] === "<NULL>" && sqlInt(appRows(other.id)) === 0 && sqlInt(`SELECT COUNT(*) FROM application WHERE jobId='${J1.jobId}' AND finderId='${B.id}'`) === 0, `DB: ${row.join(" | ")}`);
    const r5 = await apply(B, jobs.h4b.jobId, { file: { name: "big.pdf", size: 5 * 1024 * 1024 } });
    ck("AP-H4", r5.status === 201, `file đúng 5MB: ${errStr(r5)}`);
  }

  // AP-H2: nguồn CV hồ sơ (+ M2: file 0 byte & useProfileCv=true = CV hồ sơ)
  {
    const C = await makeFinder("APFc");
    const up = await uploadProfileCv(C, "hoso.doc", 1000);
    ck("AP-CV1", up.status === 200 && typeof up.data === "string", `upload CV hồ sơ .doc: ${errStr(up)}`);
    const cv1 = up.data;
    const r = await apply(C, jobs.h2.jobId, { fields: { useProfileCv: true }, file: null });
    ck("AP-H2", r.status === 201 && Object.keys(r.data).sort().join() === APP_KEYS.join(), errStr(r));
    const d = r.data || {};
    ck("AP-H2", d.cvUrl !== cv1 && d.cvUrl?.includes(d.applicationId), `cvUrl=${d.cvUrl} hồ sơ=${cv1}`);
    ck("AP-CV2", cvOk(d), `nguồn CV hồ sơ: cvUrl=${d.cvUrl}`);
    ck("AP-H2", ISO_Z.test(d.appliedAt || ""), d.appliedAt);
    // đổi CV hồ sơ: đơn đã nộp không đổi cvUrl
    const up2 = await uploadProfileCv(C, "hoso2.doc", 1500); // .doc: Cloudinary của dự án chặn tải raw .pdf (401) nên copy từ CV .pdf xem AP-CV3
    ck("AP-H2", up2.status === 200, errStr(up2));
    ck("AP-H2", dbRow(d.applicationId)[5] === d.cvUrl, `DB cvUrl đổi sau khi đổi CV hồ sơ: ${dbRow(d.applicationId)[5]}`);
    // M2
    const rm = await apply(C, jobs.h5.jobId, { fields: { useProfileCv: true }, file: { name: "rong.pdf", size: 0 } });
    ck("AP-M2", rm.status === 201 && rm.data?.cvUrl?.includes(rm.data.applicationId), `0 byte + useProfileCv=true: ${errStr(rm)}`);
  }

  // AP-CV3: CV hồ sơ là .pdf (trường hợp phổ biến nhất): copy-từ-URL phải 201 (Cloudinary đã bật PDF delivery)
  {
    const { job } = await makeEmployerJob("APE7", { jobTitle: "AP cv pdf" });
    const E = await makeFinder("APFe");
    const up = await uploadProfileCv(E, "hoso.pdf", 1000);
    ck("AP-CV3", up.status === 200, errStr(up));
    const deliver = await fetch(up.data).then((r) => r.status).catch(() => 0);
    if (deliver !== 200) note("AP-CV3", `Cloudinary trả ${deliver} khi tải CV hồ sơ .pdf (PDF delivery chưa bật?)`);
    const r = await apply(E, job.jobId, { fields: { useProfileCv: true }, file: null });
    ck("AP-CV3", r.status === 201 && cvOk(r.data), `CV hồ sơ .pdf: ${errStr(r)}`);
  }

  // AP-CV1: upload CV hồ sơ của Finder nhận .doc, từ chối .txt
  {
    const D = await makeFinder("APFd");
    const ok = await uploadProfileCv(D, "cv.doc", 800);
    ck("AP-CV1", ok.status === 200 && /^https:\/\/.+\/raw\/upload\//.test(ok.data), `.doc: ${errStr(ok)}`);
    // URL CV hồ sơ / avatar chỉ có 1 đoạn folder (Dev đã sửa lặp folder)
    ck("AP-CV4", occurrences(ok.data || "", "WorkHub/finder/cv/") === 1 && (ok.data || "").includes(`/WorkHub/finder/cv/${D.id}/`), `cv url: ${ok.data}`);
    const av = await uploadAvatar(D);
    ck("AP-CV4", av.status === 200 && occurrences(av.data || "", "WorkHub/finder/avatar/") === 1 && (av.data || "").includes(`/WorkHub/finder/avatar/${D.id}/`), `avatar: ${errStr(av)}`);
    const bad = await uploadProfileCv(D, "cv.txt", 800);
    ck("AP-CV1", bad.status === 400 && bad.data?.code === "VALIDATION_ERROR", `.txt: ${errStr(bad)}`);
    const big = await uploadProfileCv(D, "cv.pdf", 5 * 1024 * 1024 + 1);
    ck("AP-CV1", big.status === 400 && big.data?.code === "VALIDATION_ERROR", `5MB+1: ${errStr(big)}`);
  }

  // ─────────────── Validation (400) ───────────────
  console.log("\n── AP-V: validation");
  {
    const { job: JV } = await makeEmployerJob("APE3", { jobTitle: "AP validation" });
    const P = finderPool("APV");
    const withCv = await makeFinder("APVcv"); // finder có CV hồ sơ, dùng cho case 'cả 2 nguồn'
    await uploadProfileCv(withCv, "hs.pdf", 500);
    const MB = 1024 * 1024;
    // [id, fields, file, kỳ vọng {key: message}, finder tùy chọn]
    const cases = [
      ["V-01 fullName toàn khoảng trắng", { fullName: "   " }, undefined, { fullName: "Vui lòng nhập họ và tên." }],
      ["V-02 thiếu fullName", { fullName: null }, undefined, { fullName: "Vui lòng nhập họ và tên." }],
      ["V-03 fullName 101 ký tự", { fullName: "a".repeat(101) }, undefined, { fullName: "Tối đa 100 ký tự" }],
      ["V-04 thiếu email", { email: null }, undefined, { email: "Không được bỏ trống" }],
      ["V-05 email sai định dạng", { email: "abc" }, undefined, { email: "Email không đúng định dạng." }],
      ["V-06 email 256 ký tự", { email: "a".repeat(244) + "@example.com" }, undefined, { email: "Tối đa 255 ký tự" }],
      ["V-07 coverLetter 501 ký tự", { coverLetter: "x".repeat(501) }, undefined, { coverLetter: "Tối đa 500 ký tự" }],
      ["V-08 không chọn CV", {}, null, { cv: "Vui lòng chọn CV." }],
      ["V-09 file 0 byte + useProfileCv=false", {}, { name: "cv.pdf", size: 0 }, { cv: "Vui lòng chọn CV." }],
      ["V-10 gửi cả 2 nguồn", { useProfileCv: true }, { name: "cv.pdf", size: 100 }, { cv: "Giá trị không hợp lệ" }, withCv],
      ["V-11 đuôi .txt", {}, { name: "cv.txt", size: 100 }, { cv: "CV phải là tệp PDF, DOC hoặc DOCX." }],
      ["V-12 đuôi cv.pdf.exe", {}, { name: "cv.pdf.exe", size: 100 }, { cv: "CV phải là tệp PDF, DOC hoặc DOCX." }],
      ["V-13 file 5MB + 1 byte", {}, { name: "cv.pdf", size: 5 * MB + 1 }, { cv: "Tệp quá lớn. Dung lượng tối đa là 5MB." }],
      ["V-14 useProfileCv mà hồ sơ chưa có CV", { useProfileCv: true }, null, { cv: "Hồ sơ của bạn chưa có CV." }],
      ["V-15 file 0 byte + useProfileCv, hồ sơ chưa có CV", { useProfileCv: true }, { name: "cv.pdf", size: 0 }, { cv: "Hồ sơ của bạn chưa có CV." }],
      ["V-16 nhiều lỗi 1 lần", { fullName: "", email: "x" }, { name: "cv.txt", size: 10 }, { fullName: "Vui lòng nhập họ và tên.", email: "Email không đúng định dạng.", cv: "CV phải là tệp PDF, DOC hoặc DOCX." }],
      ["V-18 sai đuôi + quá 5MB: báo đuôi trước (M3)", {}, { name: "cv.txt", size: 6 * MB }, { cv: "CV phải là tệp PDF, DOC hoặc DOCX." }],
    ];
    for (const [label, fields, file, want, finder] of cases) {
      const id = "AP-" + label.split(" ")[0];
      const u = finder || (await P.next());
      const r = await apply(u, JV.jobId, file === undefined ? { fields } : { fields, file });
      const wantKeys = Object.keys(want).sort();
      ck(id, isErr(r, 400, "VALIDATION_ERROR") && JSON.stringify(errKeys(r)) === JSON.stringify(wantKeys), `${label}: ${errStr(r)}`);
      for (const [k, m] of Object.entries(want)) ck(id, errMsg(r, k) === m, `${label}: key ${k} = "${errMsg(r, k)}", cần "${m}"`);
    }
    // V-17: useProfileCv không parse được -> 400 do model binding, key useProfileCv
    {
      const r = await apply(await P.next(), JV.jobId, { fields: { useProfileCv: "abc" } });
      ck("AP-V-17", r.status === 400 && r.data?.code === "VALIDATION_ERROR" && errKeys(r).includes("useProfileCv"), errStr(r));
    }
    // V-19: mọi case 400 không để lại đơn / không chạm Job
    ck("AP-V-19", sqlInt(`SELECT COUNT(*) FROM application WHERE jobId='${JV.jobId}'`) === 0, "có đơn được ghi sau case 400");
  }

  // ─────────────── Thứ tự lỗi 403 > 400 > 404 > 409 (đóng/hết hạn) > 409 (đã nộp) ───────────────
  console.log("\n── AP-O: thứ tự lỗi");
  {
    const P = finderPool("APO");
    const eo = await makeEmployerSafe("APE4", true);
    const jOpen = await mkJob(eo, { jobTitle: "AP order open" });
    const jClosed = await mkJob(eo, { jobTitle: "AP order closed" });
    ck("AP-O-00", (await J("PATCH", `/jobs/${jClosed.jobId}/status`, eo.token, { status: "Closed" })).status === 200, "đóng job fixture");
    const jPast = await mkJob(eo, { jobTitle: "AP order past" });
    setDeadline(jPast.jobId, addDays(TODAY, -1));
    const jToday = await mkJob(eo, { jobTitle: "AP order today" });
    setDeadline(jToday.jobId, TODAY);
    const ghost = uid();
    // công ty chưa xác minh: job Open + job Closed (SQL không đóng job như admin unverify -> dựng đủ 2 trạng thái)
    const eu = await makeEmployerSafe("APE5", true);
    const uOpen = await mkJob(eu, { jobTitle: "AP unverified open" });
    const uClosed = await mkJob(eu, { jobTitle: "AP unverified closed" });
    await J("PATCH", `/jobs/${uClosed.jobId}/status`, eu.token, { status: "Closed" });
    setVerified(eu, 0);

    // O-01: không có hồ sơ -> 403 kể cả form sai + job không tồn tại
    {
      const N = await makeFinder("APNoProf", false);
      const r1 = await apply(N, ghost, { fields: { fullName: "", email: "x" }, file: null });
      ck("AP-O-01", isErr(r1, 403, "FINDER_PROFILE_NOT_FOUND") && r1.data.message === "Vui lòng tạo hồ sơ trước khi ứng tuyển", `form sai + job không có: ${errStr(r1)}`);
      const r2 = await apply(N, jOpen.jobId);
      ck("AP-O-01", isErr(r2, 403, "FINDER_PROFILE_NOT_FOUND"), `form đúng + job có: ${errStr(r2)}`);
      ck("AP-O-01", sqlInt(appRows(N.id)) === 0, "có đơn dù không có hồ sơ");
    }
    // O-02: có hồ sơ + form sai + job không có -> 400
    {
      const r = await apply(await P.next(), ghost, { fields: { fullName: "" }, file: null });
      ck("AP-O-02", isErr(r, 400, "VALIDATION_ERROR"), errStr(r));
    }
    // O-03: job không có / id rác -> 404
    for (const [label, id] of [["uuid không tồn tại", ghost], ["abc", "abc"], ["100 ký tự", "x".repeat(100)]]) {
      const r = await apply(await P.next(), id);
      ck("AP-O-03", isErr(r, 404, "JOB_NOT_FOUND") && r.data.message === "Không tìm thấy tin tuyển dụng", `${label}: ${errStr(r)}`);
    }
    // O-04: công ty chưa xác minh (kể cả job Closed) -> 404, không 409
    for (const [label, j] of [["Open", uOpen], ["Closed", uClosed]]) {
      const r = await apply(await P.next(), j.jobId);
      ck("AP-O-04", isErr(r, 404, "JOB_NOT_FOUND"), `công ty chưa xác minh + job ${label}: ${errStr(r)}`);
    }
    // O-05: Closed / hết hạn -> 409 JOB_NOT_OPEN
    for (const [label, j] of [["Closed", jClosed], ["Deadline quá khứ (SQL)", jPast]]) {
      const r = await apply(await P.next(), j.jobId);
      ck("AP-O-05", isErr(r, 409, "JOB_NOT_OPEN") && r.data.message === "Tin tuyển dụng đã đóng hoặc hết hạn", `${label}: ${errStr(r)}`);
    }
    // O-06: Deadline = hôm nay (VN) vẫn nộp được
    {
      const r = await apply(await P.next(), jToday.jobId);
      ck("AP-O-06", r.status === 201, `deadline hôm nay: ${errStr(r)}`);
    }
    // O-07: đã nộp -> 409 ALREADY_APPLIED; đã nộp + job đóng -> JOB_NOT_OPEN (409 đóng ưu tiên). Đơn dựng bằng SQL để không tốn upload
    {
      const F = await makeFinder("APFdup");
      addApp(F, jOpen.jobId);
      const r1 = await apply(F, jOpen.jobId);
      ck("AP-O-07", isErr(r1, 409, "ALREADY_APPLIED") && r1.data.message === "Bạn đã ứng tuyển việc này", errStr(r1));
      ck("AP-O-07", (await J("PATCH", `/jobs/${jOpen.jobId}/status`, eo.token, { status: "Closed" })).status === 200, "đóng job có đơn");
      const r2 = await apply(F, jOpen.jobId);
      ck("AP-O-07", isErr(r2, 409, "JOB_NOT_OPEN"), `đã nộp + job đóng: ${errStr(r2)}`);
      ck("AP-O-07", sqlInt(appRows(F.id)) === 1, "số đơn đổi sau case 409");
    }
  }

  // ─────────────── Request lạ (ghi nhận, không được 500) ───────────────
  console.log("\n── AP-F: request lạ");
  {
    const { job } = await makeEmployerJob("APE6", { jobTitle: "AP odd" });
    const F = await makeFinder("APFf");
    const rj = await raw("POST", `/jobs/${job.jobId}/applications`, { body: { fullName: GOOD.fullName, email: GOOD.email, useProfileCv: true }, headers: { ...bearer(F.token), "Idempotency-Key": uid() } });
    ck("AP-F1", rj.status < 500, errStr(rj));
    note("AP-F1", `JSON thay multipart: ${rj.status} ${rj.ct} ${rj.text.slice(0, 160)}`);
    try {
      const rb = await apply(F, job.jobId, { file: { name: "cv.pdf", size: 31 * 1024 * 1024 } });
      ck("AP-F2", rb.status < 500, errStr(rb));
      note("AP-F2", `file 31MB: ${rb.status} ${rb.ct} ${rb.text.slice(0, 160)}`);
    } catch (e) { note("AP-F2", `file 31MB: kết nối bị đóng (${e.cause?.code || e.message})`); }
    ck("AP-F1", sqlInt(`SELECT COUNT(*) FROM application WHERE jobId='${job.jobId}'`) === 0, "request lạ tạo đơn");
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }, cloudSummary]);
