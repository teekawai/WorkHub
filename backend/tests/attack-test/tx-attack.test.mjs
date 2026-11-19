// TX: tấn công transaction (Bước 7, Task 6) — Admin × Job × Profile đánh thật vào BE.
// Chạy riêng: node backend/tests/attack-test/tx-attack.test.mjs [--base=http://localhost:5165/api] [--rounds=20] [--only=TX-02]
//
// Mỗi kịch bản chạy --rounds vòng, mỗi vòng các request lệch thời điểm gửi 0..N ms (như CC-12 của job-test) để rải cửa sổ race;
// sau mỗi vòng: checkInvariants + các kiểm riêng. Không chọn kỳ vọng "cho dễ qua": mỗi assertion nêu rõ mutation làm nó đỏ
// (M1 bỏ FOR SHARE khi tạo Job | M2 bỏ UPDATE đóng Job khi unverify | M3 bỏ điều kiện tên/MST khi verify | M6 key idempotency không gắn userId).
import crypto from "node:crypto";
import {
  BASE, TS, adminUnverify, adminVerify, call, checkInvariants, ck, isMain, jobBody, makeCrowd, makeTempAdmin, postJob, runAttackSuites, sleep, sql, sqlCol, sqlInt, verifyView,
} from "./lib.mjs";

export const name = "TX: tấn công transaction (Admin × Job × Profile)";

const ROUNDS = Number((process.argv.find((a) => a.startsWith("--rounds=")) || "").slice(9)) || 20;
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);

const delayed = (ms, fn) => sleep(ms).then(fn);
const rnd = (max) => Math.random() * max;
const show = (r) => `${r.status} ${r.data?.code ?? ""} ${String(r.data?.message ?? "").slice(0, 70)}`;
// khớp một trong các cặp [status, code?]
const okAny = (r, alts) => alts.some(([s, c]) => r.status === s && (c === undefined || r.data?.code === c));
const MSG_VERIFIED = "Đã xác minh công ty"; // verify thật (đổi trạng thái)
const isRealUnverify = (r) => r.status === 200 && String(r.data?.message ?? "").startsWith("Đã thu hồi"); // "Công ty đã bị thu hồi xác minh" = no-op

let taxSeq = 0;
// MST 13 chữ số, khác dạng của makeCrowd (8 số cuối TS + 5 số thứ tự): chèn số 9 ở giữa
const newTax = () => `${String(TS).slice(-8)}9${String(++taxSeq).padStart(4, "0")}`;

// Vi phạm bất biến chưa từng báo (sổ cái tích lũy nên I6 cũ sẽ lặp lại ở mọi vòng sau)
const reported = new Set();
function inv(id, scope, ctx) {
  const v = checkInvariants(scope).filter((x) => !reported.has(x));
  v.forEach((x) => reported.add(x));
  ck(id, v.length === 0, `${ctx}: ${v.length} vi phạm bất biến: ${v.slice(0, 4).join(" | ")}`);
}
const setVerified = (id, on) => sql(`UPDATE employerprofile SET isVerified=${on ? 1 : 0}, unverifyReason=NULL WHERE userId='${id}'`);
const openIds = (id) => sqlCol(`SELECT jobId FROM job WHERE employerId='${id}' AND status='Open'`);
// jobId -> status của các job còn trong DB
function statusOf(ids) {
  const m = new Map();
  if (!ids.length) return m;
  for (const l of sqlCol(`SELECT CONCAT(jobId,'|',status) FROM job WHERE jobId IN (${ids.map((i) => `'${i}'`).join(",")})`)) m.set(l.split("|")[0], l.split("|")[1]);
  return m;
}
const profileBody = (p) => ({
  companyName: p.companyName, address: "1 Đường Tấn Công, Quận 1, TP HCM", field: "IT", phone: "0901234567", taxCode: p.taxCode,
  description: "Công ty attack-test", website: "https://example.com", foundedYear: 2015,
});
const want = (id) => !ONLY || ONLY === id;

// ══ TX-01: unverify bão giữa lúc employer thao tác ══════════════════
// Đỏ khi: M2 (không đóng Job -> job Open còn lại: I1 + cc=0 lệch cận dưới), M1 (POST lọt sau UPDATE đóng -> job Open mới: I1)
async function tx01() {
  console.log(`\n── TX-01: unverify bão (10 POST, 5 PUT, 5 PATCH Closed, 2 DELETE, 1 unverify) × ${ROUNDS} vòng`);
  const { employers: [E] } = await makeCrowd({ employers: 1, verified: true });
  const adm = await makeTempAdmin("TX01");
  const dist = {};
  for (let i = 0; i < ROUNDS; i++) {
    setVerified(E.id, true);
    const seedRs = await Promise.all(Array.from({ length: 5 }, (_, k) => postJob(E, { jobTitle: `TX01 seed ${i}-${k} ${TS}` })));
    if (!ck("TX-01", seedRs.every((r) => r.status === 201), `vòng ${i}: tạo 5 Job nền: ${seedRs.map(show).join(" | ")}`)) continue;
    const seed = seedRs.map((r) => r.data.jobId);
    const bodies = await Promise.all(Array.from({ length: 10 }, (_, k) => jobBody({ jobTitle: `TX01 post ${i}-${k} ${TS}` })));
    const putBody = await jobBody({ jobTitle: `TX01 put ${i} ${TS}`, description: "bị sửa giữa bão" });

    const tasks = [
      ...bodies.map((b) => ({ k: "POST", f: () => call(E, "POST", "/jobs", b) })),
      ...seed.map((id) => ({ k: "PUT", f: () => call(E, "PUT", `/jobs/${id}`, putBody) })),
      ...seed.map((id) => ({ k: "PATCH", f: () => call(E, "PATCH", `/jobs/${id}/status`, { status: "Closed" }) })),
      ...[seed[3], seed[4]].map((id) => ({ k: "DELETE", f: () => call(E, "DELETE", `/jobs/${id}`) })),
      { k: "UNV", f: () => adminUnverify(adm, E.id, { reason: `TX01 vòng ${i}` }) },
    ];
    const rs = await Promise.all(tasks.map((t) => delayed(rnd(8), t.f)));
    const by = (k) => rs.filter((_, j) => tasks[j].k === k);

    // (a) mã trả về chỉ nằm trong tập hợp lệ (không 500, không mã lạ)
    const ALLOWED = {
      POST: [[201], [403, "EMPLOYER_NOT_VERIFIED"]],
      PUT: [[200], [409, "JOB_NOT_EDITABLE"], [403, "EMPLOYER_NOT_VERIFIED"], [404, "JOB_NOT_FOUND"]],
      PATCH: [[200], [409, "JOB_ALREADY_CLOSED"], [403, "EMPLOYER_NOT_VERIFIED"], [404, "JOB_NOT_FOUND"]],
      DELETE: [[200], [403, "EMPLOYER_NOT_VERIFIED"], [404, "JOB_NOT_FOUND"]],
    };
    for (const k of Object.keys(ALLOWED))
      for (const r of by(k)) { ck("TX-01", okAny(r, ALLOWED[k]), `vòng ${i} ${k}: ${show(r)}`); const key = `${k} ${r.status}`; dist[key] = (dist[key] || 0) + 1; }

    // (b) unverify phải 200 "Đã thu hồi" (employer đang verified, chỉ 1 admin gọi)
    const unv = by("UNV")[0];
    if (!ck("TX-01", isRealUnverify(unv) && Number.isInteger(unv.data?.closedJobCount), `vòng ${i} unverify: ${show(unv)}`)) { inv("TX-01", [E.id], `vòng ${i}`); continue; }
    const cc = unv.data.closedJobCount;

    // (c) sau cùng KHÔNG còn Job Open; mọi POST 201 đã thành Job và phải Closed
    const post201 = by("POST").filter((r) => r.status === 201).map((r) => r.data.jobId);
    ck("TX-01", openIds(E.id).length === 0, `vòng ${i}: còn Job Open sau unverify: ${openIds(E.id)}`);
    const st = statusOf([...seed, ...post201]);
    const badPost = post201.filter((id) => st.get(id) !== "Closed");
    ck("TX-01", badPost.length === 0, `vòng ${i}: ${badPost.length}/${post201.length} POST 201 tạo Job không Closed: ${badPost.map((id) => `${id.slice(0, 8)}=${st.get(id) ?? "mất"}`)}`);

    // (d) closedJobCount: Job còn sống cuối vòng = T - D; mỗi Job sống đã Closed bởi PATCH 200 hoặc bởi UPDATE của unverify => cc >= T - D - C;
    // Job bị UPDATE đóng thì còn Closed trong DB hoặc bị DELETE sau đó => cc <= closedAlive + D
    const T = 5 + post201.length, D = by("DELETE").filter((r) => r.status === 200).length, C = by("PATCH").filter((r) => r.status === 200).length;
    const closedAlive = [...st.values()].filter((s) => s === "Closed").length;
    ck("TX-01", cc >= 0 && cc <= T, `vòng ${i}: closedJobCount=${cc} ngoài [0, ${T}]`);
    ck("TX-01", cc >= T - D - C, `vòng ${i}: closedJobCount=${cc} < ${T - D - C} (T=${T} tạo, D=${D} xóa, C=${C} PATCH): UPDATE đóng bỏ sót Job Open`);
    ck("TX-01", cc <= closedAlive + D, `vòng ${i}: closedJobCount=${cc} > ${closedAlive + D} (Closed trong DB ${closedAlive} + xóa ${D}): báo đóng nhiều hơn thực tế`);

    // (e) bất biến toàn cục
    inv("TX-01", [E.id], `vòng ${i}`);
  }
  console.log(`   phân bố: ${JSON.stringify(dist)}`);
}

// ══ TX-02: verify || đổi tên/MST (I-1 dưới race) ═══════════════════
// Đỏ khi: M3 (bỏ điều kiện tên/MST khi verify) -> ID TX-02-M3 (race) và TX-02-seq (tuần tự). ID TX-02-F1 = lỗ TOCTOU của PUT /employer/me
// (đọc IsVerified=false, verify commit, rồi SaveChanges ghi tên mới; F-1 đã sửa), đỏ nếu lỗ đó quay lại dù BE giữ điều kiện verify.
async function tx02() {
  console.log(`\n── TX-02: verify (view cũ) || PUT /employer/me đổi tên/MST × ${ROUNDS} vòng`);
  const { employers: [E] } = await makeCrowd({ employers: 1, verified: false });
  const adm = await makeTempAdmin("TX02");
  const dist = {};
  for (let i = 0; i < ROUNDS; i++) {
    const mode = i % 2 === 0 ? "name" : "tax"; // đổi tên (COMPANY_NAME_LOCKED) / đổi MST (TAX_CODE_LOCKED)
    const base = { companyName: `Atk TX02 ${TS} r${i}`, taxCode: newTax() };
    sql(`UPDATE employerprofile SET isVerified=0, unverifyReason=NULL, companyName='${base.companyName}', taxCode='${base.taxCode}' WHERE userId='${E.id}'`);
    const view = verifyView(E.id);
    if (!ck("TX-02", view.companyName === base.companyName && view.taxCode === base.taxCode, `vòng ${i}: view lệch dữ liệu reset: ${JSON.stringify(view)}`)) continue;
    const next = mode === "name" ? { ...base, companyName: `${base.companyName} NEW` } : { ...base, taxCode: newTax() };
    const lockedCode = mode === "name" ? "COMPANY_NAME_LOCKED" : "TAX_CODE_LOCKED";

    // luân phiên bên nào gửi trước, lệch 0..8ms; vòng i%4==3 verify trễ 0..60ms để PUT hay xong trước khi verify gửi (nhánh TX-02-M3)
    const [dv, dp] = i % 4 < 2 ? [0, rnd(8)] : i % 4 === 2 ? [rnd(8), 0] : [rnd(60), 0];
    const [v, p] = await Promise.all([
      delayed(dv, () => adminVerify(adm, E.id, view)),
      delayed(dp, () => call(E, "PUT", "/employer/me", profileBody(next))),
    ]);
    const [vf, nameDb, taxDb] = sql(`SELECT CONCAT(isVerified+0,'|',companyName,'|',taxCode) FROM employerprofile WHERE userId='${E.id}'`).split("|");
    const verified = vf === "1";
    const verifyOk = v.status === 200 && v.data?.message === MSG_VERIFIED;
    const verifyChanged = v.status === 409 && v.data?.code === "EMPLOYER_PROFILE_CHANGED";
    const putOk = p.status === 200, putLocked = p.status === 409 && p.data?.code === lockedCode;
    const key = `${mode}: verify ${verifyOk ? "200" : verifyChanged ? "409CHANGED" : v.status} / PUT ${putOk ? "200" : putLocked ? "409LOCKED" : p.status}`;
    dist[key] = (dist[key] || 0) + 1;
    const ctx = `vòng ${i} (${mode}) verify=[${show(v)}] PUT=[${show(p)}] DB=[verified=${vf} ${nameDb} | ${taxDb}] view=[${view.companyName} | ${view.taxCode}]`;

    ck("TX-02", verifyOk || verifyChanged, `verify ngoài {200 Đã xác minh, 409 EMPLOYER_PROFILE_CHANGED}: ${ctx}`);
    ck("TX-02", putOk || putLocked, `PUT ngoài {200, 409 ${lockedCode}}: ${ctx}`);
    // bất biến I-1: đã verify thì tên/MST trong DB phải đúng bằng view admin đã xem
    ck("TX-02-F1", !verified || (nameDb === view.companyName && taxDb === view.taxCode), `ĐÃ VERIFY NHƯNG TÊN/MST KHÁC VIEW (I-1 vỡ): ${ctx}`);
    // nhất quán: verify 200 <=> isVerified; verify 409 => chưa verify và PUT thắng; PUT locked => verify đã thắng; không thể cùng 200
    ck("TX-02", verifyOk === verified, `verify ${v.status} nhưng isVerified=${vf}: ${ctx}`);
    ck("TX-02-F1", !(verifyOk && putOk), `verify 200 và PUT 200 cùng lúc (PUT ghi đè sau verify): ${ctx}`);
    // PUT đã trả 200 TRƯỚC khi verify được gửi (không còn race): verify bằng view cũ bắt buộc 409 — chỉ đỏ khi verify bỏ điều kiện tên/MST (M3)
    ck("TX-02-M3", !(putOk && p.t1 < v.t0 && verifyOk), `PUT 200 xong lúc ${p.t1} trước khi verify gửi (${v.t0}) mà verify vẫn 200 với view cũ: ${ctx}`);
    if (verifyChanged) ck("TX-02", putOk && !verified && nameDb === next.companyName && taxDb === next.taxCode, `verify 409 nhưng PUT không thắng / DB không có giá trị mới: ${ctx}`);
    if (putLocked) ck("TX-02", verifyOk && verified && nameDb === base.companyName && taxDb === base.taxCode, `PUT bị khóa nhưng verify không thắng / DB bị đổi: ${ctx}`);
    inv("TX-02", [E.id], `vòng ${i}`);
  }
  console.log(`   phân bố: ${JSON.stringify(dist)}`);

  // TX-02-seq: tuần tự, không race. PUT đổi tên/MST xong (200) rồi mới verify bằng view CŨ => 409 EMPLOYER_PROFILE_CHANGED, isVerified=0.
  // Đỏ khi M3 (bỏ điều kiện tên/MST trong EmployerRepository.VerifyAsync): verify 200, employer thành verified với dữ liệu admin chưa xem.
  console.log(`   TX-02-seq: PUT xong rồi mới verify view cũ × ${ROUNDS} vòng`);
  for (let i = 0; i < ROUNDS; i++) {
    const mode = i % 2 === 0 ? "name" : "tax";
    const base = { companyName: `Atk TX02s ${TS} r${i}`, taxCode: newTax() };
    sql(`UPDATE employerprofile SET isVerified=0, unverifyReason=NULL, companyName='${base.companyName}', taxCode='${base.taxCode}' WHERE userId='${E.id}'`);
    const view = verifyView(E.id);
    const next = mode === "name" ? { ...base, companyName: `${base.companyName} NEW` } : { ...base, taxCode: newTax() };
    const p = await call(E, "PUT", "/employer/me", profileBody(next));
    const v = await adminVerify(adm, E.id, view);
    const [vf, nameDb, taxDb] = sql(`SELECT CONCAT(isVerified+0,'|',companyName,'|',taxCode) FROM employerprofile WHERE userId='${E.id}'`).split("|");
    const ctx = `vòng ${i} (${mode}) PUT=[${show(p)}] verify=[${show(v)}] DB=[verified=${vf} ${nameDb} | ${taxDb}]`;
    ck("TX-02-seq", p.status === 200, `PUT đổi ${mode} khi chưa verify phải 200: ${ctx}`);
    ck("TX-02-seq", v.status === 409 && v.data?.code === "EMPLOYER_PROFILE_CHANGED", `verify bằng view cũ phải 409 EMPLOYER_PROFILE_CHANGED: ${ctx}`);
    ck("TX-02-seq", vf === "0" && nameDb === next.companyName && taxDb === next.taxCode, `isVerified phải 0 và DB giữ giá trị mới: ${ctx}`);
    inv("TX-02-seq", [E.id], `vòng ${i}`);
  }
}

// ══ TX-03: verify/unverify lật liên tục + POST ════════════════════
// Đỏ khi: M1 (POST lọt sau unverify -> Job Open của employer chưa verify), M2 (unverify không đóng Job -> bảo toàn cc vỡ + Job Open cũ),
// unverify không nguyên tử (đảo trạng thái lệch số lần verify/unverify thật).
async function tx03() {
  console.log(`\n── TX-03: 2 admin × (20 verify + 20 unverify xen kẽ) + 20 POST × ${ROUNDS} vòng`);
  const { employers: [E] } = await makeCrowd({ employers: 1, verified: true });
  const admins = [await makeTempAdmin("TX03a"), await makeTempAdmin("TX03b")];
  const view = verifyView(E.id);
  const dist = {};
  for (let i = 0; i < ROUNDS; i++) {
    setVerified(E.id, true); // mỗi vòng bắt đầu từ trạng thái verified
    const openBefore = openIds(E.id);
    const bodies = await Promise.all(Array.from({ length: 20 }, (_, k) => jobBody({ jobTitle: `TX03 ${i}-${k} ${TS}` })));
    const tasks = [];
    for (let k = 0; k < 20; k++) {
      tasks.push({ k: "V", d: k * 1.5 + rnd(3), f: () => adminVerify(admins[k % 2], E.id, view) });
      tasks.push({ k: "U", d: k * 1.5 + rnd(3), f: () => adminUnverify(admins[(k + 1) % 2], E.id, { reason: `TX03 ${i}-${k}` }) });
      tasks.push({ k: "P", d: rnd(33), f: () => call(E, "POST", "/jobs", bodies[k]) });
    }
    const rs = await Promise.all(tasks.map((t) => delayed(t.d, t.f)));
    const by = (k) => rs.filter((_, j) => tasks[j].k === k);
    const vs = by("V"), us = by("U"), ps = by("P");

    for (const r of vs) ck("TX-03", r.status === 200 && (r.data?.message === MSG_VERIFIED || r.data?.message === "Công ty đã được xác minh"), `vòng ${i} verify: ${show(r)}`);
    for (const r of us) ck("TX-03", r.status === 200 && Number.isInteger(r.data?.closedJobCount), `vòng ${i} unverify: ${show(r)}`);
    for (const r of ps) ck("TX-03", okAny(r, [[201], [403, "EMPLOYER_NOT_VERIFIED"]]), `vòng ${i} POST: ${show(r)}`);

    // trạng thái xen kẽ: bắt đầu verified => số unverify thật Ru ∈ {Rv, Rv+1}; cuối cùng verified <=> Ru == Rv
    const Rv = vs.filter((r) => r.data?.message === MSG_VERIFIED).length;
    const realU = us.filter(isRealUnverify);
    const Ru = realU.length;
    const verified = sqlInt(`SELECT isVerified+0 FROM employerprofile WHERE userId='${E.id}'`) === 1;
    ck("TX-03", Ru - Rv === 0 || Ru - Rv === 1, `vòng ${i}: Rv=${Rv} Ru=${Ru}: chuỗi đổi trạng thái không xen kẽ (lật mất/đôi)`);
    ck("TX-03", verified === (Ru === Rv), `vòng ${i}: Rv=${Rv} Ru=${Ru} => mong verified=${Ru === Rv} nhưng DB isVerified=${verified}`);
    ck("TX-03", !verified || sqlInt(`SELECT unverifyReason IS NOT NULL FROM employerprofile WHERE userId='${E.id}'`) === 0, `vòng ${i}: đã verify nhưng còn unverifyReason`);

    // Job Open cuối cùng chỉ hợp lệ nếu employer đang verified và Job tạo sau mọi unverify thật (unverify gửi sau khi POST đã phản hồi mà Job còn Open = lọt lưới)
    const post201 = ps.filter((r) => r.status === 201);
    const byJob = new Map(post201.map((r) => [r.data.jobId, r]));
    const openNow = openIds(E.id);
    ck("TX-03", openNow.length === 0 || verified, `vòng ${i}: employer chưa verify mà còn ${openNow.length} Job Open`);
    const lateU = (job) => realU.filter((u) => u.t0 > job.t1);
    for (const id of openNow) {
      const post = byJob.get(id);
      if (!post) ck("TX-03", Ru === 0, `vòng ${i}: Job Open ${id.slice(0, 8)} từ trước còn Open dù đã có ${Ru} unverify thật`);
      else ck("TX-03", lateU(post).length === 0, `vòng ${i}: Job Open ${id.slice(0, 8)} tạo xong lúc ${post.t1} nhưng unverify thật bắt đầu sau đó (${lateU(post).map((u) => u.t0)}) không đóng nó`);
    }
    // bảo toàn: Job Open lúc đầu + Job mới (201) = Σ closedJobCount + Job còn Open
    const sumCc = realU.reduce((s, r) => s + r.data.closedJobCount, 0);
    ck("TX-03", openBefore.length + post201.length === sumCc + openNow.length, `vòng ${i}: bảo toàn Job vỡ: đầu ${openBefore.length} + tạo ${post201.length} != Σclosed ${sumCc} + Open ${openNow.length}`);
    inv("TX-03", [E.id], `vòng ${i}`);
    const key = `Rv=${Rv} Ru=${Ru} cuối=${verified ? "V" : "U"}`;
    dist[key] = (dist[key] || 0) + 1;
  }
  console.log(`   ${Object.keys(dist).length} dạng kết quả (${Object.entries(dist).slice(0, 6).map(([k, v]) => `${k}:${v}`).join(", ")})`);
}

// ══ TX-04: tranh MST / tên công ty ════════════════════════════════
// Xen kẽ vòng "tạo mới" (xóa profile bằng SQL -> nhánh INSERT) và vòng "sửa" (nhánh UPDATE): cả hai phải đúng 1 người thắng.
// Đỏ khi: bỏ catch DuplicateKey (500 thô) hoặc bỏ unique index (nhiều hơn 1 người thắng, I4)
async function tx04() {
  console.log(`\n── TX-04: 10 employer tranh cùng taxCode rồi cùng companyName × ${ROUNDS} vòng (xen kẽ tạo mới / sửa)`);
  const { employers: E } = await makeCrowd({ employers: 10, verified: false });
  const ids = E.map((u) => u.id), list = ids.map((i) => `'${i}'`).join(",");
  const dist = {};
  for (let i = 0; i < ROUNDS; i++) {
    for (const field of ["taxCode", "companyName"]) {
      const insert = i % 2 === 0;
      const prof = E.map((_, k) => ({ companyName: `Atk TX04 ${TS} r${i}${field[0]} e${k}`, taxCode: newTax() }));
      if (insert) sql(`DELETE FROM employerprofile WHERE userId IN (${list})`); // coi như employer mới chưa có hồ sơ
      else for (const [k, u] of E.entries()) { // vòng trước chỉ người thắng còn hồ sơ: dựng lại hồ sơ riêng (giá trị khác nhau) cho cả 10 qua API
        const r = await call(u, "PUT", "/employer/me", profileBody(prof[k]));
        if (r.status !== 200) throw new Error(`dựng hồ sơ ${u.name}: ${show(r)}`);
      }
      const shared = field === "taxCode" ? newTax() : `Atk TX04 ${TS} r${i} chung`;
      const rs = await Promise.all(E.map((u, k) => delayed(rnd(6), () => call(u, "PUT", "/employer/me", profileBody({ ...prof[k], [field]: shared })))));
      const code = field === "taxCode" ? "TAX_CODE_TAKEN" : "COMPANY_NAME_TAKEN";
      const wins = rs.filter((r) => r.status === 200), lost = rs.filter((r) => r.status === 409 && r.data?.code === code);
      const ctx = `vòng ${i} ${insert ? "tạo mới" : "sửa"} ${field}: ${rs.map((r) => `${r.status}${r.data?.code ? ":" + r.data.code : ""}`).join(",")}`;
      dist[`${insert ? "tạo" : "sửa"} ${field}: ${wins.length} thắng, ${lost.length} ${code}`] = (dist[`${insert ? "tạo" : "sửa"} ${field}: ${wins.length} thắng, ${lost.length} ${code}`] || 0) + 1;
      ck("TX-04", wins.length === 1 && lost.length === 9, `phải đúng 1 x 200 và 9 x 409 ${code}: ${ctx}`);
      ck("TX-04", !rs.some((r) => r.status >= 500), `có 5xx: ${ctx}`);
      ck("TX-04", wins.every((r) => !/passwordhash/i.test(r.text)), `response PUT 200 lộ PasswordHash: ${ctx}`);
      // DB: đúng 1 dòng giữ giá trị chung, và chính là người nhận 200
      const holders = sqlCol(`SELECT userId FROM employerprofile WHERE ${field}='${shared}'`);
      const winnerIds = rs.map((r, k) => (r.status === 200 ? ids[k] : null)).filter(Boolean);
      ck("TX-04", holders.length === 1 && winnerIds.length === 1 && holders[0] === winnerIds[0], `DB có ${holders.length} dòng ${field}='${shared}' (người thắng ${winnerIds.join(",")}): ${ctx}`);
      inv("TX-04", ids, `vòng ${i} ${field}`);
    }
  }
  console.log(`   phân bố: ${JSON.stringify(dist)}`);
}

// ══ TX-05: idempotency chéo user dưới tải ═════════════════════════
// Đỏ khi: M6 (key không gắn userId -> employer khác nhận replay của người khác / REQUEST_IN_PROGRESS / ít Job hơn)
async function tx05() {
  console.log(`\n── TX-05: 20 employer cùng 1 Idempotency-Key + body, 2 lượt × ${ROUNDS} vòng`);
  const { employers: E } = await makeCrowd({ employers: 20, verified: true });
  const ids = E.map((u) => u.id);
  for (let i = 0; i < ROUNDS; i++) {
    const key = crypto.randomUUID();
    const title = `TX05 ${i} ${TS}`;
    const body = await jobBody({ jobTitle: title });
    const send = () => Promise.all(E.map((u) => delayed(rnd(5), () => call(u, "POST", "/jobs", body, { headers: { "Idempotency-Key": key } }))));
    const r1 = await send();
    const ok1 = r1.every((r) => r.status === 201 && typeof r.data?.jobId === "string");
    ck("TX-05", ok1, `vòng ${i} lượt 1: ${[...new Set(r1.map(show))].join(" | ")}`);
    const r2 = await send();
    ck("TX-05", r2.every((r) => r.status === 201 && typeof r.data?.jobId === "string"), `vòng ${i} lượt 2 (replay): ${[...new Set(r2.map(show))].join(" | ")}`);

    // mỗi employer đúng 1 Job; replay trả đúng jobId của chính mình, mọi jobId khác nhau, Job thuộc đúng chủ
    const rows = sqlCol(`SELECT CONCAT(employerId,'|',jobId) FROM job WHERE jobTitle='${title}' AND employerId IN (${ids.map((x) => `'${x}'`).join(",")})`).map((l) => l.split("|"));
    const perOwner = new Map();
    for (const [o, j] of rows) perOwner.set(o, [...(perOwner.get(o) || []), j]);
    ck("TX-05", rows.length === 20 && E.every((u) => perOwner.get(u.id)?.length === 1), `vòng ${i}: DB có ${rows.length} Job, mỗi employer phải đúng 1: ${E.map((u) => perOwner.get(u.id)?.length ?? 0).join(",")}`);
    ck("TX-05", new Set(r1.map((r) => r.data?.jobId)).size === 20, `vòng ${i}: lượt 1 trả ${new Set(r1.map((r) => r.data?.jobId)).size}/20 jobId khác nhau (có employer nhận Job của người khác)`);
    E.forEach((u, k) => {
      const mine = perOwner.get(u.id)?.[0];
      ck("TX-05", r1[k].data?.jobId === mine && r2[k].data?.jobId === mine, `vòng ${i} ${u.name}: lượt1=${r1[k].data?.jobId?.slice(0, 8)} lượt2=${r2[k].data?.jobId?.slice(0, 8)} DB=${mine?.slice(0, 8)}`);
    });
    inv("TX-05", ids, `vòng ${i}`);
  }
}

export default async function run() {
  console.log(`BASE = ${BASE} | rounds = ${ROUNDS}${ONLY ? ` | only = ${ONLY}` : ""}`);
  if (want("TX-01")) await tx01();
  if (want("TX-02")) await tx02();
  if (want("TX-03")) await tx03();
  if (want("TX-04")) await tx04();
  if (want("TX-05")) await tx05();
}

if (isMain(import.meta.url)) await runAttackSuites([{ name, run }]);
