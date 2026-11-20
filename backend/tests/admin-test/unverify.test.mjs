// PATCH /api/admin/employers/{userId}/unverify — thu hồi xác minh + đóng mọi Job Open (cả race với POST /api/jobs)
// Chạy riêng: node backend/tests/admin-test/unverify.test.mjs   (chạy tất cả: node backend/tests/admin-test/run.mjs)
import {
  J, TODAY, addDays, adminUnverify, adminVerify, bearer, ck, delayed, errStr, isErr, isMain, jobCountDb, jobStatusDb, makeEmployerSafe,
  mkJob, note, profileDb, raw, runAdminSuites, setDeadline, sharedAdmin, sql, tally, uid, validJob,
} from "./lib.mjs";

export const name = "U: PATCH /api/admin/employers/:id/unverify";

const ROUNDS = 30;

export default async function run(ctx) {
  const adm = await sharedAdmin(ctx);

  console.log("\n── U-01: validation reason");
  {
    const e = await makeEmployerSafe("U_val", true);
    await mkJob(e, { jobTitle: "U val" });
    const bodies = { "thiếu reason": {}, "null": { reason: null }, "rỗng": { reason: "" }, "khoảng trắng": { reason: "   \t " }, "501 ký tự": { reason: "a".repeat(501) }, "501 sau trim": { reason: "  " + "a".repeat(501) + "  " } };
    for (const [label, b] of Object.entries(bodies)) {
      const r = await adminUnverify(adm, e.id, b);
      ck("U-01", isErr(r, 400, "VALIDATION_ERROR") && r.data.errors?.reason, `${label} -> ${errStr(r)}`);
    }
    const emptyJson = await raw("PATCH", `/admin/employers/${e.id}/unverify`, { rawBody: "", headers: { ...bearer(adm.token), "Content-Type": "application/json" } });
    ck("U-01", emptyJson.status === 400, `body rỗng (Content-Type json) -> ${errStr(emptyJson)}`);
    const noBody = await adminUnverify(adm, e.id, undefined);
    note("U-01", `không có body và không Content-Type -> ${noBody.status} (mặc định của framework, FE luôn gửi JSON)`);
    ck("U-01", profileDb(e.id)[0] === "1" && jobCountDb(e.id, "Open") === 1, "validation lỗi thì không được đổi gì trong DB");
    // validation chạy trước khi tra employer
    const r404 = await adminUnverify(adm, uid(), {});
    ck("U-01", isErr(r404, 400, "VALIDATION_ERROR"), `body sai + userId lạ -> ${errStr(r404)}`);
    const nf = await adminUnverify(adm, uid(), { reason: "x" });
    ck("U-01", isErr(nf, 404, "EMPLOYER_NOT_FOUND"), errStr(nf));
    const nf2 = await adminUnverify(adm, ctx.U.F1.id, { reason: "x" });
    ck("U-01", isErr(nf2, 404, "EMPLOYER_NOT_FOUND"), `user Finder -> ${errStr(nf2)}`);
  }

  console.log("\n── U-02: 3 Job Open (1 quá hạn) + 1 Closed -> closedJobCount 3");
  {
    const e = await makeEmployerSafe("U_main", true);
    const o1 = await mkJob(e, { jobTitle: "U open 1" });
    const o2 = await mkJob(e, { jobTitle: "U open 2" });
    const o3 = await mkJob(e, { jobTitle: "U open 3 quá hạn" });
    const c = await mkJob(e, { jobTitle: "U closed" });
    ck("U-02", (await J("PATCH", `/jobs/${c.jobId}/status`, e.token, { status: "Closed" })).status === 200, "đóng Job");
    setDeadline(o3.jobId, addDays(TODAY, -1)); // Open nhưng quá hạn chưa được auto-close: vẫn phải bị đếm và đóng
    ck("U-02", jobStatusDb(o3.jobId) === "Open", "tiền điều kiện: Job quá hạn còn Open");

    const r = await adminUnverify(adm, e.id, { reason: "  Hồ sơ không hợp lệ  " });
    ck("U-02", r.status === 200 && r.data.closedJobCount === 3 && r.data.message === "Đã thu hồi xác minh, đã đóng 3 tin tuyển dụng", errStr(r));
    ck("U-02", jobCountDb(e.id, "Open") === 0 && jobCountDb(e.id, "Closed") === 4, `DB Open=${jobCountDb(e.id, "Open")} Closed=${jobCountDb(e.id, "Closed")}`);
    const [v, reason] = profileDb(e.id);
    ck("U-02", v === "0" && reason === "Hồ sơ không hợp lệ", `DB isVerified=${v} reason='${reason}' (phải trim)`);
    ck("U-02", [o1, o2, o3].every((j) => jobStatusDb(j.jobId) === "Closed"), "3 Job Open phải thành Closed");

    // lần 2 với lý do KHÁC: 200, 0 Job, giữ lý do cũ
    const r2 = await adminUnverify(adm, e.id, { reason: "Lý do khác hẳn" });
    ck("U-03", r2.status === 200 && r2.data.closedJobCount === 0 && r2.data.message === "Công ty đã bị thu hồi xác minh", errStr(r2));
    ck("U-03", profileDb(e.id)[1] === "Hồ sơ không hợp lệ", `lý do phải giữ nguyên, thực tế '${profileDb(e.id)[1]}'`);

    // sau unverify employer không đăng được Job
    const post = await J("POST", "/jobs", e.token, validJob({ jobTitle: "U sau unverify" }));
    ck("U-04", isErr(post, 403, "EMPLOYER_NOT_VERIFIED"), errStr(post));
    ck("U-04", jobCountDb(e.id, "Open") === 0, "không có Job mới");

    // verify lại xóa lý do (đường đi đầy đủ unverify -> verify)
    const v2 = await adminVerify(adm, e.id);
    ck("U-04", v2.status === 200 && profileDb(e.id)[1] === "<NULL>", "verify lại xóa lý do");
  }

  console.log("\n── U-05: biên reason 500 ký tự");
  {
    const e = await makeEmployerSafe("U_500", true);
    const r = await adminUnverify(adm, e.id, { reason: "b".repeat(500) });
    ck("U-05", r.status === 200 && r.data.closedJobCount === 0 && profileDb(e.id)[1] === "b".repeat(500), errStr(r));
  }

  console.log("\n── U-07: đối chứng — predicate đếm Job Open của race phải bắt được Job lọt");
  {
    const e = await makeEmployerSafe("U_ctl", true);
    const j = await mkJob(e, { jobTitle: "U control" });
    await adminUnverify(adm, e.id, { reason: "ctl" });
    ck("U-07", jobCountDb(e.id, "Open") === 0, "sau unverify không còn Open");
    sql(`UPDATE job SET status='Open' WHERE jobId='${j.jobId}'`); // giả lập Job lọt qua unverify
    ck("U-07", jobCountDb(e.id, "Open") === 1, "predicate 'Open === 0' của U-06 phải thấy Job lọt (sẽ FAIL nếu có)");
    sql(`UPDATE job SET status='Closed' WHERE jobId='${j.jobId}'`);
  }

  console.log(`\n── U-06: race unverify || POST /api/jobs ×3 (${ROUNDS} vòng, pool 4 employer)`);
  {
    const pool = [];
    for (let i = 0; i < 4; i++) pool.push(await makeEmployerSafe(`U_race${i}`, true));
    const dist = {}; // "201:403" -> số vòng
    let mixed = 0, total201 = 0, total403 = 0;
    for (let round = 0; round < ROUNDS; round++) {
      const e = pool[round % pool.length];
      // mỗi vòng: verify lại qua API admin (không bị rate limit) + SQL xác nhận isVerified=1, rồi mới đua
      const vr = await adminVerify(adm, e.id);
      const preOk = (vr.status === 200) && profileDb(e.id)[0] === "1" && jobCountDb(e.id, "Open") === 0;
      if (!ck("U-06", preOk, `vòng ${round}: tiền điều kiện (verify) ${errStr(vr)} Open=${jobCountDb(e.id, "Open")}`)) continue;

      const rnd = (max) => Math.floor(Math.random() * (max + 1)); // unverify lệch 0..12 ms, POST 0..5 ms: unverify hay tới giữa dãy POST
      const keys = [uid(), uid(), uid()];
      const [ur, ...posts] = await Promise.all([
        delayed(rnd(12), () => adminUnverify(adm, e.id, { reason: `race ${round}` })),
        ...keys.map((k) => delayed(rnd(5), () => raw("POST", "/jobs", { body: validJob({ jobTitle: `U race ${round}` }), headers: { ...bearer(e.token), "Idempotency-Key": k } }))),
      ]);
      const open = jobCountDb(e.id, "Open");
      ck("U-06", open === 0, `vòng ${round}: còn ${open} Job Open sau unverify`);
      ck("U-06", ur.status === 200, `vòng ${round}: unverify -> ${errStr(ur)}`);
      const bad = posts.filter((p) => !(p.status === 201 || isErr(p, 403, "EMPLOYER_NOT_VERIFIED")));
      ck("U-06", bad.length === 0, `vòng ${round}: POST ngoài {201, 403 EMPLOYER_NOT_VERIFIED}: ${bad.map(errStr).join(" | ")}`);
      const created = posts.filter((p) => p.status === 201);
      const denied = posts.filter((p) => p.status === 403);
      // mọi Job đã tạo được thì phải bị unverify đóng (không có Job nào được tạo SAU khi thu hồi)
      for (const p of created) ck("U-06", jobStatusDb(p.data.jobId) === "Closed", `vòng ${round}: Job ${p.data.jobId} tạo được nhưng không Closed`);
      ck("U-06", ur.data?.closedJobCount === created.length, `vòng ${round}: closedJobCount=${ur.data?.closedJobCount} khác số POST 201=${created.length}`);
      // T4: gửi lại cùng Idempotency-Key của lượt 403 -> vẫn 403, không phải 409
      for (let i = 0; i < posts.length; i++) {
        if (posts[i].status !== 403) continue;
        const rep = await raw("POST", "/jobs", { body: validJob({ jobTitle: `U race ${round}` }), headers: { ...bearer(e.token), "Idempotency-Key": keys[i] } });
        ck("U-06", isErr(rep, 403, "EMPLOYER_NOT_VERIFIED"), `vòng ${round}: gửi lại cùng Idempotency-Key -> ${errStr(rep)} (mong đợi 403)`);
      }
      tally(dist, `${created.length}x201/${denied.length}x403`);
      total201 += created.length; total403 += denied.length;
      if (created.length > 0 && denied.length > 0) mixed++;
    }
    note("U-06", `phân bố (số 201/số 403 mỗi vòng -> số vòng): ${JSON.stringify(dist)}; tổng 201=${total201} 403=${total403}; vòng lẫn cả hai=${mixed}/${ROUNDS}`);
    if (mixed === 0) note("U-06", "CẢNH BÁO: race không xảy ra (không có vòng nào vừa 201 vừa 403), kết quả không chứng minh được khóa");
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
