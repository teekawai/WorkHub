// CS: nội dung + cơ chế cache hồ sơ (nhóm chức năng, không thuộc 1 Controller): hit giống miss, không lộ dữ liệu, cache-hit bằng SQL, cách ly user, race (chỉ ghi nhận)
// Chạy riêng: node backend/tests/profile-cache-test/consistency.test.mjs
import {
  EMP_KEYS, FIN_KEYS, J, LEAK_RE, ROUNDS, ck, empKey, errStr, finKey, finderBody, isMain, keyExists, keyVal, keysOk, makeEmployerSafe, makeFinderSafe,
  note, prime, profileOf, randTag, redisCmd, runAdminSuites, sql,
} from "./lib.mjs";

export const name = "CS: Nội dung + cơ chế cache hồ sơ";

export default async function run() {
  console.log("\n── C-01..04: GET lần 2 (cache hit) giống hệt lần 1 (miss), đúng bộ field, không lộ dữ liệu");
  const e = await makeEmployerSafe("pc_c1", true);
  const fFull = await makeFinderSafe("pc_c2", true);
  const fSparse = await makeFinderSafe("pc_c3", true);
  const sp = await J("PUT", "/finders/me", fSparse.token, finderBody({ description: null, linkedIn: null, address: null, dateOfBirth: null, gender: null, major: null }));
  ck("C-02", sp.status === 200, `PUT finder sparse ${errStr(sp)}`);

  const cases = [
    ["C-01 employer", "/employer/me", e, empKey(e.id), EMP_KEYS],
    ["C-02 finder đủ field", "/finders/me", fFull, finKey(fFull.id), FIN_KEYS],
    ["C-02 finder field null", "/finders/me", fSparse, finKey(fSparse.id), FIN_KEYS],
  ];
  for (const [id, path, u, key, want] of cases) {
    const miss = await J("GET", path, u.token); // lần 1: miss
    const hit = await J("GET", path, u.token); // lần 2: hit
    ck(id.split(" ")[0], miss.status === 200 && hit.status === 200 && miss.text === hit.text, `${id}: body hit khác body miss\n     miss=${miss.text?.slice(0, 300)}\n     hit =${hit.text?.slice(0, 300)}`);
    ck("C-03", keysOk(hit.data, want), `${id}: field=${Object.keys(hit.data || {}).sort().join(",")}`);
    const val = await keyVal(key);
    // BE lưu JSON PascalCase (BE Dev xác nhận) -> so tên field không phân biệt hoa thường
    ck("C-03", typeof val === "string" && keysOk(Object.fromEntries(Object.keys(JSON.parse(val)).map((k) => [k[0].toLowerCase() + k.slice(1), 1])), want), `${id}: JSON trong Redis khác bộ field DTO: ${String(val).slice(0, 200)}`);
    ck("C-04", !LEAK_RE.test(miss.text) && !LEAK_RE.test(hit.text) && !LEAK_RE.test(String(val)), `${id}: lộ dữ liệu nhạy cảm: ${String(val).slice(0, 300)}`);
    if (id.includes("null")) ck("C-02", hit.data.dateOfBirth === null && hit.data.linkedIn === null && "gender" in hit.data, `${id}: null phải còn là null, không bị bỏ field: ${hit.text}`);
    if (id.includes("đủ")) ck("C-02", typeof hit.data.dateOfBirth === "string" && hit.data.gender === "Male", `${id}: ${hit.text}`);
  }

  console.log("\n── C-05: cache-hit chứng minh bằng SQL (đổi DB không DEL khóa -> GET vẫn cũ; DEL khóa -> GET mới)");
  {
    const p = await prime("/employer/me", e.token, empKey(e.id));
    const nn = `PCQA_sql_${randTag()}`;
    sql(`UPDATE employerprofile SET companyName='${nn}' WHERE userId='${e.id}'`);
    const stale = await J("GET", "/employer/me", e.token);
    ck("C-05", p.primed && stale.data?.companyName === profileOf.pc_c1.companyName, `GET sau SQL phải còn giá trị cũ (từ cache): ${errStr(stale)}`);
    await redisCmd("DEL", empKey(e.id));
    const fresh = await J("GET", "/employer/me", e.token);
    ck("C-05", fresh.data?.companyName === nn, `sau DEL khóa phải thấy tên mới: ${errStr(fresh)}`);

    const pf = await prime("/finders/me", fFull.token, finKey(fFull.id));
    const fn = `Tên SQL ${randTag()}`;
    sql(`UPDATE finderprofile SET fullname='${fn}' WHERE userId='${fFull.id}'`);
    const stale2 = await J("GET", "/finders/me", fFull.token);
    ck("C-05", pf.primed && stale2.data?.fullname !== fn, `finder: GET sau SQL phải còn giá trị cũ: ${errStr(stale2)}`);
    await redisCmd("DEL", finKey(fFull.id));
    const fresh2 = await J("GET", "/finders/me", fFull.token);
    ck("C-05", fresh2.data?.fullname === fn, `finder: sau DEL khóa phải thấy tên mới: ${errStr(fresh2)}`);
  }

  console.log("\n── C-06: cách ly user + khác role");
  {
    const e2 = await makeEmployerSafe("pc_c4", true);
    const a = await J("GET", "/employer/me", e.token), b = await J("GET", "/employer/me", e2.token);
    ck("C-06", a.data?.email !== b.data?.email && a.data?.taxCode !== b.data?.taxCode && (await keyExists(empKey(e2.id))), `A=${a.data?.email} B=${b.data?.email}`);
    const x = await J("GET", "/employer/me", fFull.token); // token finder gọi endpoint employer
    ck("C-06", (x.status === 403 || x.status === 401) && !(await keyExists(empKey(fFull.id))), `finder gọi /employer/me: ${errStr(x)}, khóa employer của finder=${await keyExists(empKey(fFull.id))}`);
    const y = await J("GET", "/finders/me", e.token); // token employer gọi endpoint finder
    ck("C-06", (y.status === 403 || y.status === 401) && !(await keyExists(finKey(e.id))), `employer gọi /finders/me: ${errStr(y)}`);
  }

  console.log(`\n── C-08: race [PUT || GET x3] x ${Math.min(ROUNDS, 10)} vòng (chỉ ghi nhận, không làm đỏ)`);
  {
    const u = await makeEmployerSafe("pc_c5", true);
    const K = empKey(u.id);
    let stale = 0;
    const rounds = Math.min(ROUNDS, 10);
    for (let i = 0; i < rounds; i++) {
      await prime("/employer/me", u.token, K);
      const body = { ...profileOf.pc_c5, address: `race ${i} ${randTag()}` };
      await Promise.all([J("PUT", "/employer/me", u.token, body), J("GET", "/employer/me", u.token), J("GET", "/employer/me", u.token), J("GET", "/employer/me", u.token)]);
      const last = await J("GET", "/employer/me", u.token);
      if (last.data?.address !== body.address) stale++;
      profileOf.pc_c5 = body;
    }
    note("C-08", `${stale}/${rounds} vòng GET cuối thấy dữ liệu cũ sau PUT||GET đồng thời${stale ? " -> race cache-aside (GET đọc DB cũ ghi đè khóa sau khi PUT xóa), báo Reviewer" : " (không thấy race)"}`);
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }]);
