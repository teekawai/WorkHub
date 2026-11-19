// LD: tải nhiều tài khoản + IDOR (Bước 7, Task 5) — 30 employer (24 xác minh, 3 từng xác minh rồi bị hủy, 3 chưa bao giờ) + 20 finder,
// ~500 request trộn ngẫu nhiên (seed in ra, chạy lại bằng --seed=N), lô 50 request chạy song song.
// Chạy riêng: node backend/tests/attack-test/load.test.mjs [--base=http://localhost:5165/api] [--seed=N]
//
// Cách phân loại kỳ vọng IDOR (trạng thái THẬT lúc request, không nới tới mức 2xx của attacker lọt):
//  - Job đã bị chủ xóa ở lô TRƯỚC          -> chỉ 404 JOB_NOT_FOUND (attacker có xác minh) .
//  - Job bị chủ xóa ĐỒNG THỜI trong lô này -> 403 NOT_JOB_OWNER hoặc 404 JOB_NOT_FOUND (tùy thứ tự xử lý).
//  - Job còn nguyên                         -> chỉ 403 NOT_JOB_OWNER (kể cả Job Closed: kiểm chủ sở hữu phải đứng trước kiểm trạng thái, không lộ 409).
//  - Attacker là employer chưa xác minh gọi PUT/PATCH/DELETE -> 403 EMPLOYER_NOT_VERIFIED (policy chạy trước, bất kể Job).
//  - Finder -> 403 FORBIDDEN_ROLE; ẩn danh -> 401 UNAUTHENTICATED. Không response nào của attacker được 2xx (LD-03).
// Job "kho" (vault) chỉ bị attacker chạm, chủ không bao giờ thao tác -> snapshot trước/sau phải y hệt (LD-04).
import crypto from "node:crypto";
import {
  BASE, TS, adminUnverify, call, checkInvariants, ck, isMain, jobBody, ledger, makeCrowd, makeTempAdmin, postJob, runAttackSuites, sleep, sql, sqlCol, sqlInt, uid,
} from "./lib.mjs";

export const name = "LD: tải nhiều tài khoản + IDOR";

const TOTAL_REQ = 500;
const BATCH_REQ = 50;
const ITEM_KEYS = ["jobId", "jobTitle", "companyName", "logo", "location", "salaryType", "salaryMin", "salaryMax", "createdAt", "yearOfExperience"]; // Business 7: item search (10 key)
const TAG = `LD${TS}`; // nằm trong jobTitle mọi Job của nhóm -> keyword search chỉ thấy Job của nhóm này

// ─── RNG có seed ───────────────────────────────────────────────
const SEED = (() => {
  const a = process.argv.find((x) => x.startsWith("--seed="));
  return a ? Number(a.slice(7)) >>> 0 : crypto.randomInt(1, 2 ** 31);
})();
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Kiểm tra nhỏ ──────────────────────────────────────────────
const show = (r) => `${r.status} ${r.data?.code ?? ""} ${String(r.data?.message ?? "").slice(0, 60)}`;
const okAny = (r, alts) => alts.some(([s, c]) => r.status === s && (c === undefined || r.data?.code === c));
const expect = (id, r, alts, what) => ck(id, okAny(r, alts), `${what}: mong ${alts.map((a) => a.join(" ")).join(" | ")}, được ${show(r)}`);
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && b.every((x) => new Set(a).has(x));
const normPath = (p) => p.replace(/[0-9a-fA-F-]{36}/g, ":id").replace(/\?.*/, "?…");
const jobRows = (ids) => {
  const m = new Map();
  if (!ids.length) return m;
  for (const line of sqlCol(`SELECT * FROM job WHERE jobId IN (${ids.map((i) => `'${i}'`).join(",")}) ORDER BY jobId`)) m.set(line.split("\t")[0], line);
  return m;
};

export default async function run() {
  const rnd = mulberry32(SEED);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const pickW = (table) => {
    let x = rnd() * table.reduce((s, [, w]) => s + w, 0);
    for (const [k, w] of table) if ((x -= w) < 0) return k;
    return table[0][0];
  };
  let titleN = 0;
  const title = () => `Job ${++titleN} ${TAG}`;
  console.log(`\n── LD: seed = ${SEED} (chạy lại: --seed=${SEED}) | BASE = ${BASE}`);
  const tStart = Date.now();

  // ══ LD-01: khởi tạo ═════════════════════════════════════════
  console.log("\n── LD-01: tạo đám đông (giãn nhịp rate limit auth, mất vài phút)");
  const crowd = await makeCrowd({ employers: 30, verified: 24, finders: 20 });
  const E = crowd.employers;
  const F = crowd.finders;
  const V = E.slice(0, 24); // đã xác minh
  const X = E.slice(24, 27); // đã xác minh rồi bị admin hủy (có Job Closed)
  const N = E.slice(27); // chưa bao giờ xác minh (không có Job)
  const scope = E.map((u) => u.id);
  ck("LD-01", V.length === 24 && X.length === 3 && N.length === 3 && F.length === 20, "sai quân số đám đông");
  ck("LD-01", sqlInt(`SELECT COUNT(*) FROM employerprofile WHERE userId IN (${scope.map((i) => `'${i}'`).join(",")}) AND isVerified=1`) === 24, "makeCrowd phải xác minh đúng 24 employer");
  console.log(`   ✔ đám đông: ${E.length} employer + ${F.length} finder (${((Date.now() - tStart) / 1000).toFixed(0)}s)`);

  // Mô hình Job của bộ test: jobId -> { owner, vault, status, gone }
  const jobs = new Map();
  const addJob = (owner, id, o = {}) => jobs.set(id, { id, owner, vault: false, status: "Open", gone: false, ...o });
  const alive = () => [...jobs.values()].filter((j) => !j.gone);

  // X tạm xác minh (SQL) để tạo Job, rồi admin hủy qua API -> Job tự Closed (Business 3.4.1)
  for (const u of X) sql(`UPDATE employerprofile SET isVerified=1 WHERE userId='${u.id}'`);
  await Promise.all([...V, ...X].map(async (u) => {
    for (let k = 0; k < 3; k++) { // 3 Job tuần tự mỗi employer
      const r = await postJob(u, { jobTitle: title() });
      if (!ck("LD-01", r.status === 201 && typeof r.data?.jobId === "string", `${u.name} tạo Job #${k}: ${show(r)}`)) continue;
      addJob(u, r.data.jobId, { vault: V.includes(u) ? k !== 1 : true }); // V: Job 0 (Open) + Job 2 (sẽ Closed) là kho, Job 1 cho chủ thao tác; X: tất cả là kho
    }
  }));
  await Promise.all(V.map(async (u) => {
    const j2 = [...jobs.values()].filter((j) => j.owner === u)[2];
    if (!j2) return;
    const r = await call(u, "PATCH", `/jobs/${j2.id}/status`, { status: "Closed" });
    if (ck("LD-01", r.status === 200 && r.data?.status === "Closed", `đóng Job kho: ${show(r)}`)) j2.status = "Closed";
  }));
  const adm = await makeTempAdmin("LD");
  for (const u of X) {
    const r = await adminUnverify(adm, u.id, { reason: "Hủy xác minh cho bài tải" });
    ck("LD-01", r.status === 200 && r.data?.closedJobCount === 3, `admin hủy xác minh ${u.name}: ${show(r)} ${JSON.stringify(r.data)?.slice(0, 80)}`);
    for (const j of jobs.values()) if (j.owner === u) j.status = "Closed";
  }
  ck("LD-01", jobs.size === 27 * 3, `phải có 81 Job, được ${jobs.size}`);
  ck("LD-01", sqlInt(`SELECT COUNT(*) FROM job WHERE employerId IN (${X.map((u) => `'${u.id}'`).join(",")}) AND status='Closed'`) === 9, "9 Job của employer bị hủy xác minh phải Closed");
  const baseline = checkInvariants(scope);
  ck("LD-01", baseline.length === 0, `baseline bẩn: ${JSON.stringify(baseline)}`);

  // snapshot Job kho trước đợt
  const vaultIds = [...jobs.values()].filter((j) => j.vault).map((j) => j.id);
  const snapBefore = jobRows(vaultIds);
  ck("LD-01", snapBefore.size === vaultIds.length && vaultIds.length === 24 * 2 + 9, `snapshot kho: ${snapBefore.size}/${vaultIds.length}`);
  console.log(`   ✔ ${jobs.size} Job (${vaultIds.length} kho), ${X.length} employer bị hủy xác minh, baseline sạch`);

  // ══ LD-02: đợt hỗn hợp ═══════════════════════════════════════
  const bodyOf = (o) => jobBody(o);
  const atk = []; // mọi response của attacker (IDOR / chưa xác minh / sai role / ẩn danh) -> LD-03
  const searchSeen = new Map(); // jobId -> true (item search 200 trong đợt)
  let netErrors = 0;
  const A = async (kind, user, method, p, body, extra) => {
    const r = await call(user, method, p, body, extra);
    atk.push({ kind, who: user?.name ?? "anon", method, path: p, status: r.status, code: r.data?.code });
    return r;
  };
  const randId = () => pick([...jobs.keys()]);

  const TASKS = [
    ["post", 12], ["dup", 4], ["put", 8], ["patch", 6], ["del", 7], ["list", 6], ["ghost", 3],
    ["unvPost", 3], ["unvMut", 5], ["unvList", 3], ["idor", 28], ["finder", 10], ["anon", 3], ["detail", 10], ["search", 26],
  ];
  const opt = await jobBody();
  const SEARCHES = [
    `keyword=${TAG}`, `keyword=${TAG}&page=2`, `keyword=${TAG}&limit=5`, `category=${encodeURIComponent(opt.category)}`,
    `location=${encodeURIComponent(opt.location)}`, `workType=${opt.workType}`, "salaryMin=10000000&salaryMax=15000000&sortBy=salary_desc", "experience=1-3", // khoảng lương chỉ nhận 6 mức cố định (Business 1.3)
    `keyword=${encodeURIComponent("' OR 1=1 --")}`, `keyword=${encodeURIComponent("%")}`, "page=1&limit=30",
  ];

  // Mỗi task: { kind, reqs, run } — run() kiểm assertion ngay; hiệu ứng lên mô hình đẩy vào bc.effects, áp sau lô
  function makeTask(kind, bc) {
    const mine = (u, pred = () => true) => [...jobs.values()].filter((j) => j.owner === u && !j.gone && !j.vault && !bc.claimed.has(j.id) && pred(j));
    switch (kind) {
      case "post": {
        const u = pick(V);
        const spoof = rnd() < 0.25 ? { employerId: pick(E.filter((x) => x !== u)).id } : {}; // cố gán Job cho người khác: BE phải bỏ qua
        return { kind, reqs: 1, run: async () => {
          const r = await call(u, "POST", "/jobs", { ...(await bodyOf({ jobTitle: title() })), ...spoof });
          if (!ck("LD-02A", r.status === 201 && typeof r.data?.jobId === "string" && r.data.status === "Open", `${u.name} POST: ${show(r)}`)) return;
          bc.effects.push(() => addJob(u, r.data.jobId));
        } };
      }
      case "dup": { // cùng key + cùng body: 2 request đồng thời + 1 request lặp sau -> đúng 1 Job
        const u = pick(V);
        return { kind, reqs: 3, run: async () => {
          const body = await bodyOf({ jobTitle: title() });
          const hdr = { headers: { "Idempotency-Key": crypto.randomUUID() } };
          const rs = await Promise.all([call(u, "POST", "/jobs", body, hdr), call(u, "POST", "/jobs", body, hdr)]);
          rs.push(await call(u, "POST", "/jobs", body, hdr));
          for (const r of rs) expect("LD-02A", r, [[201], [409, "REQUEST_IN_PROGRESS"]], `${u.name} POST lặp cùng key`);
          const ids = [...new Set(rs.filter((r) => r.status === 201).map((r) => r.data?.jobId))];
          ck("LD-02A", ids.length === 1 && rs[2].status === 201, `cùng key phải ra đúng 1 Job và lần lặp sau trả lại 201: ${JSON.stringify(rs.map(show))}`);
          if (ids.length === 1) bc.effects.push(() => addJob(u, ids[0]));
        } };
      }
      case "put": {
        const u = pick(V), c = mine(u);
        if (!c.length) return null;
        const j = pick(c); bc.claimed.add(j.id);
        return { kind, reqs: 1, run: async () => {
          const r = await call(u, "PUT", `/jobs/${j.id}`, await bodyOf({ jobTitle: title() }));
          if (j.status === "Open") ck("LD-02A", r.status === 200 && r.data?.jobId === j.id, `${u.name} PUT Job Open của mình: ${show(r)}`);
          else expect("LD-02A", r, [[409, "JOB_NOT_EDITABLE"]], `${u.name} PUT Job Closed của mình`);
        } };
      }
      case "patch": {
        const u = pick(V), c = mine(u);
        if (!c.length) return null;
        const j = pick(c); bc.claimed.add(j.id);
        return { kind, reqs: 1, run: async () => {
          const r = await call(u, "PATCH", `/jobs/${j.id}/status`, { status: "Closed" });
          if (j.status === "Open") {
            if (ck("LD-02A", r.status === 200 && r.data?.status === "Closed", `${u.name} đóng Job của mình: ${show(r)}`)) bc.effects.push(() => { j.status = "Closed"; });
          } else expect("LD-02A", r, [[409, "JOB_ALREADY_CLOSED"]], `${u.name} đóng lại Job đã Closed`);
        } };
      }
      case "del": {
        const u = pick(V), c = mine(u);
        if (!c.length) return null;
        const j = pick(c); bc.claimed.add(j.id); bc.del.add(j.id);
        return { kind, reqs: 1, run: async () => {
          const r = await call(u, "DELETE", `/jobs/${j.id}`);
          if (ck("LD-02A", r.status === 200, `${u.name} xóa Job của mình: ${show(r)}`)) bc.effects.push(() => { j.gone = true; });
        } };
      }
      case "list": {
        const u = pick(V);
        return { kind, reqs: 1, run: async () => {
          const r = await call(u, "GET", "/employer/jobs?limit=30");
          if (!ck("LD-02A", r.status === 200 && Array.isArray(r.data?.items), `${u.name} GET /employer/jobs: ${show(r)}`)) return;
          // Job mới tạo cùng lô chưa có trong mô hình (owner undefined) -> bỏ qua; Job đã biết thì phải của chính u
          const leak = r.data.items.filter((i) => jobs.get(i.jobId) && jobs.get(i.jobId).owner !== u);
          ck("LD-02A", leak.length === 0, `${u.name} thấy Job của người khác: ${leak.map((i) => i.jobId)}`);
        } };
      }
      case "ghost": {
        const u = pick(V), m = pick(["PUT", "PATCH", "DELETE", "GET"]), id = uid();
        return { kind, reqs: 1, run: async () => {
          const p = m === "GET" ? `/employer/jobs/${id}` : m === "PATCH" ? `/jobs/${id}/status` : `/jobs/${id}`;
          const r = await A("ghost", u, m, p, m === "PUT" ? await bodyOf({ jobTitle: title() }) : m === "PATCH" ? { status: "Closed" } : undefined);
          expect("LD-02A", r, [[404, "JOB_NOT_FOUND"]], `${u.name} ${m} Job không tồn tại`);
        } };
      }
      case "unvPost": {
        const u = pick([...X, ...N]);
        return { kind, reqs: 1, run: async () => {
          expect("LD-02B", await A("unvPost", u, "POST", "/jobs", await bodyOf({ jobTitle: title() })), [[403, "EMPLOYER_NOT_VERIFIED"]], `${u.name} (chưa xác minh) POST`);
        } };
      }
      case "unvMut": { // X: Job Closed của chính mình; N: Job của người khác (policy phải chặn trước, không đụng Job)
        const u = pick([...X, ...N]), m = pick(["PUT", "PATCH", "DELETE"]);
        const own = X.includes(u) ? pick([...jobs.values()].filter((j) => j.owner === u)) : null;
        const t = own || jobs.get(randId());
        return { kind, reqs: 1, run: async () => {
          const p = m === "PATCH" ? `/jobs/${t.id}/status` : `/jobs/${t.id}`;
          const r = await A("unvMut", u, m, p, m === "PUT" ? await bodyOf({ jobTitle: `HACK ${title()}` }) : m === "PATCH" ? { status: "Closed" } : undefined);
          expect("LD-02B", r, [[403, "EMPLOYER_NOT_VERIFIED"]], `${u.name} (chưa xác minh) ${m} ${own ? "Job của mình" : "Job người khác"}`);
        } };
      }
      case "unvList": { // chỉ xem: vẫn 200, thấy đúng Job của mình (X: 3 Job Closed; N: không có)
        const u = pick([...X, ...N]), mineIds = [...jobs.values()].filter((j) => j.owner === u).map((j) => j.id);
        return { kind, reqs: mineIds.length ? 2 : 1, run: async () => {
          const r = await call(u, "GET", "/employer/jobs?limit=30");
          ck("LD-02B", r.status === 200 && sameSet((r.data?.items || []).map((i) => i.jobId), mineIds), `${u.name} xem danh sách của mình: ${show(r)} ${(r.data?.items || []).length}/${mineIds.length}`);
          if (mineIds.length) {
            const d = await call(u, "GET", `/employer/jobs/${mineIds[0]}`);
            ck("LD-02B", d.status === 200 && d.data?.jobId === mineIds[0] && d.data?.status === "Closed", `${u.name} xem chi tiết Job của mình: ${show(d)}`);
          }
        } };
      }
      case "idor": {
        const u = pick(E);
        const t = pick([...jobs.values()].filter((j) => j.owner !== u));
        const m = pick(["PUT", "PATCH", "DELETE", "GET", "PUT", "DELETE"]);
        const unverified = !V.includes(u);
        return { kind, reqs: 1, run: async () => {
          const p = m === "GET" ? `/employer/jobs/${t.id}` : m === "PATCH" ? `/jobs/${t.id}/status` : `/jobs/${t.id}`;
          const body = m === "PUT" ? await bodyOf({ jobTitle: `HACK ${++titleN} ${TAG}`, description: "bị chiếm quyền" }) : m === "PATCH" ? { status: "Closed" } : undefined;
          const r = await A("idor", u, m, p, body);
          let alts;
          if (m !== "GET" && unverified) alts = [[403, "EMPLOYER_NOT_VERIFIED"]];
          else if (t.gone) alts = [[404, "JOB_NOT_FOUND"]]; // đã xóa ở lô trước
          else if (bc.del.has(t.id)) alts = [[403, "NOT_JOB_OWNER"], [404, "JOB_NOT_FOUND"]]; // chủ đang xóa đồng thời
          else alts = [[403, "NOT_JOB_OWNER"]];
          expect("LD-02C", r, alts, `IDOR ${u.name} (${V.includes(u) ? "verified" : X.includes(u) ? "ex" : "chưa XM"}) ${m} Job ${t.id.slice(0, 8)} của ${t.owner.name} [${t.vault ? "kho " : ""}${t.status}${t.gone ? " đã xóa" : ""}]`);
        } };
      }
      case "finder": case "anon": {
        const u = kind === "finder" ? pick(F) : null, m = pick(["POST", "PUT", "PATCH", "DELETE", "GET", "GET"]);
        const id = randId(), listOnly = rnd() < 0.3;
        return { kind, reqs: 1, run: async () => {
          const p = m === "POST" ? "/jobs" : m === "GET" ? (listOnly ? "/employer/jobs" : `/employer/jobs/${id}`) : m === "PATCH" ? `/jobs/${id}/status` : `/jobs/${id}`;
          const body = m === "PUT" || m === "POST" ? await bodyOf({ jobTitle: `HACK ${++titleN} ${TAG}` }) : m === "PATCH" ? { status: "Closed" } : undefined;
          const r = await A(kind, u, m, p, body);
          expect("LD-02D", r, kind === "finder" ? [[403, "FORBIDDEN_ROLE"]] : [[401, "UNAUTHENTICATED"]], `${u?.name ?? "ẩn danh"} ${m} ${normPath(p)}`);
        } };
      }
      case "detail": {
        const u = rnd() < 0.5 ? null : pick(F);
        const t = rnd() < 0.1 ? null : jobs.get(randId());
        return { kind, reqs: 1, run: async () => {
          const r = await call(u, "GET", `/jobs/${t ? t.id : uid()}`);
          let alts;
          if (!t || X.includes(t.owner) || t.gone) alts = [[404, "JOB_NOT_FOUND"]]; // không tồn tại / employer chưa xác minh / đã xóa
          else if (bc.del.has(t.id)) alts = [[200], [404, "JOB_NOT_FOUND"]];
          else alts = [[200]];
          expect("LD-02E", r, alts, `GET /jobs/:id ${t ? `Job ${t.id.slice(0, 8)} của ${t.owner.name} [${t.status}${t.gone ? " đã xóa" : ""}]` : "ngẫu nhiên"}`);
          if (r.status === 200) {
            const leak = ["employerId", "unverifyReason", "passwordHash", "token"].filter((k) => k in (r.data || {}));
            ck("LD-02E", leak.length === 0 && r.data?.jobId === t?.id, `detail lộ trường nhạy cảm / sai jobId: ${leak}`);
          }
        } };
      }
      case "search": {
        const u = rnd() < 0.5 ? null : pick(F), q = pick(SEARCHES);
        return { kind, reqs: 1, run: async () => {
          const r = await call(u, "GET", `/jobs?${q}`);
          if (r.status === 429) { ck("LD-02F", r.data?.code === "TOO_MANY_REQUESTS", `429 sai code: ${show(r)}`); return; } // hợp lệ, đếm ở LD-09
          if (!ck("LD-02F", r.status === 200 && Array.isArray(r.data?.items) && !!r.data?.pagination, `GET /jobs?${q}: ${show(r)}`)) return;
          for (const it of r.data.items) {
            ck("LD-02F", sameSet(Object.keys(it), ITEM_KEYS), `item search lộ/thiếu trường: ${Object.keys(it)}`);
            ck("LD-02F", Number.isInteger(it.yearOfExperience) && it.yearOfExperience >= 0, `yearOfExperience không phải số nguyên >= 0: ${it.yearOfExperience}`);
            searchSeen.set(it.jobId, true);
          }
        } };
      }
    }
  }

  const tLoad = Date.now();
  const ledgerFrom = ledger.length;
  let sent = 0, batchNo = 0;
  console.log(`\n── LD-02: đợt hỗn hợp ~${TOTAL_REQ} request, lô ${BATCH_REQ}`);
  while (sent < TOTAL_REQ) {
    const bc = { claimed: new Set(), del: new Set(), effects: [] };
    const tasks = [];
    let reqs = 0;
    while (reqs < BATCH_REQ && sent + reqs < TOTAL_REQ) {
      const t = makeTask(pickW(TASKS), bc);
      if (!t) continue;
      tasks.push(t); reqs += t.reqs;
    }
    await Promise.all(tasks.map((t) => t.run().catch((e) => { netErrors++; ck("LD-09", false, `${t.kind}: ${e.message}`); })));
    for (const f of bc.effects) f();
    sent += reqs; batchNo++;
    console.log(`   lô ${String(batchNo).padStart(2)}: ${reqs} request (${tasks.length} task) | Job còn ${alive().length}, đã xóa ${jobs.size - alive().length}`);
  }
  const loadMs = Date.now() - tLoad;
  const slice = ledger.slice(ledgerFrom);

  // ══ LD-03: attacker không được 2xx ═══════════════════════════
  console.log("\n── LD-03: attacker không được 2xx");
  const wins = atk.filter((a) => a.status >= 200 && a.status < 300);
  ck("LD-03", wins.length === 0, `${wins.length} request của attacker được 2xx: ${wins.slice(0, 5).map((a) => `${a.who} ${a.method} ${normPath(a.path)} -> ${a.status}`).join("; ")}`);
  ck("LD-03", atk.length > 100, `quá ít request tấn công: ${atk.length}`);
  const byKind = {};
  for (const a of atk) byKind[a.kind] = (byKind[a.kind] || 0) + 1;
  console.log(`   ${atk.length} request tấn công, 0 thành công mong đợi | theo loại: ${JSON.stringify(byKind)}`);

  // ══ LD-04: snapshot Job kho ══════════════════════════════════
  console.log("\n── LD-04: Job chỉ bị attacker chạm không đổi");
  const snapAfter = jobRows(vaultIds);
  const changed = vaultIds.filter((id) => snapBefore.get(id) !== snapAfter.get(id));
  ck("LD-04", changed.length === 0, `${changed.length}/${vaultIds.length} Job kho bị đổi/mất: ${changed.slice(0, 3).map((id) => `${id.slice(0, 8)}: ${(snapAfter.get(id) ?? "<mất>").slice(0, 90)}`).join(" | ")}`);
  ck("LD-04", snapAfter.size === vaultIds.length, `Job kho bị xóa: ${vaultIds.length - snapAfter.size}`);

  // ══ LD-06: DB khớp mô hình (chủ sở hữu + trạng thái) ═════════
  console.log("\n── LD-06: chủ sở hữu + trạng thái trong DB khớp mô hình");
  const inList = scope.map((i) => `'${i}'`).join(",");
  const dbRows = new Map(sqlCol(`SELECT CONCAT(jobId,'|',employerId,'|',status) FROM job WHERE employerId IN (${inList})`).map((l) => [l.split("|")[0], l.split("|")]));
  const exp = alive();
  ck("LD-06", dbRows.size === exp.length, `DB có ${dbRows.size} Job, mô hình có ${exp.length}`);
  const badOwner = exp.filter((j) => dbRows.get(j.id)?.[1] !== j.owner.id);
  ck("LD-06", badOwner.length === 0, `${badOwner.length} Job sai chủ/mất: ${badOwner.slice(0, 3).map((j) => j.id.slice(0, 8))}`);
  const badStatus = exp.filter((j) => dbRows.get(j.id)?.[2] !== j.status);
  ck("LD-06", badStatus.length === 0, `${badStatus.length} Job sai status: ${badStatus.slice(0, 3).map((j) => `${j.id.slice(0, 8)} DB=${dbRows.get(j.id)?.[2]} mô hình=${j.status}`)}`);
  const goneStill = [...jobs.values()].filter((j) => j.gone && dbRows.has(j.id));
  ck("LD-06", goneStill.length === 0, `${goneStill.length} Job đã xóa 200 mà còn trong DB`);

  // ══ LD-07: danh sách employer khớp DB (yên tĩnh, tuần tự) ═════
  console.log("\n── LD-07: GET /employer/jobs của từng employer khớp DB");
  for (const u of E) {
    const ids = [];
    for (let p = 1; ; p++) {
      const r = await call(u, "GET", `/employer/jobs?page=${p}&limit=30`);
      if (!ck("LD-07", r.status === 200 && Array.isArray(r.data?.items), `${u.name} trang ${p}: ${show(r)}`)) break;
      ids.push(...r.data.items.map((i) => i.jobId));
      if (p >= r.data.pagination.totalPages) break;
    }
    const want = exp.filter((j) => j.owner === u).map((j) => j.id);
    ck("LD-07", sameSet(ids, want), `${u.name}: list ${ids.length} Job, DB ${want.length} (thiếu ${want.filter((x) => !ids.includes(x)).length}, thừa ${ids.filter((x) => !want.includes(x)).length})`);
  }

  // ══ LD-05: hiển thị công khai (Job E chưa xác minh không lộ) ══
  console.log("\n── LD-05: hiển thị công khai");
  for (const j of exp.filter((x) => X.includes(x.owner))) { // quét yên tĩnh: 9 Job của employer bị hủy xác minh -> 404 với mọi người
    expect("LD-05", await call(null, "GET", `/jobs/${j.id}`), [[404, "JOB_NOT_FOUND"]], `ẩn danh xem Job của employer bị hủy xác minh ${j.id.slice(0, 8)}`);
    expect("LD-05", await call(pick(F), "GET", `/jobs/${j.id}`), [[404, "JOB_NOT_FOUND"]], `finder xem Job của employer bị hủy xác minh ${j.id.slice(0, 8)}`);
  }
  for (const j of exp.filter((x) => x.vault && V.includes(x.owner)).slice(0, 12)) // Job kho của employer xác minh: Open lẫn Closed đều xem được (Business 5.1)
    expect("LD-05", await call(null, "GET", `/jobs/${j.id}`), [[200]], `ẩn danh xem Job kho ${j.status} ${j.id.slice(0, 8)}`);
  // search yên tĩnh: chờ hết rate limit rồi lấy mọi trang theo keyword -> đúng tập Job Open còn sống của employer xác minh
  // lấy mọi trang search theo keyword TAG (chờ Retry-After khi 429): { ids } hoặc { err }
  const searchAllTag = async () => {
    const ids = [];
    for (let p = 1; ; p++) {
      let r;
      for (;;) {
        r = await call(null, "GET", `/jobs?keyword=${TAG}&page=${p}&limit=30`);
        if (r.status !== 429) break;
        await sleep((Number(r.headers.get("retry-after")) || 60) * 1000 + 1000);
      }
      if (r.status !== 200) return { err: r };
      ids.push(...r.data.items.map((i) => i.jobId));
      if (p >= r.data.pagination.totalPages) return { ids };
    }
  };
  const { ids: got = [], err: pageErr = null } = await searchAllTag();
  const wantOpen = exp.filter((j) => j.status === "Open" && V.includes(j.owner)).map((j) => j.id);
  ck("LD-05", !pageErr && sameSet(got, wantOpen), `search keyword=${TAG}: ${pageErr ? show(pageErr) : `${got.length} Job, mong ${wantOpen.length} (thừa ${got.filter((x) => !wantOpen.includes(x)).length}, thiếu ${wantOpen.filter((x) => !got.includes(x)).length})`}`);
  const xIds = new Set(exp.filter((j) => X.includes(j.owner)).map((j) => j.id));
  ck("LD-05", ![...got, ...searchSeen.keys()].some((id) => xIds.has(id)), "search lộ Job của employer chưa xác minh");
  // mọi jobId search trong đợt phải là Job có thật: do bộ test tạo (còn hoặc vừa bị xóa trong đợt) hoặc dòng sẵn có của DB
  const foreign = [...searchSeen.keys()].filter((id) => !jobs.has(id));
  const foreignMissing = foreign.filter((id) => sqlInt(`SELECT COUNT(*) FROM job WHERE jobId='${id}'`) !== 1);
  ck("LD-05", foreignMissing.length === 0, `search trả jobId không tồn tại: ${foreignMissing.slice(0, 3)}`);
  console.log(`   search trong đợt thấy ${searchSeen.size} jobId khác nhau (${foreign.length} ngoài bộ test); quét yên tĩnh ${got.length}/${wantOpen.length} Job Open`);

  // Mọi jobId search thấy trong đợt: employer của Job (nếu Job còn) phải đã xác minh
  const seenIds = [...searchSeen.keys()];
  const seenUnv = seenIds.length ? sqlCol(`SELECT j.jobId FROM job j JOIN employerprofile e ON e.userId=j.employerId WHERE j.jobId IN (${seenIds.map((i) => `'${i}'`).join(",")}) AND e.isVerified=0`) : [];
  ck("LD-05", seenUnv.length === 0, `search trong đợt thấy Job của employer chưa xác minh: ${seenUnv.slice(0, 3)}`);
  // Lớp bảo vệ thứ hai (Business 3.5 / 6.2 / 5.1): ép 1 Job của X về Open bằng SQL (dữ liệu "lệch"), search + detail vẫn không được lộ.
  // Khôi phục Closed trong finally để checkInvariants (I1) sạch.
  const leakJob = exp.find((j) => X.includes(j.owner));
  try {
    sql(`UPDATE job SET status='Open' WHERE jobId='${leakJob.id}'`);
    const s2 = await searchAllTag();
    ck("LD-05", !s2.err && !s2.ids.includes(leakJob.id), `search lộ Job Open của employer chưa xác minh ${leakJob.id.slice(0, 8)}: ${s2.err ? show(s2.err) : s2.ids.length + " Job"}`);
    ck("LD-05", !s2.err && wantOpen.every((id) => s2.ids.includes(id)), "search sau khi bơm phải vẫn thấy mọi Job Open của employer xác minh (đối chứng)");
    expect("LD-05", await call(null, "GET", `/jobs/${leakJob.id}`), [[404, "JOB_NOT_FOUND"]], `ẩn danh xem Job Open của employer chưa xác minh ${leakJob.id.slice(0, 8)}`);
    expect("LD-05", await call(pick(F), "GET", `/jobs/${leakJob.id}`), [[404, "JOB_NOT_FOUND"]], `finder xem Job Open của employer chưa xác minh ${leakJob.id.slice(0, 8)}`);
  } finally { sql(`UPDATE job SET status='Closed' WHERE jobId='${leakJob.id}'`); }

  // ══ LD-08: bất biến ══════════════════════════════════════════
  console.log("\n── LD-08: checkInvariants");
  const viol = checkInvariants(scope);
  ck("LD-08", viol.length === 0, `${viol.length} vi phạm: ${viol.slice(0, 5).join(" | ")}`);

  // ══ LD-09: thống kê ══════════════════════════════════════════
  const dist = {};
  for (const e of slice) dist[e.status] = (dist[e.status] || 0) + 1;
  const s429 = slice.filter((e) => e.status === 429);
  const s429search = s429.filter((e) => e.path.startsWith("/jobs?"));
  const searches = slice.filter((e) => e.path.startsWith("/jobs?"));
  ck("LD-09", s429.length === s429search.length, `429 ngoài search: ${s429.filter((e) => !e.path.startsWith("/jobs?")).map((e) => `${e.method} ${normPath(e.path)}`).slice(0, 3)}`);
  ck("LD-09", !slice.some((e) => e.status === 0 || e.status >= 500) && netErrors === 0, `có 5xx / lỗi mạng: ${JSON.stringify(dist)} net=${netErrors}`);
  const byRoute = {};
  for (const e of slice) { const k = `${e.method} ${normPath(e.path)} -> ${e.status}`; byRoute[k] = (byRoute[k] || 0) + 1; }
  console.log("\n── LD-09: thống kê");
  console.log(`   seed ${SEED} | BASE ${BASE}`);
  console.log(`   đợt tải: ${slice.length} request trong ${(loadMs / 1000).toFixed(1)}s | tổng test ${((Date.now() - tStart) / 1000).toFixed(0)}s`);
  console.log(`   phân bố status: ${Object.entries(dist).sort().map(([k, v]) => `${k}=${v}`).join(" ")}`);
  console.log(`   search: ${searches.length} request, ${s429search.length} bị 429 (hợp lệ, không tính lỗi), ${searches.filter((e) => e.status === 200).length} được 200`);
  console.log("   theo route:");
  for (const [k, v] of Object.entries(byRoute).sort()) console.log(`     ${String(v).padStart(4)}  ${k}`);
}

if (isMain(import.meta.url)) await runAttackSuites([{ name, run }]);
