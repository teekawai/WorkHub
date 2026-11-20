// EC: GET /api/employer/me (cache) + PUT /api/employer/me xóa khóa. POST /me/logo thành công không test (Cloudinary thật, Lead chốt 2026-11-20)
// Chạy riêng: node backend/tests/profile-cache-test/employer-me.test.mjs
import { J, ck, empKey, errStr, isMain, keyExists, makeEmployerSafe, makeUserSafe, prime, profileOf, randTag, redisCmd, runAdminSuites } from "./lib.mjs";

export const name = "EC: GET/PUT /api/employer/me (cache Redis)";

export default async function run() {
  const e = await makeEmployerSafe("pc_e1", true);
  const K = empKey(e.id);

  console.log("\n── EC-01/02: GET tạo khóa, có TTL");
  ck("EC-01", !(await keyExists(K)), "trước GET khóa phải chưa có (PUT / SQL không được tự nạp cache)");
  const g1 = await J("GET", "/employer/me", e.token);
  ck("EC-02", g1.status === 200 && (await keyExists(K)), `GET ${errStr(g1)}, khóa có=${await keyExists(K)}`);
  const ttl = await redisCmd("TTL", K);
  ck("EC-02", ttl > 0 && ttl <= 600, `TTL=${ttl}, phải trong (0, 600]`);

  console.log("\n── EC-04: PUT xong khóa mất ngay, GET thấy dữ liệu mới");
  {
    const p = await prime("/employer/me", e.token, K);
    ck("EC-04", p.primed, `không nạp được cache: ${errStr(p.r1)}`);
    const body = { ...profileOf.pc_e1, address: `Địa chỉ mới ${randTag()}`, description: "mô tả mới" }; // không đổi tên công ty: e1 đã verified -> 409 COMPANY_NAME_LOCKED
    const put = await J("PUT", "/employer/me", e.token, body);
    ck("EC-04", put.status === 200, `PUT ${errStr(put)}`);
    ck("EC-04", !(await keyExists(K)), "sau PUT 200 khóa phải mất");
    const g = await J("GET", "/employer/me", e.token);
    ck("EC-04", g.status === 200 && g.data.address === body.address && g.data.description === body.description, `GET sau PUT: ${errStr(g)}`);
    ck("EC-04", await keyExists(K), "GET sau PUT nạp lại khóa");
    profileOf.pc_e1 = body;
  }

  console.log("\n── EC-05: PUT lỗi 400 không làm đổi dữ liệu GET");
  {
    const p = await prime("/employer/me", e.token, K);
    const bad = await J("PUT", "/employer/me", e.token, { ...profileOf.pc_e1, phone: "abc" });
    const g = await J("GET", "/employer/me", e.token);
    ck("EC-05", p.primed && bad.status === 400 && JSON.stringify(g.data) === JSON.stringify(p.r1.data), `PUT ${errStr(bad)} | GET ${errStr(g)}`);
  }

  console.log("\n── EC-05b: PUT 409 trùng tên công ty (hồ sơ người khác) không đổi dữ liệu GET");
  {
    await makeEmployerSafe("pc_e2", false);
    const p = await prime("/employer/me", e.token, K);
    const dup = await J("PUT", "/employer/me", e.token, { ...profileOf.pc_e1, companyName: profileOf.pc_e2.companyName });
    const g = await J("GET", "/employer/me", e.token);
    ck("EC-05b", p.primed && dup.status === 409 && g.data?.companyName === profileOf.pc_e1.companyName, `PUT ${errStr(dup)} | GET ${errStr(g)}`);
  }

  console.log("\n── EC-03/07: chưa có hồ sơ: GET 404 không tạo khóa; PUT tạo xong GET 200 ngay");
  {
    const n = await makeUserSafe("pc_e0", "employer");
    const Kn = empKey(n.id);
    const r1 = await J("GET", "/employer/me", n.token), r2 = await J("GET", "/employer/me", n.token);
    ck("EC-03", r1.status === 404 && r2.status === 404 && r1.data?.code && typeof r1.data?.message === "string", `${errStr(r1)} | ${errStr(r2)}`);
    ck("EC-03", !(await keyExists(Kn)), "404 không được tạo khóa");
    const body = { companyName: `PCQA_${randTag()}`, address: "1 Đường Cache", field: "IT", phone: "0901234567", taxCode: `${Date.now()}`.slice(-10), foundedYear: 2020 };
    const put = await J("PUT", "/employer/me", n.token, body);
    const g = await J("GET", "/employer/me", n.token);
    ck("EC-07", put.status === 200 && g.status === 200 && g.data.companyName === body.companyName && g.data.isVerified === false, `PUT ${errStr(put)} | GET ${errStr(g)}`);
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
