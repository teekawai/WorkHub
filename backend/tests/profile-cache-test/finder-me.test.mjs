// FC: GET /api/finders/me (cache) + PUT /api/finders/me xóa khóa. POST avatar/cv thành công không test (Cloudinary thật, Lead chốt 2026-11-20); nhánh lỗi 404/400 có test
// Chạy riêng: node backend/tests/profile-cache-test/finder-me.test.mjs
import { API, J, ck, errStr, finKey, finderBody, isMain, keyExists, makeFinderSafe, prime, randTag, redisCmd, runAdminSuites } from "./lib.mjs";

export const name = "FC: GET/PUT /api/finders/me (cache Redis)";

// field "avatar" -> /me/avatar, field "cv" -> /me/cv
const upload = (token, field, fname, type, content) => {
  const f = new FormData();
  f.append(field, new Blob([content], { type }), fname);
  return fetch(`${API}/finders/me/${field}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: f });
};

export default async function run() {
  const f = await makeFinderSafe("pc_f1", true);
  const K = finKey(f.id);

  console.log("\n── FC-01/02: GET tạo khóa, có TTL");
  ck("FC-01", !(await keyExists(K)), "trước GET khóa phải chưa có");
  const g1 = await J("GET", "/finders/me", f.token);
  ck("FC-02", g1.status === 200 && (await keyExists(K)), `GET ${errStr(g1)}`);
  const ttl = await redisCmd("TTL", K);
  ck("FC-02", ttl > 0 && ttl <= 600, `TTL=${ttl}, phải trong (0, 600]`);

  console.log("\n── FC-04: PUT xong khóa mất ngay, GET thấy dữ liệu mới");
  {
    const p = await prime("/finders/me", f.token, K);
    ck("FC-04", p.primed, `không nạp được cache: ${errStr(p.r1)}`);
    const body = finderBody({ fullname: `Tên mới ${randTag()}`, skill: "Go, Rust", gender: "Female" });
    const put = await J("PUT", "/finders/me", f.token, body);
    ck("FC-04", put.status === 200 && !(await keyExists(K)), `PUT ${errStr(put)}, khóa còn=${await keyExists(K)}`);
    const g = await J("GET", "/finders/me", f.token);
    ck("FC-04", g.status === 200 && g.data.fullname === body.fullname && g.data.skill === "Go, Rust" && g.data.gender === "Female", `GET sau PUT: ${errStr(g)}`);
  }

  console.log("\n── FC-07: PUT 400 / upload sai đuôi 400 không đổi dữ liệu GET");
  {
    const p = await prime("/finders/me", f.token, K);
    const bad = await J("PUT", "/finders/me", f.token, { ...finderBody(), phone: "abc" });
    const up = await upload(f.token, "avatar", "bad.txt", "text/plain", "x");
    const upCv = await upload(f.token, "cv", "bad.jpg", "image/jpeg", "x");
    const g = await J("GET", "/finders/me", f.token);
    const changed = JSON.stringify(g.data) !== JSON.stringify(p.r1.data);
    ck("FC-07", p.primed && bad.status === 400 && up.status === 400 && upCv.status === 400 && !changed, `PUT ${bad.status}, avatar ${up.status}, cv ${upCv.status}, GET đổi=${changed}`);
  }

  console.log("\n── FC-03: chưa có hồ sơ: GET 404 không tạo khóa; upload 404; PUT tạo xong GET 200 ngay");
  {
    const n = await makeFinderSafe("pc_f0", false);
    const Kn = finKey(n.id);
    const r1 = await J("GET", "/finders/me", n.token), r2 = await J("GET", "/finders/me", n.token);
    ck("FC-03", r1.status === 404 && r2.status === 404 && r1.data?.code && typeof r1.data?.message === "string", `${errStr(r1)} | ${errStr(r2)}`);
    ck("FC-03", !(await keyExists(Kn)), "404 không được tạo khóa");
    const a = await upload(n.token, "avatar", "a.jpg", "image/jpeg", "x"), c = await upload(n.token, "cv", "c.pdf", "application/pdf", "%PDF");
    ck("FC-03", a.status === 404 && c.status === 404 && !(await keyExists(Kn)), `avatar ${a.status}, cv ${c.status}`);
    const body = finderBody({ fullname: `Tạo mới ${randTag()}` });
    const put = await J("PUT", "/finders/me", n.token, body);
    const g = await J("GET", "/finders/me", n.token);
    ck("FC-03", put.status === 200 && g.status === 200 && g.data.fullname === body.fullname, `PUT ${errStr(put)} | GET ${errStr(g)}`);
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
