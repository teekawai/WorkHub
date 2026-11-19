// PATCH /api/admin/employers/{userId}/verify — xác minh công ty
// Chạy riêng: node backend/tests/admin-test/verify.test.mjs   (chạy tất cả: node backend/tests/admin-test/run.mjs)
import {
  J, adminVerify, ck, errStr, isErr, isMain, jobCountDb, jobStatusDb, makeEmployerSafe, mkJob, profileDb, runAdminSuites, sharedAdmin, sql, uid, verifyView,
} from "./lib.mjs";

export const name = "V: PATCH /api/admin/employers/:id/verify";

export default async function run(ctx) {
  const adm = await sharedAdmin(ctx);
  const { F1 } = ctx.U;

  console.log("\n── V-01: verify employer chưa xác minh");
  {
    const e = await makeEmployerSafe("V_new", false);
    const r = await adminVerify(adm, e.id);
    ck("V-01", r.status === 200 && r.data.message === "Đã xác minh công ty", errStr(r));
    ck("V-01", JSON.stringify(Object.keys(r.data)) === '["message"]', `body chỉ có message: ${JSON.stringify(r.data)}`);
    const [v, reason] = profileDb(e.id);
    ck("V-01", v === "1" && reason === "<NULL>", `DB isVerified=${v} reason=${reason}`);
    // verify lần 2: idempotent
    const r2 = await adminVerify(adm, e.id);
    ck("V-02", r2.status === 200 && r2.data.message === "Công ty đã được xác minh", errStr(r2));
    ck("V-02", profileDb(e.id)[0] === "1", "vẫn đã xác minh");
  }

  console.log("\n── V-03: employer đã bị thu hồi (có lý do) -> verify xóa lý do, không mở lại Job Closed");
  {
    const e = await makeEmployerSafe("V_rev", true);
    const job = await mkJob(e, { jobTitle: "V closed" });
    const c = await J("PATCH", `/jobs/${job.jobId}/status`, e.token, { status: "Closed" });
    const open = await mkJob(e, { jobTitle: "V open" });
    ck("V-03", c.status === 200, errStr(c));
    // đưa về trạng thái "đã thu hồi có lý do" qua SQL; Job Open đóng như unverify thật
    sql(`UPDATE employerprofile SET isVerified=0, unverifyReason='Lý do cũ' WHERE userId='${e.id}'`);
    sql(`UPDATE job SET status='Closed' WHERE jobId='${open.jobId}'`);
    ck("V-03", profileDb(e.id)[1] === "Lý do cũ", "tiền điều kiện: đã có lý do");
    const r = await adminVerify(adm, e.id);
    ck("V-03", r.status === 200 && r.data.message === "Đã xác minh công ty", errStr(r));
    const [v, reason] = profileDb(e.id);
    ck("V-03", v === "1" && reason === "<NULL>", `DB isVerified=${v} reason=${reason} (phải xóa lý do cũ)`);
    ck("V-03", jobStatusDb(job.jobId) === "Closed" && jobStatusDb(open.jobId) === "Closed" && jobCountDb(e.id, "Open") === 0, "Job Closed không được mở lại");
    // employer đăng được Job lại
    const again = await mkJob(e, { jobTitle: "V sau verify" }).then(() => true, () => false);
    ck("V-03", again, "sau verify employer phải đăng được Job (201)");
  }

  console.log("\n── V-04: userId lạ / user Finder -> 404 EMPLOYER_NOT_FOUND");
  {
    const r1 = await adminVerify(adm, uid());
    ck("V-04", isErr(r1, 404, "EMPLOYER_NOT_FOUND") && r1.data.message === "Không tìm thấy công ty", errStr(r1));
    const r2 = await adminVerify(adm, F1.id);
    ck("V-04", isErr(r2, 404, "EMPLOYER_NOT_FOUND"), errStr(r2));
    // employer có tài khoản nhưng chưa có profile
    const np = await makeEmployerSafe("V_np", false);
    sql(`DELETE FROM employerprofile WHERE userId='${np.id}'`);
    const r3 = await adminVerify(adm, np.id);
    ck("V-04", isErr(r3, 404, "EMPLOYER_NOT_FOUND"), `employer không profile -> ${errStr(r3)}`);
  }

  console.log("\n── V-05: tên / MST admin đang xem đã cũ -> 409 EMPLOYER_PROFILE_CHANGED, không xác minh (I-1)");
  {
    const e = await makeEmployerSafe("V_stale", false);
    sql(`UPDATE employerprofile SET companyName='Công ty V05 ${e.id.slice(0, 8)}' WHERE userId='${e.id}'`);
    const view = verifyView(e.id);
    const expect409 = async (label, body) => {
      const r = await adminVerify(adm, e.id, body);
      ck("V-05", isErr(r, 409, "EMPLOYER_PROFILE_CHANGED"), `${label} -> ${errStr(r)}`);
      ck("V-05", profileDb(e.id)[0] === "0", `${label}: DB không được xác minh`);
    };
    // employer đổi tên ngay trước khi admin bấm
    sql(`UPDATE employerprofile SET companyName='${view.companyName} moi' WHERE userId='${e.id}'`);
    await expect409("đổi tên (gửi tên cũ)", view);
    // chỉ đổi dấu / hoa thường: collation mặc định coi là bằng nhau, phải vẫn bắt được
    sql(`UPDATE employerprofile SET companyName='Cong ty V05 ${e.id.slice(0, 8)}' WHERE userId='${e.id}'`);
    await expect409("chỉ bỏ dấu", view);
    sql(`UPDATE employerprofile SET companyName='CÔNG TY V05 ${e.id.slice(0, 8)}' WHERE userId='${e.id}'`);
    await expect409("chỉ đổi hoa thường", view);
    // đổi MST
    sql(`UPDATE employerprofile SET companyName='${view.companyName}' WHERE userId='${e.id}'`);
    await expect409("MST khác", { ...view, taxCode: view.taxCode + "9" });
    // gửi đúng dữ liệu hiện tại -> xác minh được
    const ok = await adminVerify(adm, e.id, verifyView(e.id));
    ck("V-05", ok.status === 200 && ok.data.message === "Đã xác minh công ty", errStr(ok));
    ck("V-05", profileDb(e.id)[0] === "1", "DB phải đã xác minh");
  }

  console.log("\n── V-06: thiếu companyName / taxCode -> 400, không đổi DB");
  {
    const e = await makeEmployerSafe("V_400", false);
    for (const [label, body, field] of [
      ["thiếu companyName", { taxCode: verifyView(e.id).taxCode }, "companyName"],
      ["taxCode rỗng", { companyName: verifyView(e.id).companyName, taxCode: "  " }, "taxCode"],
    ]) {
      const r = await adminVerify(adm, e.id, body);
      ck("V-06", isErr(r, 400, "VALIDATION_ERROR") && r.data.errors?.[field], `${label} -> ${errStr(r)}`);
    }
    ck("V-06", profileDb(e.id)[0] === "0", "DB không được xác minh");
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
