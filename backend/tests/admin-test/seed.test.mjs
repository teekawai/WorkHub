// AdminSeeder: tạo tài khoản admin lúc BE khởi động từ Admin__Email / Admin__Password (BE phụ cổng 5166, cần đã `dotnet build backend`)
// Chạy riêng: node backend/tests/admin-test/seed.test.mjs   (chạy tất cả: node backend/tests/admin-test/run.mjs)
import {
  TEMP_PWD, TS, ck, cleanTempAdmins, isMain, makeUserSafe, randTag, runAdminSuites, sql, sqlInt, withExtraBackend,
} from "./lib.mjs";

export const name = "D: AdminSeeder (BE phụ cổng 5166)";

const BASE = "http://localhost:5166/api";
async function post(p, body) {
  const res = await fetch(`${BASE}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch { /* không phải JSON */ }
  return { status: res.status, data };
}
const adminCount = (e) => sqlInt(`SELECT COUNT(*) FROM users WHERE role='admin' AND email='${e}'`);
const userCount = (e) => sqlInt(`SELECT COUNT(*) FROM users WHERE email='${e}'`);

// BE phụ khởi động với env cho trước; id gắn vào assert "khởi động được"; fn chạy khi BE đã lên; cổng bận / không lên được thì FAIL
async function withBe(id, env, fn) {
  let ran = false;
  await withExtraBackend(id, env, async (base, getLog) => { ran = true; await fn(base, getLog); });
  ck(id, ran, "BE phụ không chạy được kịch bản (cổng 5166 bận hoặc BE không khởi động)");
}

export default async function run() {
  try {
    console.log("\n── D-01: email mới -> tạo đúng 1 admin, đăng nhập được, restart vẫn 1");
    {
      const email = `qa_admin_${TS}_seed1@test.com`.toLowerCase();
      const password = `Seed!${randTag()}${randTag()}`;
      // cấu hình viết hoa + khoảng trắng: seeder phải trim + lowercase
      const env = { Admin__Email: ` ${email.toUpperCase()} `, Admin__Password: password };
      await withBe("D-01", env, async () => {
        ck("D-01", adminCount(email) === 1, `DB có ${adminCount(email)} admin '${email}'`);
        const [username, ev, hashHead] = sql(`SELECT CONCAT(username,'|',emailVerified+0,'|',LEFT(passwordHash,4)) FROM users WHERE email='${email}'`).split("|");
        ck("D-01", username === "admin" && ev === "0" && /^\$2[aby]\$$/.test(hashHead), `username / emailVerified / hash bcrypt: ${username} ${ev} ${hashHead}`);
        const ok = await post("/admin/login", { email, password, rememberMe: false });
        ck("D-01", ok.status === 200 && ok.data?.role === "admin" && ok.data?.email === email && typeof ok.data.accessToken === "string", `đăng nhập qua BE phụ: ${ok.status} ${JSON.stringify(ok.data)?.slice(0, 150)}`);
        const wrong = await post("/admin/login", { email, password: password + "x", rememberMe: false });
        ck("D-01", wrong.status === 401, `sai mật khẩu -> ${wrong.status}`);
        // email admin dùng /api/auth/login -> không đăng nhập được
        const viaAuth = await post("/auth/login", { email, password, rememberMe: false });
        ck("D-01", viaAuth.status === 401 && !viaAuth.data?.accessToken, `auth/login bằng email admin -> ${viaAuth.status}`);
      });
      // khởi động lại với cùng cấu hình: vẫn đúng 1, không tạo trùng
      await withBe("D-01", env, async () => {
        ck("D-01", adminCount(email) === 1, `sau restart có ${adminCount(email)} admin '${email}' (mong đợi 1)`);
      });
    }

    console.log("\n── D-02: email trùng user thường -> BE vẫn lên, không đụng user đó, không nâng lên admin");
    {
      const normal = await makeUserSafe("SeedN", "finder");
      const email = `jobqa_${TS}_SeedN@test.com`.toLowerCase(); // email makeUser đặt cho user thường
      const before = sql(`SELECT CONCAT(userId,'|',role,'|',email,'|',passwordHash) FROM users WHERE userId='${normal.id}'`);
      ck("D-02", userCount(email) === 1, "tiền điều kiện: có đúng 1 user thường với email này");
      await withBe("D-02", { Admin__Email: email, Admin__Password: `Seed!${randTag()}${randTag()}` }, async () => {
        ck("D-02", adminCount(email) === 0, `không được có admin '${email}'`);
        const after = sql(`SELECT CONCAT(userId,'|',role,'|',email,'|',passwordHash) FROM users WHERE userId='${normal.id}'`);
        ck("D-02", after === before && userCount(email) === 1, "user thường bị đổi / thêm user trùng email");
        const login = await post("/admin/login", { email, password: TEMP_PWD, rememberMe: false });
        ck("D-02", login.status === 401, `user thường không đăng nhập được bằng /admin/login -> ${login.status}`);
      });
    }

    console.log("\n── D-03: thiếu / quá ngắn Admin__Password -> BE vẫn lên, không tạo");
    for (const [label, pwd] of [["toàn khoảng trắng", "   "], ["7 ký tự", "Abc!123"]]) {
      const email = `qa_admin_${TS}_seed_${label.startsWith("7") ? "short" : "blank"}@test.com`.toLowerCase();
      await withBe("D-03", { Admin__Email: email, Admin__Password: pwd }, async () => {
        ck("D-03", userCount(email) === 0, `${label}: không được tạo user '${email}' (có ${userCount(email)})`);
      });
    }
    // thiếu Email (toàn khoảng trắng) kèm mật khẩu hợp lệ -> không tạo admin mới nào
    {
      const before = sqlInt(`SELECT COUNT(*) FROM users WHERE role='admin'`);
      await withBe("D-03", { Admin__Email: "   ", Admin__Password: `Seed!${randTag()}${randTag()}` }, async () => {
        const after = sqlInt(`SELECT COUNT(*) FROM users WHERE role='admin'`);
        ck("D-03", after === before, `thiếu Email: số admin ${before} -> ${after}`);
      });
    }
  } finally {
    cleanTempAdmins(); // admin do BE phụ tạo không nằm trong danh sách dọn của job-test lib
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
