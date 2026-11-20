// AC: admin verify / unverify phải xóa khóa profile:employer:{id}; employer GET /me thấy isVerified / unverifyReason mới ngay
// Chạy riêng: node backend/tests/profile-cache-test/admin-verify.test.mjs
import { J, adminUnverify, adminVerify, ck, empKey, errStr, isErr, isMain, keyExists, makeEmployerSafe, prime, runAdminSuites, sharedAdmin, uid } from "./lib.mjs";

export const name = "AC: admin verify/unverify xóa cache employer";

export default async function run(ctx) {
  const adm = await sharedAdmin(ctx);
  const e = await makeEmployerSafe("pc_a1", false);
  const other = await makeEmployerSafe("pc_a2", false);
  const K = empKey(e.id), Ko = empKey(other.id);
  const me = () => J("GET", "/employer/me", e.token);

  console.log("\n── AC-01: verify xong khóa mất, GET thấy isVerified=true");
  {
    const p = await prime("/employer/me", e.token, K);
    const po = await prime("/employer/me", other.token, Ko);
    ck("AC-01", p.primed && po.primed && p.r1.data.isVerified === false, `nạp cache: ${errStr(p.r1)}`);
    const v = await adminVerify(adm, e.id);
    ck("AC-01", v.status === 200, `verify ${errStr(v)}`);
    ck("AC-01", !(await keyExists(K)), "sau verify khóa employer phải mất");
    ck("AC-05", await keyExists(Ko), "verify employer A không được xóa khóa employer B");
    const g = await me();
    ck("AC-01", g.status === 200 && g.data.isVerified === true && g.data.unverifyReason === null, `GET sau verify: ${errStr(g)}`);
  }

  console.log("\n── AC-04: verify khi đã verified (nhánh 'đã ở trạng thái đó'): khóa mất, dữ liệu đúng");
  {
    const p = await prime("/employer/me", e.token, K);
    const v = await adminVerify(adm, e.id);
    ck("AC-04", p.primed && v.status === 200 && !(await keyExists(K)), `verify lại ${errStr(v)}, khóa còn=${await keyExists(K)}`);
    const g = await me();
    ck("AC-04", g.status === 200 && g.data.isVerified === true, errStr(g));
  }

  console.log("\n── AC-02: unverify xong khóa mất, GET thấy isVerified=false + lý do (đã trim)");
  {
    const p = await prime("/employer/me", e.token, K);
    ck("AC-02", p.primed && p.r2.data.isVerified === true, `nạp cache: ${errStr(p.r1)}`);
    const u = await adminUnverify(adm, e.id, { reason: "  Lý do cache 1  " });
    ck("AC-02", u.status === 200, `unverify ${errStr(u)}`);
    ck("AC-02", !(await keyExists(K)), "sau unverify khóa phải mất");
    const g = await me();
    ck("AC-02", g.status === 200 && g.data.isVerified === false && g.data.unverifyReason === "Lý do cache 1", `GET sau unverify: ${errStr(g)}`);
  }

  console.log("\n── AC-03: unverify lần 2 (đã thu hồi): khóa mất, lý do vẫn là lý do cũ");
  {
    const p = await prime("/employer/me", e.token, K);
    const u = await adminUnverify(adm, e.id, { reason: "Lý do khác" });
    ck("AC-03", p.primed && u.status === 200 && !(await keyExists(K)), `unverify lần 2 ${errStr(u)}, khóa còn=${await keyExists(K)}`);
    const g = await me();
    ck("AC-03", g.data?.isVerified === false && g.data?.unverifyReason === "Lý do cache 1", errStr(g));
  }

  console.log("\n── AC-06: admin verify / unverify user không tồn tại -> 404, không tạo khóa, không 5xx");
  {
    const ghost = uid();
    const v = await adminVerify(adm, ghost), u = await adminUnverify(adm, ghost, { reason: "x" });
    ck("AC-06", isErr(v, 404, "EMPLOYER_NOT_FOUND") && isErr(u, 404, "EMPLOYER_NOT_FOUND") && !(await keyExists(empKey(ghost))), `${errStr(v)} | ${errStr(u)}`);
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
