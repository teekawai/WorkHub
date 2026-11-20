// POST /api/admin/login — đăng nhập admin, khóa IP 30 phút sau 5 lần sai (PLAN_Admin 2)
// Chạy riêng: node backend/tests/admin-test/login.test.mjs   (chạy tất cả: node backend/tests/admin-test/run.mjs)
import fs from "node:fs";
import path from "node:path";
import {
  BACKEND_DIR, BAD_CRED, LOCK_MSG, adminLoginOnce, ck, clearAdminLock, errStr, isAdminLock, isMain, lockKeysLeft, makeTempAdmin,
  paceAuth, untilNotRateLimited, randTag, raw, redisCmd, runAdminSuites, sleep,
} from "./lib.mjs";

export const name = "L: POST /api/admin/login";

// Serilog ghi theo giờ máy (không phải giờ VN); BE phụ ghi sang file _001, _002...
function todayLogs() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const dir = path.join(BACKEND_DIR, "logs");
  return fs.readdirSync(dir).filter((f) => f.startsWith(`workhub-${ymd}`) && f.endsWith(".log")).map((f) => path.join(dir, f));
}
function readLogs() {
  return todayLogs().map((f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } }).join("\n");
}

export default async function run(ctx) {
  const adm = await makeTempAdmin("LGN");
  const wrong = () => `Sai_${randTag()}`;
  const assertClean = async (id) => {
    const left = await clearAdminLock();
    ck(id, left.length === 0, `key khóa admin còn sót sau khi xóa: ${left.join(",")}`);
  };
  try {
    // ── L-01 đăng nhập đúng
    console.log("\n── L-01: đúng mật khẩu");
    await assertClean("L-01");
    const ok = await adminLoginOnce(adm.email, adm.password);
    ck("L-01", ok.status === 200 && typeof ok.data?.accessToken === "string" && ok.data.role === "admin"
      && ok.data.email === adm.email && ok.data.userId === adm.id, errStr(ok));
    ck("L-01", !/passwordHash/i.test(ok.text), "response lộ passwordHash");
    const payload = JSON.parse(Buffer.from(ok.data.accessToken.split(".")[1], "base64url").toString());
    ck("L-01", Object.values(payload).includes("admin"), `JWT thiếu role admin: ${JSON.stringify(payload)}`);

    // ── L-02 sai mật khẩu / sai email: cùng message, cùng body
    console.log("\n── L-02: sai mật khẩu / sai email");
    await assertClean("L-02");
    const badPwd = await adminLoginOnce(adm.email, wrong());
    const badUser = await adminLoginOnce(`qa_nouser_${randTag()}@test.com`, adm.password);
    ck("L-02", badPwd.status === 401 && badPwd.data?.message === BAD_CRED, errStr(badPwd));
    ck("L-02", badUser.status === 401 && badUser.data?.message === BAD_CRED, errStr(badUser));
    ck("L-02", JSON.stringify(badPwd.data) === JSON.stringify(badUser.data), "body sai mật khẩu và sai email phải giống hệt (không lộ email nào là admin)");
    // validation (400) không được tính vào lượt khóa
    const short = await adminLoginOnce(adm.email, "short");
    ck("L-02", short.status === 400, `mật khẩu < 8 ký tự -> ${errStr(short)}`);
    const noUser = await raw("POST", "/admin/login", { body: { password: "Abcdef123" } });
    ck("L-02", noUser.status === 400, `thiếu email -> ${errStr(noUser)}`);
    // /api/auth/login bằng email của admin: cùng message, không đăng nhập được
    const viaAuth = await untilNotRateLimited(() => raw("POST", "/auth/login", { body: { email: adm.email, password: adm.password, rememberMe: false } }));
    ck("L-03", viaAuth.status === 401 && viaAuth.data?.message === BAD_CRED && !viaAuth.data?.accessToken, `auth/login bằng email admin -> ${errStr(viaAuth)}`);

    // ── L-04 4 sai + 1 đúng + 4 sai chưa khóa; kết thúc bằng lượt đúng -> 200 (Reset hỏng thì lượt này bị khóa)
    console.log("\n── L-04: 4 sai + 1 đúng + 4 sai");
    await assertClean("L-04");
    const seq = [];
    for (let i = 0; i < 4; i++) seq.push((await adminLoginOnce(adm.email, wrong())).status);
    seq.push((await adminLoginOnce(adm.email, adm.password)).status);
    for (let i = 0; i < 4; i++) seq.push((await adminLoginOnce(adm.email, wrong())).status);
    const fin = await adminLoginOnce(adm.email, adm.password);
    ck("L-04", JSON.stringify(seq) === JSON.stringify([401, 401, 401, 401, 200, 401, 401, 401, 401]), `chuỗi trạng thái: ${seq}`);
    ck("L-04", fin.status === 200, `lượt đúng cuối phải 200 (đăng nhập đúng phải xóa bộ đếm): ${errStr(fin)}`);

    // ── L-05 5 sai -> lượt 6 (đúng mật khẩu) bị khóa
    console.log("\n── L-05: 5 sai -> lượt 6 bị khóa 30 phút");
    await assertClean("L-05");
    const five = [];
    for (let i = 0; i < 5; i++) five.push((await adminLoginOnce(adm.email, wrong())).status);
    ck("L-05", five.every((s) => s === 401), `5 lượt sai phải đều 401: ${five}`);
    // key fail của đúng IP mà BE thấy (1 trong 3 biến thể localhost) = 5
    const failVals = [];
    for (const ip of ["::1", "127.0.0.1", "::ffff:127.0.0.1"]) failVals.push(await redisCmd("GET", `admin-login:fail:${ip}`));
    ck("L-05", failVals.filter((v) => v === "5").length === 1, `key admin-login:fail:<ip localhost> phải có đúng 1 cái = 5: ${JSON.stringify(failVals)}`);
    const sixth = await adminLoginOnce(adm.email, adm.password);
    ck("L-05", isAdminLock(sixth), `lượt 6 (đúng mật khẩu) phải bị khóa (429 + message khóa + Retry-After 1790..1800): ${errStr(sixth)} retry-after=${sixth.headers.get("retry-after")}`);
    const lockKey = (await lockKeysLeft()).find((k) => k.startsWith("admin-login:lock:"));
    const pttl = lockKey ? await redisCmd("PTTL", lockKey) : -2;
    ck("L-05", pttl > 1_790_000 && pttl <= 1_800_000, `PTTL key khóa ${lockKey} = ${pttl} (mong đợi ~30 phút)`);
    const other = await adminLoginOnce(`qa_nouser_${randTag()}@test.com`, wrong());
    ck("L-05", isAdminLock(other), `khóa theo IP: email khác cũng bị khóa: ${errStr(other)}`);
    const again = await adminLoginOnce(adm.email, adm.password);
    ck("L-05", isAdminLock(again), `vẫn khóa khi thử lại: ${errStr(again)}`);
    await assertClean("L-05");
    const afterClear = await adminLoginOnce(adm.email, adm.password);
    ck("L-05", afterClear.status === 200, `xóa key khóa xong đăng nhập lại được: ${errStr(afterClear)}`);

    // ── L-06 burst 20 request sai song song cùng IP: đúng 5 lần được verify (401), 15 lần bị khóa
    console.log("\n── L-06: burst 20 request sai song song");
    await assertClean("L-06");
    await paceAuth(22);
    const burst = await Promise.all(Array.from({ length: 20 }, () => untilNotRateLimited(() => raw("POST", "/admin/login", { body: { email: adm.email, password: wrong(), rememberMe: false } }))));
    const n401 = burst.filter((r) => r.status === 401 && r.data?.message === BAD_CRED).length;
    const nLock = burst.filter(isAdminLock).length;
    const odd = burst.filter((r) => !(r.status === 401 && r.data?.message === BAD_CRED) && !isAdminLock(r)).map(errStr);
    ck("L-06", n401 === 5 && nLock === 15 && odd.length === 0, `401=${n401} khóa=${nLock} khác=${JSON.stringify(odd.slice(0, 3))} (mong đợi 5 / 15 / 0)`);
    const post = await adminLoginOnce(adm.email, adm.password);
    ck("L-06", isAdminLock(post), `sau burst đăng nhập đúng vẫn bị khóa: ${errStr(post)}`);
    await assertClean("L-06");

    // ── L-07 log: có dòng thất bại với email, KHÔNG chứa mật khẩu sai
    console.log("\n── L-07: log đăng nhập thất bại");
    await assertClean("L-07");
    const badName = `qa_nouser_${randTag()}@test.com`;
    const badPw = `Wp_${randTag()}${randTag()}`;
    const r7 = await adminLoginOnce(badName, badPw);
    ck("L-07", r7.status === 401, errStr(r7));
    let line = "", logs = "";
    for (let i = 0; i < 10 && !line; i++) {
      logs = readLogs();
      line = logs.split(/\r?\n/).find((l) => l.includes("Đăng nhập admin thất bại") && l.includes(badName)) || "";
      if (!line) await sleep(500);
    }
    ck("L-07", line !== "", `không thấy dòng "Đăng nhập admin thất bại" chứa email ${badName} trong ${todayLogs().map((f) => path.basename(f)).join(", ")}`);
    ck("L-07", logs.length > 0 && !logs.includes(badPw), "log chứa mật khẩu sai đã gửi");
    // dòng bị chặn do khóa cũng không được chứa mật khẩu
    for (let i = 0; i < 5; i++) await adminLoginOnce(adm.email, wrong());
    const pwLock = `Lk_${randTag()}${randTag()}`;
    const locked = await adminLoginOnce(adm.email, pwLock);
    ck("L-07", isAdminLock(locked), errStr(locked));
    await sleep(700);
    ck("L-07", !readLogs().includes(pwLock), "log lượt bị khóa chứa mật khẩu");
  } finally {
    await clearAdminLock().catch(() => {});
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
