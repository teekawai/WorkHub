// GET /api/employer/me — có unverifyReason (lý do Admin thu hồi xác minh) để Employer thấy
// Chạy riêng: node backend/tests/admin-test/employer-me.test.mjs   (chạy tất cả: node backend/tests/admin-test/run.mjs)
import { J, adminUnverify, adminVerify, ck, errStr, isMain, makeEmployerSafe, runAdminSuites, sharedAdmin } from "./lib.mjs";

export const name = "M: GET /api/employer/me (unverifyReason)";

export default async function run(ctx) {
  const adm = await sharedAdmin(ctx);
  const e = await makeEmployerSafe("M_me", true);
  const me = () => J("GET", "/employer/me", e.token);

  console.log("\n── M-01: chưa thu hồi -> unverifyReason null");
  const r0 = await me();
  ck("M-01", r0.status === 200 && "unverifyReason" in r0.data && r0.data.unverifyReason === null && r0.data.isVerified === true, errStr(r0));

  console.log("\n── M-02: sau unverify -> đúng lý do (đã trim)");
  await adminUnverify(adm, e.id, { reason: "  Mã số thuế không khớp  " });
  const r1 = await me();
  ck("M-02", r1.status === 200 && r1.data.unverifyReason === "Mã số thuế không khớp" && r1.data.isVerified === false, errStr(r1));

  console.log("\n── M-03: lần unverify thứ 2 không đổi lý do");
  await adminUnverify(adm, e.id, { reason: "Lý do khác" });
  const r1b = await me();
  ck("M-03", r1b.data?.unverifyReason === "Mã số thuế không khớp", errStr(r1b));

  console.log("\n── M-04: sau verify lại -> null");
  await adminVerify(adm, e.id);
  const r2 = await me();
  ck("M-04", r2.status === 200 && r2.data.unverifyReason === null && r2.data.isVerified === true, errStr(r2));
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
