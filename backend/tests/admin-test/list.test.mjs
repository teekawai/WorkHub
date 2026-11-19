// GET /api/admin/employers — danh sách công ty cho Admin duyệt (keyword, isVerified, phân trang, openJobCount)
// Chạy riêng: node backend/tests/admin-test/list.test.mjs   (chạy tất cả: node backend/tests/admin-test/run.mjs)
import {
  J, TS, adminGet, ck, errStr, isErr, isMain, makeEmployerSafe, makeUserSafe, mkJob, runAdminSuites, sharedAdmin,
} from "./lib.mjs";

export const name = "S: GET /api/admin/employers";

export default async function run(ctx) {
  const adm = await sharedAdmin(ctx);
  const TAG = `AdQa${TS}`;
  // tên A < B < C; chỉ B có "Đ" ở giữa nên không ảnh hưởng thứ tự A→Z
  const nA = `${TAG} A Alpha`, nB = `${TAG} B Đông`, nC = `${TAG} C Gamma`;
  const eA = await makeEmployerSafe("LS_A", true, nA);
  const eB = await makeEmployerSafe("LS_B", true, nB);
  const eC = await makeEmployerSafe("LS_C", false, nC); // chưa xác minh
  await makeUserSafe("LS_NP", "employer"); // không profile
  const tagged = [eA, eB, eC].map((e) => e.id);
  const ids = (r) => r.data.items.map((x) => x.userId);
  const q = (kw, extra = "") => adminGet(adm, `?keyword=${encodeURIComponent(kw)}${extra}`);

  // openJobCount: eA có 2 Open + 1 Closed -> 2
  const j1 = await mkJob(eA, { jobTitle: "AD list 1" });
  await mkJob(eA, { jobTitle: "AD list 2" });
  const j3 = await mkJob(eA, { jobTitle: "AD list 3" });
  const closed = await J("PATCH", `/jobs/${j3.jobId}/status`, eA.token, { status: "Closed" });
  ck("S-00", closed.status === 200 && j1, errStr(closed));

  console.log("\n── S-01: keyword theo tên công ty + thứ tự A→Z");
  const byTag = await q(TAG);
  ck("S-01", byTag.status === 200 && JSON.stringify(ids(byTag)) === JSON.stringify(tagged), `ids=${JSON.stringify(byTag.data?.items?.map((x) => x.companyName))}`);
  ck("S-01", byTag.data?.pagination?.totalItems === 3 && byTag.data.pagination.limit === 30 && byTag.data.pagination.currentPage === 1, JSON.stringify(byTag.data?.pagination));
  const byName = await q(nA);
  ck("S-01", byName.status === 200 && JSON.stringify(ids(byName)) === JSON.stringify([eA.id]), errStr(byName));
  const lower = await q(nC.toLowerCase());
  ck("S-01", JSON.stringify(ids(lower)) === JSON.stringify([eC.id]), "keyword không phân biệt hoa thường");

  console.log("\n── S-02: keyword theo email");
  const byMail = await q(eB.email ?? `jobqa_${TS}_LS_B@test.com`);
  ck("S-02", byMail.status === 200 && JSON.stringify(ids(byMail)) === JSON.stringify([eB.id]), errStr(byMail));
  const mailNoProfile = await q(`jobqa_${TS}_LS_NP@test.com`);
  ck("S-02", mailNoProfile.status === 200 && mailNoProfile.data.items.length === 0, `employer không profile không được xuất hiện: ${errStr(mailNoProfile)}`);

  console.log("\n── S-03: 'd' khớp 'Đ' (khoanh theo TAG)");
  const dd = await q(`${TAG} b d`);
  ck("S-03", JSON.stringify(ids(dd)) === JSON.stringify([eB.id]), `ids=${JSON.stringify(dd.data?.items?.map((x) => x.companyName))}`);
  const dD = await q(`${TAG} B Đ`);
  ck("S-03", JSON.stringify(ids(dD)) === JSON.stringify([eB.id]), "keyword có Đ vẫn khớp");

  console.log("\n── S-04: keyword 255 ok / 256 -> 400 errors.keyword");
  const k255 = await q("a".repeat(255));
  ck("S-04", k255.status === 200, errStr(k255));
  const k256 = await q("a".repeat(256));
  ck("S-04", isErr(k256, 400, "VALIDATION_ERROR") && k256.data.errors?.keyword, errStr(k256));

  console.log("\n── S-05: isVerified");
  const unv = await q(TAG, "&isVerified=false");
  ck("S-05", JSON.stringify(ids(unv)) === JSON.stringify([eC.id]) && unv.data.items[0].isVerified === false, errStr(unv));
  const ver = await q(TAG, "&isVerified=true");
  ck("S-05", JSON.stringify(ids(ver)) === JSON.stringify([eA.id, eB.id]) && ver.data.items.every((x) => x.isVerified === true), errStr(ver));
  ck("S-05", (await q(TAG, "&isVerified=abc")).status === 400, "isVerified không phải bool -> 400");

  console.log("\n── S-06: không lộ field nhạy cảm, đủ field cần thiết");
  const it = byTag.data.items[0];
  const need = ["userId", "companyName", "email", "emailVerified", "phone", "taxCode", "address", "field", "isVerified", "openJobCount"];
  ck("S-06", need.every((k) => k in it), `thiếu field: ${need.filter((k) => !(k in it))}`);
  const banned = ["passwordHash", "role", "username", "password", "token", "refreshToken"];
  const leaked = banned.filter((k) => byTag.data.items.some((x) => Object.keys(x).some((kk) => kk.toLowerCase() === k.toLowerCase())));
  ck("S-06", leaked.length === 0, `lộ field: ${leaked}`);
  ck("S-06", !/\$2[aby]\$/.test(byTag.text) && !/passwordhash/i.test(byTag.text), "body chứa hash mật khẩu");

  console.log("\n── S-07: openJobCount");
  const a = byTag.data.items.find((x) => x.userId === eA.id);
  ck("S-07", a.openJobCount === 2, `2 Open + 1 Closed -> ${a.openJobCount}`);
  ck("S-07", byTag.data.items.filter((x) => x.userId !== eA.id).every((x) => x.openJobCount === 0), "employer không có Job phải = 0");

  console.log("\n── S-08: phân trang");
  const got = [];
  for (let p = 1; p <= 3; p++) {
    const r = await q(TAG, `&limit=1&page=${p}`);
    ck("S-08", r.status === 200 && r.data.items.length === 1 && r.data.pagination.totalPages === 3 && r.data.pagination.totalItems === 3 && r.data.pagination.limit === 1, errStr(r));
    got.push(...ids(r));
  }
  ck("S-08", new Set(got).size === 3 && JSON.stringify(got) === JSON.stringify(tagged), `ghép limit=1: ${got}`);
  const p4 = await q(TAG, "&limit=1&page=4");
  ck("S-08", p4.status === 200 && p4.data.items.length === 0, errStr(p4));
  const big = await q(TAG, "&limit=100");
  ck("S-08", big.status === 200 && big.data.pagination.limit === 30, `limit=100 tự hạ về 30: ${JSON.stringify(big.data?.pagination)}`);
  const all = await adminGet(adm, "?limit=100");
  ck("S-08", all.status === 200 && all.data.items.length <= 30 && all.data.pagination.limit === 30, "không lọc: tối đa 30 item/trang");
  ck("S-08", isErr(await adminGet(adm, "?page=0"), 400, "VALIDATION_ERROR"), "page=0 -> 400 VALIDATION_ERROR");
  ck("S-08", (await adminGet(adm, "?limit=0")).status === 400, "limit=0 -> 400");
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
