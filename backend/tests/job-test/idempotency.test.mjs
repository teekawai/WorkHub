// ID: Idempotency-Key cho POST /api/jobs (Redis thật) — Nhóm service: IdempotentAttribute + RedisIdempotencyStore (Business 7). Gồm ID-14: Redis lỗi -> 503
// Chạy riêng: node backend/tests/job-test/idempotency.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  J, ROUNDS, SKIP_ID14, TODAY, addDays, bearer, ck, delayed, errStr, isErr, isMain, jobExists, note, profileOf, raw, redisCmd, runSuites, setVerified, sleep, sqlInt, tally, uid, validJob, withExtraBackend,
} from "./lib.mjs";

export const name = "ID: Idempotency-Key cho POST /api/jobs (Redis thật)";

export default async function run(ctx) {
  const { E1, E2, E3, E4, F1, F2 } = ctx.U;
  const { OPT, jobE1, jobE3, jobE3c } = ctx;
  console.log("\n── ID: Idempotency-Key (Redis thật)");
  setVerified(E1, 1); setVerified(E2, 1); setVerified(E3, 0);
  const titleOf = (tag) => `${tag} ${uid()}`;
  const countByTitle = (u, title) => sqlInt(`SELECT COUNT(*) FROM job WHERE employerId='${u.id}' AND jobTitle='${title}'`);
  // key === null: bỏ header. Mọi POST ở nhóm này tự quản lý key (noIdem)
  const hdr = (u, key) => ({ ...bearer(u.token), ...(key === null ? {} : { "Idempotency-Key": key }) });
  const postK = (u, body, key, extra = {}) => raw("POST", "/jobs", { body, headers: hdr(u, key), noIdem: true, ...extra });
  const postRawK = (u, text, key) => raw("POST", "/jobs", { rawBody: text, headers: { ...hdr(u, key), "Content-Type": "application/json" }, noIdem: true });
  const keysOf = (u, key) => redisCmd("KEYS", `idem:${u.id}:*${key.toLowerCase()}*`);
  const IN_PROG = "REQUEST_IN_PROGRESS", REUSED = "IDEMPOTENCY_KEY_REUSED";
  const okOrInProg = (x) => x.status === 201 || isErr(x, 409, IN_PROG);

  // ID-01
  {
    const t = titleOf("ID01");
    const r = await postK(E1, validJob({ jobTitle: t }), null);
    ck("ID-01", isErr(r, 400, "VALIDATION_ERROR") && !!r.data.errors?.idempotencyKey, errStr(r));
    ck("ID-01", countByTitle(E1, t) === 0, "đã tạo Job khi thiếu header");
  }
  // ID-02
  for (const v of ["abc", "", "12345", "zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz", "   ", `${uid()}, ${uid()}`]) {
    const t = titleOf("ID02");
    const r = await postK(E1, validJob({ jobTitle: t }), v);
    ck("ID-02", isErr(r, 400, "VALIDATION_ERROR") && !!r.data.errors?.idempotencyKey && countByTitle(E1, t) === 0, `key="${v}" -> ${errStr(r)}`);
  }
  // ID-02p / ID-03d: mọi dạng UUID của cùng 1 giá trị phải replay cùng jobId (U-02)
  {
    const g = uid(), t = titleOf("ID02p"), body = validJob({ jobTitle: t });
    const first = await postK(E1, body, g);
    ck("ID-02p", first.status === 201, errStr(first));
    const forms = { upper: g.toUpperCase(), N: g.replace(/-/g, ""), upperN: g.replace(/-/g, "").toUpperCase(), braces: `{${g}}`, parens: `(${g})`, bracesUpper: `{${g.toUpperCase()}}` };
    for (const [label, v] of Object.entries(forms)) {
      const r = await postK(E1, body, v);
      const same = r.status === 201 && r.data?.jobId === first.data?.jobId;
      ck("ID-02p", same, `dạng ${label} (${v}) -> ${errStr(r)} (kỳ vọng replay jobId ${first.data?.jobId})`);
      if (label === "upper") ck("ID-03d", same, `UUID hoa -> ${errStr(r)}`);
    }
    ck("ID-02p", countByTitle(E1, t) === 1, `có ${countByTitle(E1, t)} Job cho cùng 1 UUID dưới nhiều dạng`);
    const nil = await postK(E1, validJob({ jobTitle: titleOf("ID02nil") }), "00000000-0000-0000-0000-000000000000");
    note("ID-02p", `nil UUID: ${nil.status} ${nil.text.slice(0, 120)}`);
  }
  // ID-03 / CT-04
  {
    const g = uid(), t = titleOf("ID03"), body = validJob({ jobTitle: t });
    const rs = [];
    for (let i = 0; i < 3; i++) rs.push(await postK(E1, body, g));
    ck("ID-03", rs.every((x) => x.status === 201), rs.map((x) => x.status).join(","));
    ck("ID-03", rs.every((x) => x.data?.jobId === rs[0].data?.jobId && x.headers.get("location") === `/api/jobs/${rs[0].data?.jobId}`), "jobId/Location lệch");
    ck("ID-03", rs.every((x) => x.text === rs[0].text && x.ct === rs[0].ct), `body/Content-Type replay không giống hệt byte lần đầu (ct: ${rs.map((x) => x.ct)}):\n  #0=${rs[0].text.slice(0, 700)}\n  #1=${rs[1].text.slice(0, 700)}`);
    ck("ID-03", rs.every((x) => JSON.stringify(x.data) === JSON.stringify(rs[0].data)) && rs.every((x) => x.ct.includes("application/json")), `content-type ${rs.map((x) => x.ct)}`);
    ck("ID-03", countByTitle(E1, t) === 1, `DB có ${countByTitle(E1, t)} Job`);
    ck("CT-04", rs[1].data?.createdAt === rs[0].data?.createdAt, "createdAt replay khác");
    // ID-03b: khác thứ tự key + khoảng trắng nhưng cùng giá trị -> replay (U-01)
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(body).reverse()), null, 3);
    const rb = await postRawK(E1, reordered, g);
    ck("ID-03b", rb.status === 201 && rb.data?.jobId === rs[0].data?.jobId, errStr(rb));
    // ID-03c: ghi nhận
    const rc1 = await postK(E1, { ...body, jobId: "x", status: "Closed" }, g);
    const rc2 = await postK(E1, { ...body, jobTitle: `  ${t}  ` }, g);
    note("ID-03c", `field thừa (jobId,status): ${rc1.status} ${rc1.data?.code || ""}; title thêm khoảng trắng: ${rc2.status} ${rc2.data?.code || ""}`);
  }
  // ID-04
  {
    const g = uid(), t = titleOf("ID04"), body = validJob({ jobTitle: t });
    const first = await postK(E1, body, g);
    for (const v of [{ jobTitle: t + "x" }, { salaryType: "Negotiable" }, { deadline: addDays(TODAY, 31) }]) {
      const r = await postK(E1, { ...body, ...v }, g);
      ck("ID-04", isErr(r, 409, REUSED), `${JSON.stringify(v)} -> ${errStr(r)}`);
    }
    ck("ID-04", countByTitle(E1, t) === 1 && countByTitle(E1, t + "x") === 0, "DB sai số Job");
    const again = await postK(E1, body, g);
    ck("ID-04", again.status === 201 && again.data?.jobId === first.data?.jobId, `replay sau 409: ${errStr(again)}`);
  }
  // ID-05 / ID-05b
  {
    const g = uid(), t = titleOf("ID05");
    const bad = validJob({ jobTitle: t, deadline: addDays(TODAY, -1) });
    const r1 = await postK(E1, bad, g);
    ck("ID-05", isErr(r1, 400, "VALIDATION_ERROR"), errStr(r1));
    ck("ID-05", (await keysOf(E1, g)).length === 0, "key còn trong Redis sau khi lỗi 400");
    const r1b = await postK(E1, bad, g);
    ck("ID-05", isErr(r1b, 400, "VALIDATION_ERROR"), `gửi lại body lỗi: ${errStr(r1b)}`);
    const r2 = await postK(E1, validJob({ jobTitle: t }), g);
    ck("ID-05", r2.status === 201 && countByTitle(E1, t) === 1, errStr(r2));

    const g2 = uid(), t2 = titleOf("ID05b");
    const rb = await postRawK(E1, "{bad", g2);
    ck("ID-05b", isErr(rb, 400, "VALIDATION_ERROR"), errStr(rb));
    const rb2 = await postK(E1, validJob({ jobTitle: t2 }), g2);
    ck("ID-05b", rb2.status === 201, errStr(rb2));
    const rb3 = await postRawK(E1, "{bad", null);
    note("ID-05b", `JSON hỏng + thiếu header: ${rb3.status} ${JSON.stringify(rb3.data)?.slice(0, 160)}`);
  }
  // ID-06: policy chạy trước filter (không gửi header)
  {
    const body = validJob({ jobTitle: titleOf("ID06") });
    const nt = await raw("POST", "/jobs", { body, noIdem: true });
    ck("ID-06", isErr(nt, 401, "UNAUTHENTICATED"), `không token: ${errStr(nt)}`);
    for (const [u, code] of [[F1, "FORBIDDEN_ROLE"], [E4, "EMPLOYER_PROFILE_NOT_FOUND"], [E3, "EMPLOYER_NOT_VERIFIED"]]) {
      const r = await postK(u, body, null);
      ck("ID-06", isErr(r, 403, code), `${u.name}: ${errStr(r)}`);
    }
    // ID-06b: 403 không "ăn" key
    const g = uid(), t = titleOf("ID06b");
    const r1 = await postK(E3, validJob({ jobTitle: t }), g);
    ck("ID-06b", isErr(r1, 403, "EMPLOYER_NOT_VERIFIED") && (await keysOf(E3, g)).length === 0, errStr(r1));
    setVerified(E3, 1);
    const r2 = await postK(E3, validJob({ jobTitle: t }), g);
    setVerified(E3, 0);
    ck("ID-06b", r2.status === 201 && countByTitle(E3, t) === 1, errStr(r2));
  }
  // ID-07: song song cùng key + body
  {
    const dist = {};
    for (let r = 0; r < ROUNDS; r++) {
      const g = uid(), t = titleOf("ID07"), body = validJob({ jobTitle: t });
      const res = await Promise.all(Array.from({ length: 10 }, () => delayed(Math.random() * 4, () => postK(E1, body, g))));
      const created = res.filter((x) => x.status === 201);
      const ids = new Set(created.map((x) => x.data?.jobId));
      tally(dist, `${created.length}x201+${res.length - created.length}x409`);
      const n = countByTitle(E1, t);
      const ok = res.every(okOrInProg) && created.length >= 1 && ids.size === 1 && n === 1
        && created.every((x) => x.text === created[0].text && x.ct === created[0].ct && x.headers.get("location") === created[0].headers.get("location"));
      ck("ID-07", ok, `vòng ${r}: ${res.map((x) => x.status + (x.data?.code ? ":" + x.data.code : "")).join(",")} jobs=${n} ids=${[...ids]}`);
      const f = await postK(E1, body, g);
      ck("ID-07", f.status === 201 && f.data?.jobId === created[0]?.data?.jobId, `sau race: ${errStr(f)}`);
    }
    note("ID-07", `phân bố (số 201 / số 409): ${JSON.stringify(dist)}`);
  }
  // ID-08: song song cùng key, 2 body khác nhau
  {
    const dist = {};
    for (let r = 0; r < ROUNDS; r++) {
      const g = uid(), tA = titleOf("ID08A"), tB = titleOf("ID08B");
      const bA = validJob({ jobTitle: tA }), bB = validJob({ jobTitle: tB });
      const fns = [...Array(5).fill(["A", bA]), ...Array(5).fill(["B", bB])].map(([tag, b]) => () => postK(E1, b, g).then((x) => ({ tag, x })));
      const res = await Promise.all(fns.map((f) => delayed(Math.random() * 4, f)));
      const nA = countByTitle(E1, tA), nB = countByTitle(E1, tB);
      const win = nA === 1 ? "A" : "B";
      const created = res.filter((z) => z.x.status === 201);
      const loserReused = res.filter((z) => z.tag !== win && isErr(z.x, 409, REUSED)).length;
      const loserInProg = res.filter((z) => z.tag !== win && isErr(z.x, 409, IN_PROG)).length;
      tally(dist, `loserREUSED=${loserReused},loserIN_PROGRESS=${loserInProg}`);
      const ok = nA + nB === 1
        && res.filter((z) => z.tag === win).every((z) => okOrInProg(z.x))
        && res.filter((z) => z.tag !== win).every((z) => z.x.status === 409 && [REUSED, IN_PROG].includes(z.x.data?.code))
        && new Set(created.map((z) => z.x.data?.jobId)).size === 1;
      ck("ID-08", ok, `vòng ${r} nA=${nA} nB=${nB}: ${res.map((z) => z.tag + z.x.status + (z.x.data?.code ? ":" + z.x.data.code : "")).join(",")}`);
    }
    note("ID-08", `request body thua nhận: ${JSON.stringify(dist)} (Dev 1: key đang xử lý + hash khác phải trả REUSED ngay)`);
  }
  // ID-09 / ID-09b: 2 user cùng key
  {
    for (let r = 0; r < ROUNDS; r++) {
      const g = uid(), t = titleOf("ID09"), body = validJob({ jobTitle: t });
      const fns = [...Array(5).fill(E1), ...Array(5).fill(E2)].map((u) => () => postK(u, body, g).then((x) => ({ u, x })));
      const res = await Promise.all(fns.map((f) => delayed(Math.random() * 4, f)));
      const ok = res.every((z) => okOrInProg(z.x));
      const idOf = (u) => new Set(res.filter((z) => z.u === u && z.x.status === 201).map((z) => z.x.data?.jobId));
      const a = idOf(E1), b = idOf(E2);
      const good = ok && a.size === 1 && b.size === 1 && !a.has([...b][0]) && countByTitle(E1, t) === 1 && countByTitle(E2, t) === 1
        && res.filter((z) => z.u === E2 && z.x.status === 201).every((z) => z.x.data.companyName === profileOf.E2.companyName)
        && res.filter((z) => z.u === E1 && z.x.status === 201).every((z) => z.x.data.companyName === profileOf.E1.companyName);
      ck("ID-09", good, `vòng ${r}: ${res.map((z) => z.u.name + z.x.status).join(",")} A=${[...a]} B=${[...b]}`);
    }
    const g = uid(), t = titleOf("ID09b"), body = validJob({ jobTitle: t });
    const ra = await postK(E1, body, g), rb = await postK(E2, body, g);
    ck("ID-09b", ra.status === 201 && rb.status === 201 && ra.data.jobId !== rb.data.jobId
      && ra.data.companyName === profileOf.E1.companyName && rb.data.companyName === profileOf.E2.companyName, `${errStr(ra)} | ${errStr(rb)}`);
  }
  // ID-10: 10 key khác nhau, cùng body
  {
    const t = titleOf("ID10"), body = validJob({ jobTitle: t });
    const res = await Promise.all(Array.from({ length: 10 }, () => postK(E1, body, uid())));
    ck("ID-10", res.every((x) => x.status === 201) && new Set(res.map((x) => x.data?.jobId)).size === 10 && countByTitle(E1, t) === 10, res.map((x) => x.status).join(","));
  }
  // ID-11: song song, body lỗi Service
  {
    const g = uid(), t = titleOf("ID11");
    const bad = validJob({ jobTitle: t, deadline: addDays(TODAY, -1) });
    const res = await Promise.all(Array.from({ length: 8 }, () => delayed(Math.random() * 4, () => postK(E1, bad, g))));
    ck("ID-11", res.every((x) => isErr(x, 400, "VALIDATION_ERROR") || isErr(x, 409, IN_PROG)) && countByTitle(E1, t) === 0, res.map((x) => x.status + (x.data?.code ? ":" + x.data.code : "")).join(","));
    ck("ID-11", (await keysOf(E1, g)).length === 0, "key còn trong Redis sau khi mọi request lỗi");
    const ok = await postK(E1, validJob({ jobTitle: t }), g);
    ck("ID-11", ok.status === 201 && countByTitle(E1, t) === 1, errStr(ok));
  }
  // ID-12 / 12b / 12c: TTL Redis thật
  {
    const g = uid(), t = titleOf("ID12"), body = validJob({ jobTitle: t });
    const r = await postK(E1, body, g);
    ck("ID-12", r.status === 201, errStr(r));
    const keys = await keysOf(E1, g);
    ck("ID-12", keys.length >= 1, `không thấy key idem trong Redis (${keys.length})`);
    note("ID-12", `số key Redis cho request: ${keys.length}; key mẫu: ${keys[0]}`);
    const ttls = [];
    for (const k of keys) ttls.push(await redisCmd("TTL", k));
    const ttl = Math.max(...ttls, -9);
    // Lua lưu thành công -> ~12h. TTL <= 60s nghĩa là còn ở trạng thái giữ chỗ (Lua lưu lỗi)
    ck("ID-12", ttl >= 43000 && ttl <= 43200, `TTL=${ttls} (kỳ vọng ~43200s; <=60 nghĩa là Lua lưu response LỖI)`);
    note("ID-12", `TTL sau 201 = ${ttls}`);
    await sleep(2200);
    const rp = await postK(E1, body, g);
    const ttl2 = Math.max(...(await Promise.all(keys.map((k) => redisCmd("TTL", k)))));
    ck("ID-12b", rp.status === 201 && rp.data?.jobId === r.data?.jobId && ttl2 <= ttl, `replay ${rp.status}, TTL ${ttl} -> ${ttl2} (không được gia hạn)`);
    const ru = await postK(E1, { ...body, jobTitle: t + "y" }, g);
    const ttl3 = Math.max(...(await Promise.all(keys.map((k) => redisCmd("TTL", k)))));
    ck("ID-12b", isErr(ru, 409, REUSED) && ttl3 <= ttl2, `reuse ${ru.status}, TTL ${ttl2} -> ${ttl3}`);
    // 12c: hết hạn thật
    for (const k of keys) await redisCmd("EXPIRE", k, 1);
    await sleep(2200);
    const r3 = await postK(E1, body, g);
    ck("ID-12c", r3.status === 201 && r3.data?.jobId !== r.data?.jobId && countByTitle(E1, t) === 2, `${errStr(r3)} jobs=${countByTitle(E1, t)}`);
  }
  // ID-13: ghi nhận replay sau khi Job bị sửa/xóa
  {
    const g = uid(), t = titleOf("ID13"), body = validJob({ jobTitle: t });
    const r = await postK(E1, body, g);
    await J("PUT", `/jobs/${r.data.jobId}`, E1.token, validJob({ jobTitle: t + " đã sửa" }));
    const rp = await postK(E1, body, g);
    note("ID-13", `replay sau PUT: ${rp.status}, title=${rp.data?.jobTitle === t ? "snapshot cũ" : rp.data?.jobTitle}`);
    await J("DELETE", `/jobs/${r.data.jobId}`, E1.token);
    const rd = await postK(E1, body, g);
    note("ID-13", `replay sau DELETE: ${rd.status}, jobId=${rd.data?.jobId === r.data.jobId ? "jobId đã xóa" : rd.data?.jobId}, job còn trong DB=${rd.data?.jobId ? jobExists(rd.data.jobId) : "n/a"}`);
  }

  // ─────────────── ID-14: Redis lỗi -> 503 (BE phụ :5166, trỏ Redis sai cổng; không đụng Redis thật) ───────────────
  if (!SKIP_ID14) {
    console.log("\n── ID-14: Redis lỗi -> 503 (BE phụ cổng 5166)");
    const badRedis = { Redis__ConnectionString: "localhost:6399,abortConnect=false,connectTimeout=2000,syncTimeout=2000,asyncTimeout=2000" };
    await withExtraBackend("ID-14", badRedis, async (base) => {
      const t = `ID14 ${uid()}`;
      const before = sqlInt(`SELECT COUNT(*) FROM job WHERE employerId='${E1.id}'`);
      const res = await fetch(`${base}/jobs`, {
        method: "POST",
        headers: { ...bearer(E1.token), "Content-Type": "application/json", "Idempotency-Key": uid() },
        body: JSON.stringify(validJob({ jobTitle: t })),
      });
      const body = await res.json().catch(() => null);
      ck("ID-14", res.status === 503 && body?.code === "SERVICE_UNAVAILABLE", `${res.status} ${JSON.stringify(body)}`);
      ck("ID-14", sqlInt(`SELECT COUNT(*) FROM job WHERE employerId='${E1.id}'`) === before, "Job vẫn được tạo khi Redis lỗi");
      const lst = await fetch(`${base}/employer/jobs`, { headers: bearer(E1.token) });
      ck("ID-14", lst.status === 200, `GET /employer/jobs trên BE phụ: ${lst.status}`);
    });
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
