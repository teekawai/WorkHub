/**
 * ═══════════════════════════════════════════════════════════════
 *  Employer Profile API — Automated Test Suite (22 Test Cases)
 *  Endpoint: PUT /api/employer/me
 *  Run: node tests/employer-profile-test.mjs
 * ═══════════════════════════════════════════════════════════════
 */

const BASE = "http://localhost:5165";
const API = `${BASE}/api`;

// ─── Helpers ────────────────────────────────────────────────────
let passCount = 0;
let failCount = 0;
let skipCount = 0;
const results = [];

function log(id, status, detail) {
  const icon = status === "PASS" ? "✅" : status === "FAIL" ? "❌" : "⏭️";
  if (status === "PASS") passCount++;
  else if (status === "FAIL") failCount++;
  else skipCount++;
  const line = `${icon} ${id.padEnd(6)} ${status.padEnd(5)} │ ${detail}`;
  console.log(line);
  results.push({ id, status, detail });
}

async function raw(method, path, { body, headers = {}, rawBody } = {}) {
  const url = `${API}${path}`;
  const opts = { method, headers: { ...headers } };
  if (rawBody !== undefined) {
    opts.body = rawBody;
  } else if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  let data = null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("json")) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    try { data = await res.text(); } catch { data = null; }
  }
  return { status: res.status, data, headers: res.headers };
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ─── Unique suffix to avoid collision between test runs ────────
const TS = Date.now();

// ─── Setup: register & login accounts ──────────────────────────
async function setup() {
  console.log("\n🔧  SETUP: Creating test accounts...\n");

  // Employer 1 (main test account)
  const emp1Reg = await raw("POST", "/auth/register", {
    body: { username: `emp1_${TS}`, email: `emp1_${TS}@test.com`, password: "Test1234!", role: "employer" }
  });
  console.log(`   Employer1 register: ${emp1Reg.status}`, emp1Reg.data);

  const emp1Login = await raw("POST", "/auth/login", {
    body: { email: `emp1_${TS}@test.com`, password: "Test1234!", rememberMe: false }
  });
  console.log(`   Employer1 login: ${emp1Login.status}`);
  const emp1Token = emp1Login.data?.accessToken;
  if (!emp1Token) throw new Error("Failed to get employer1 token");

  // Employer 2 (for duplicate checks)
  const emp2Reg = await raw("POST", "/auth/register", {
    body: { username: `emp2_${TS}`, email: `emp2_${TS}@test.com`, password: "Test1234!", role: "employer" }
  });
  console.log(`   Employer2 register: ${emp2Reg.status}`, emp2Reg.data);

  const emp2Login = await raw("POST", "/auth/login", {
    body: { email: `emp2_${TS}@test.com`, password: "Test1234!", rememberMe: false }
  });
  const emp2Token = emp2Login.data?.accessToken;
  if (!emp2Token) throw new Error("Failed to get employer2 token");

  // Employer 3 (for concurrent test P20)
  const emp3Reg = await raw("POST", "/auth/register", {
    body: { username: `emp3_${TS}`, email: `emp3_${TS}@test.com`, password: "Test1234!", role: "employer" }
  });
  console.log(`   Employer3 register: ${emp3Reg.status}`);

  const emp3Login = await raw("POST", "/auth/login", {
    body: { email: `emp3_${TS}@test.com`, password: "Test1234!", rememberMe: false }
  });
  const emp3Token = emp3Login.data?.accessToken;

  // Finder (for role test)
  const finderReg = await raw("POST", "/auth/register", {
    body: { username: `finder_${TS}`, email: `finder_${TS}@test.com`, password: "Test1234!", role: "finder" }
  });
  console.log(`   Finder register: ${finderReg.status}`, finderReg.data);

  const finderLogin = await raw("POST", "/auth/login", {
    body: { email: `finder_${TS}@test.com`, password: "Test1234!", rememberMe: false }
  });
  const finderToken = finderLogin.data?.accessToken;
  if (!finderToken) throw new Error("Failed to get finder token");

  return { emp1Token, emp2Token, emp3Token, finderToken };
}

// ─── Valid profile data builder ────────────────────────────────
function validProfile(overrides = {}) {
  return {
    companyName: `TestCompany_${TS}`,
    address: "123 Test Street, HCM",
    field: "IT",
    phone: "0901234567",
    taxCode: `${TS}`.slice(-10),  // 10 digits
    description: "A great company",
    website: "https://example.com",
    foundedYear: 2020,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
//  TEST CASES
// ═══════════════════════════════════════════════════════════════

async function runTests() {
  const { emp1Token, emp2Token, emp3Token, finderToken } = await setup();
  const auth1 = authHeader(emp1Token);
  const auth2 = authHeader(emp2Token);

  console.log("\n" + "═".repeat(70));
  console.log("  🧪  RUNNING 22 TEST CASES");
  console.log("═".repeat(70) + "\n");

  // ─────────── P1: First create, valid fields → 200 ─────────────
  {
    const r = await raw("PUT", "/employer/me", {
      body: validProfile(),
      headers: auth1,
    });
    log("P1", r.status === 200 ? "PASS" : "FAIL",
      `First create: expected 200, got ${r.status}. Data: ${JSON.stringify(r.data)?.slice(0, 120)}`);
  }

  // ─────────── P2: Update 1 field → 200 ─────────────────────────
  {
    const r = await raw("PUT", "/employer/me", {
      body: validProfile({ address: "456 New Address, HN" }),
      headers: auth1,
    });
    log("P2", r.status === 200 ? "PASS" : "FAIL",
      `Update 1 field: expected 200, got ${r.status}`);

    // Verify via GET
    const g = await raw("GET", "/employer/me", { headers: auth1 });
    const addressOk = g.data?.address === "456 New Address, HN";
    log("P2.1", addressOk ? "PASS" : "FAIL",
      `DB updated correctly: address = "${g.data?.address}"`);
  }

  // ─────────── P3: Empty body {} → 400 ─────────────────────────
  {
    const r = await raw("PUT", "/employer/me", {
      body: {},
      headers: auth1,
    });
    log("P3", r.status === 400 ? "PASS" : "FAIL",
      `Empty body: expected 400, got ${r.status}. ${JSON.stringify(r.data)?.slice(0, 150)}`);
  }

  // ─────────── P4: No body / wrong Content-Type → 400/415 ──────
  {
    // 4a: No body at all
    const r4a = await raw("PUT", "/employer/me", {
      headers: auth1,
    });
    log("P4a", [400, 415].includes(r4a.status) ? "PASS" : "FAIL",
      `No body: expected 400/415, got ${r4a.status}`);

    // 4b: Wrong Content-Type (text/plain)
    const r4b = await raw("PUT", "/employer/me", {
      rawBody: JSON.stringify(validProfile()),
      headers: { ...auth1, "Content-Type": "text/plain" },
    });
    log("P4b", [400, 415].includes(r4b.status) ? "PASS" : "FAIL",
      `Wrong Content-Type: expected 400/415, got ${r4b.status}`);
  }

  // ─────────── P5: Malformed JSON → 400 ─────────────────────────
  {
    const r = await raw("PUT", "/employer/me", {
      rawBody: '{companyName: broken json!!!',
      headers: { ...auth1, "Content-Type": "application/json" },
    });
    log("P5", r.status === 400 ? "PASS" : "FAIL",
      `Malformed JSON: expected 400, got ${r.status}`);
  }

  // ─────────── P6: companyName empty / spaces / null → 400 ─────
  {
    const r6a = await raw("PUT", "/employer/me", {
      body: validProfile({ companyName: "" }),
      headers: auth1,
    });
    log("P6a", r6a.status === 400 ? "PASS" : "FAIL",
      `companyName empty "": expected 400, got ${r6a.status}`);

    const r6b = await raw("PUT", "/employer/me", {
      body: validProfile({ companyName: "   " }),
      headers: auth1,
    });
    log("P6b", r6b.status === 400 ? "PASS" : "FAIL",
      `companyName whitespace "   ": expected 400, got ${r6b.status}`);

    const r6c = await raw("PUT", "/employer/me", {
      body: validProfile({ companyName: null }),
      headers: auth1,
    });
    log("P6c", r6c.status === 400 ? "PASS" : "FAIL",
      `companyName null: expected 400, got ${r6c.status}`);
  }

  // ─────────── P7: companyName too long (>100) → 400 ────────────
  {
    const longName = "A".repeat(150);
    const r = await raw("PUT", "/employer/me", {
      body: validProfile({ companyName: longName }),
      headers: auth1,
    });
    log("P7", r.status === 400 ? "PASS" : "FAIL",
      `companyName 150 chars: expected 400 (not 500), got ${r.status}. ${JSON.stringify(r.data)?.slice(0, 100)}`);
  }

  // ─────────── P8: foundedYear invalid → 400 ────────────────────
  {
    const cases = [
      { val: -1, label: "negative (-1)" },
      { val: 0, label: "zero (0)" },
      { val: 2099, label: "future (2099)" },
      { val: "abc", label: "string ('abc')" },
    ];
    for (const c of cases) {
      const r = await raw("PUT", "/employer/me", {
        body: validProfile({ foundedYear: c.val }),
        headers: auth1,
      });
      log("P8", r.status === 400 ? "PASS" : "FAIL",
        `foundedYear ${c.label}: expected 400, got ${r.status}`);
    }
  }

  // ─────────── P9: website invalid URL → 400 ────────────────────
  {
    const badUrls = ["abc", "javascript:alert(1)", "ftp://weird", "not a url"];
    for (const url of badUrls) {
      const r = await raw("PUT", "/employer/me", {
        body: validProfile({ website: url }),
        headers: auth1,
      });
      log("P9", r.status === 400 ? "PASS" : "FAIL",
        `website "${url}": expected 400, got ${r.status}`);
    }
  }

  // ─────────── P10: phone with letters / wrong length → 400 ────
  {
    const badPhones = ["abc123", "12345", "0123456789012345678"/* 19 digits */];
    for (const ph of badPhones) {
      const r = await raw("PUT", "/employer/me", {
        body: validProfile({ phone: ph }),
        headers: auth1,
      });
      log("P10", r.status === 400 ? "PASS" : "FAIL",
        `phone "${ph}": expected 400, got ${r.status}`);
    }
  }

  // ─────────── P11: taxCode bad format → 400 ────────────────────
  {
    const badTax = ["12345", "123456789012345", "abc1234567", "12345678901234"/* 14 digits */];
    for (const tc of badTax) {
      const r = await raw("PUT", "/employer/me", {
        body: validProfile({ taxCode: tc }),
        headers: auth1,
      });
      log("P11", r.status === 400 ? "PASS" : "FAIL",
        `taxCode "${tc}": expected 400, got ${r.status}`);
    }
  }

  // ─────────── P12: description with HTML/script → safe save ────
  {
    const xssDesc = '<script>alert("XSS")</script><b>Bold</b>';
    const r = await raw("PUT", "/employer/me", {
      body: validProfile({ description: xssDesc }),
      headers: auth1,
    });
    log("P12", r.status === 200 ? "PASS" : "FAIL",
      `HTML in description: expected 200 (safe save), got ${r.status}`);

    // Verify it reads back without execution (just stored as text)
    const g = await raw("GET", "/employer/me", { headers: auth1 });
    const descMatch = g.data?.description === xssDesc || (g.data?.description && g.data.description.includes("script"));
    log("P12.1", descMatch ? "PASS" : "FAIL",
      `Description stored as-is: "${g.data?.description?.slice(0, 60)}"`);
  }

  // ─────────── P13: Vietnamese + emoji → correct charset ────────
  {
    const vnName = `Công ty Việt Nam 😀_${TS}`;
    const r = await raw("PUT", "/employer/me", {
      body: validProfile({ companyName: vnName, description: "Mô tả tiếng Việt có dấu: ă ắ ế ứ ờ 🚀" }),
      headers: auth1,
    });
    log("P13", r.status === 200 ? "PASS" : "FAIL",
      `Vietnamese + emoji save: expected 200, got ${r.status}`);

    const g = await raw("GET", "/employer/me", { headers: auth1 });
    const nameOk = g.data?.companyName === vnName;
    const descOk = g.data?.description?.includes("🚀");
    log("P13.1", nameOk && descOk ? "PASS" : "FAIL",
      `Read back: name="${g.data?.companyName}", desc contains 🚀: ${descOk}`);

    // Restore original name for subsequent tests
    await raw("PUT", "/employer/me", {
      body: validProfile(),
      headers: auth1,
    });
  }

  // ─────────── P14: Duplicate companyName on update → 409 ───────
  {
    // First, create employer2's profile with a known company name
    const emp2Name = `Emp2Company_${TS}`;
    const r2 = await raw("PUT", "/employer/me", {
      body: validProfile({ companyName: emp2Name, taxCode: `${TS+1}`.slice(-10) }),
      headers: auth2,
    });
    console.log(`   [Setup P14] Employer2 profile created: ${r2.status}`);

    // Now employer1 tries to use employer2's company name
    const r = await raw("PUT", "/employer/me", {
      body: validProfile({ companyName: emp2Name }),
      headers: auth1,
    });
    log("P14", r.status === 409 ? "PASS" : "FAIL",
      `Duplicate companyName on update: expected 409, got ${r.status}. ${JSON.stringify(r.data)?.slice(0, 100)}`);
  }

  // ─────────── P15: Duplicate taxCode on update → 409 ──────────
  {
    const emp2Tax = `${TS+1}`.slice(-10);
    const r = await raw("PUT", "/employer/me", {
      body: validProfile({ taxCode: emp2Tax }),
      headers: auth1,
    });
    log("P15", r.status === 409 ? "PASS" : "FAIL",
      `Duplicate taxCode on update: expected 409, got ${r.status}. ${JSON.stringify(r.data)?.slice(0, 100)}`);
  }

  // ─────────── P16: Keep own name & taxCode → 200 ──────────────
  {
    const r = await raw("PUT", "/employer/me", {
      body: validProfile(), // same data as emp1's current profile
      headers: auth1,
    });
    log("P16", r.status === 200 ? "PASS" : "FAIL",
      `Keep own name/taxCode: expected 200 (no self-conflict), got ${r.status}`);
  }

  // ─────────── P17 ⚠️: Create with duplicate name/taxCode → 409 (bug?) ──
  {
    // Employer3 has no profile yet → this is a CREATE path
    // Try creating with Employer2's company name
    const emp2Name = `Emp2Company_${TS}`;
    const emp3Auth = authHeader(emp3Token);

    const r = await raw("PUT", "/employer/me", {
      body: validProfile({ companyName: emp2Name, taxCode: `${TS+2}`.slice(-10) }),
      headers: emp3Auth,
    });
    log("P17", r.status === 409 ? "PASS" : "FAIL",
      `⚠️ Create with duplicate name: expected 409, got ${r.status}. Code may have bug (no dup check on create). ${JSON.stringify(r.data)?.slice(0, 100)}`);
  }

  // ─────────── P18: Case-insensitive companyName ────────────────
  {
    const emp2Name = `Emp2Company_${TS}`;
    const upperName = emp2Name.toUpperCase();
    const r = await raw("PUT", "/employer/me", {
      body: validProfile({ companyName: upperName }),
      headers: auth1,
    });
    // This test documents behavior — depends on DB collation
    log("P18", r.status === 409 ? "PASS" : "FAIL",
      `Case-insensitive dup ("${upperName}"): got ${r.status}. DB collation utf8mb4_unicode_ci should be case-insensitive → expect 409`);
  }

  // ─────────── P19: Extra fields → ignored ──────────────────────
  {
    const r = await raw("PUT", "/employer/me", {
      body: { ...validProfile(), userId: "HACKER", logo: "http://evil.com/logo.png", email: "hack@evil.com", extraField: "junk" },
      headers: auth1,
    });
    log("P19", r.status === 200 ? "PASS" : "FAIL",
      `Extra fields: expected 200 (ignored), got ${r.status}`);

    // Verify extra fields didn't overwrite anything
    const g = await raw("GET", "/employer/me", { headers: auth1 });
    const logoNotOverwritten = g.data?.logo !== "http://evil.com/logo.png";
    log("P19.1", logoNotOverwritten ? "PASS" : "FAIL",
      `Extra fields not persisted: logo="${g.data?.logo}" (should NOT be evil URL)`);
  }

  // ─────────── P20: Concurrent first PUT → one 200, one 409 ────
  {
    // Register two new employers for this test
    const empA_email = `empA_${TS}@test.com`;
    const empB_email = `empB_${TS}@test.com`;

    await raw("POST", "/auth/register", {
      body: { username: `empA_${TS}`, email: empA_email, password: "Test1234!", role: "employer" }
    });
    await raw("POST", "/auth/register", {
      body: { username: `empB_${TS}`, email: empB_email, password: "Test1234!", role: "employer" }
    });

    const loginA = await raw("POST", "/auth/login", { body: { email: empA_email, password: "Test1234!", rememberMe: false } });
    const loginB = await raw("POST", "/auth/login", { body: { email: empB_email, password: "Test1234!", rememberMe: false } });

    const tokenA = loginA.data?.accessToken;
    const tokenB = loginB.data?.accessToken;

    if (!tokenA || !tokenB) {
      log("P20", "SKIP", "Could not create accounts for concurrent test");
    } else {
      // Both try to create with the SAME company name concurrently
      const sameName = `ConcurrentCo_${TS}`;
      const [rA, rB] = await Promise.all([
        raw("PUT", "/employer/me", {
          body: validProfile({ companyName: sameName, taxCode: `${TS+10}`.slice(-10) }),
          headers: authHeader(tokenA),
        }),
        raw("PUT", "/employer/me", {
          body: validProfile({ companyName: sameName, taxCode: `${TS+11}`.slice(-10) }),
          headers: authHeader(tokenB),
        }),
      ]);

      const statuses = [rA.status, rB.status].sort();
      const oneOk = statuses.includes(200);
      const has500 = statuses.includes(500);
      log("P20", !has500 ? "PASS" : "FAIL",
        `Concurrent create: statuses=[${rA.status}, ${rB.status}]. Expected no 500. ${has500 ? "⚠️ Got 500 — race condition / unique constraint violation" : "OK"}`);
    }
  }

  // ─────────── P21: Finder token → 403 ─────────────────────────
  {
    const r = await raw("PUT", "/employer/me", {
      body: validProfile(),
      headers: authHeader(finderToken),
    });
    log("P21", r.status === 403 ? "PASS" : "FAIL",
      `Finder token: expected 403, got ${r.status}`);
  }

  // ─────────── P22: No token → 401 ─────────────────────────────
  {
    const r = await raw("PUT", "/employer/me", {
      body: validProfile(),
    });
    log("P22", r.status === 401 ? "PASS" : "FAIL",
      `No token: expected 401, got ${r.status}`);
  }

  // ─────────── P23-P26: unique index taxCode / companyName + mật khẩu 8 ký tự ──
  await runUniqueAndPasswordTests();

  // ─── Summary ─────────────────────────────────────────────────
  console.log("\n" + "═".repeat(70));
  console.log(`  📊  SUMMARY: ${passCount} PASS │ ${failCount} FAIL │ ${skipCount} SKIP │ Total: ${results.length}`);
  console.log("═".repeat(70));

  if (failCount > 0) {
    console.log("\n  ❌ FAILED TESTS:");
    for (const r of results.filter(r => r.status === "FAIL")) {
      console.log(`     ${r.id}: ${r.detail}`);
    }
  }
  console.log();
}

// ─── P23-P26: race trên unique index + rule mật khẩu ───────────
// Dùng helper sql của job-test để đối chiếu DB và tự dọn dữ liệu (email qa_uq_${TS}_*).
async function runUniqueAndPasswordTests() {
  const { sql, sqlInt } = await import("./job-test/lib.mjs");
  const ROUNDS = 10;
  // rate limit auth 100 req/phút/IP: chờ sang cửa sổ mới trước mỗi nhóm tạo ~40 user
  const newWindow = () => new Promise((r) => setTimeout(r, 61000));
  const emailLike = `qa_uq_${TS}_%@test.com`;
  const mkEmp = async (tag) => {
    const email = `qa_uq_${TS}_${tag}@test.com`;
    await raw("POST", "/auth/register", { body: { username: `qa_uq_${TS}_${tag}`.slice(0, 50), email, password: "Test1234!", role: "employer" } });
    const l = await raw("POST", "/auth/login", { body: { email, password: "Test1234!", rememberMe: false } });
    if (!l.data?.accessToken) throw new Error(`login ${tag} fail ${l.status}`);
    return authHeader(l.data.accessToken);
  };
  const profile = (name, tax) => ({ ...validProfile({ companyName: name, taxCode: tax }) });
  // taxCode 10 số, khác dải của các test trước (TS+0..11)
  const tax = (i, k) => `${String(TS).slice(-7)}${String(i).padStart(2, "0")}${k}`.slice(0, 10);

  try {
    // ─── P23: cùng taxCode, khác tên, đồng thời → đúng 1x200 + 1x409 TAX_CODE_TAKEN ──
    {
      await newWindow();
      let bad = [];
      for (let i = 0; i < ROUNDS; i++) {
        const [a, b] = [await mkEmp(`t${i}a`), await mkEmp(`t${i}b`)];
        const tc = tax(i, 1);
        const rs = await Promise.all([
          raw("PUT", "/employer/me", { body: profile(`UqTaxA_${TS}_${i}`, tc), headers: a }),
          raw("PUT", "/employer/me", { body: profile(`UqTaxB_${TS}_${i}`, tc), headers: b }),
        ]);
        const ok = rs.filter((r) => r.status === 200).length;
        const dup = rs.filter((r) => r.status === 409 && r.data?.code === "TAX_CODE_TAKEN").length;
        const inDb = sqlInt(`SELECT COUNT(*) FROM employerprofile WHERE taxCode='${tc}'`);
        if (ok !== 1 || dup !== 1 || inDb !== 1) bad.push(`vòng ${i}: ${rs.map((r) => `${r.status}/${r.data?.code}`).join(",")} db=${inDb}`);
      }
      log("P23", bad.length === 0 ? "PASS" : "FAIL",
        `Race cùng taxCode ×${ROUNDS}: đúng 1x200 + 1x409 TAX_CODE_TAKEN, DB 1 dòng. ${bad.join(" | ")}`);
    }

    // ─── P24: cùng companyName, khác taxCode, đồng thời → 1x200 + 1x409 COMPANY_NAME_TAKEN ──
    {
      await newWindow();
      let bad = [];
      for (let i = 0; i < ROUNDS; i++) {
        const [a, b] = [await mkEmp(`n${i}a`), await mkEmp(`n${i}b`)];
        const name = `UqName_${TS}_${i}`;
        const rs = await Promise.all([
          raw("PUT", "/employer/me", { body: profile(name, tax(i, 2)), headers: a }),
          raw("PUT", "/employer/me", { body: profile(name, tax(i, 3)), headers: b }),
        ]);
        const ok = rs.filter((r) => r.status === 200).length;
        const dup = rs.filter((r) => r.status === 409 && r.data?.code === "COMPANY_NAME_TAKEN").length;
        const inDb = sqlInt(`SELECT COUNT(*) FROM employerprofile WHERE companyName='${name}'`);
        if (ok !== 1 || dup !== 1 || inDb !== 1) bad.push(`vòng ${i}: ${rs.map((r) => `${r.status}/${r.data?.code}`).join(",")} db=${inDb}`);
      }
      log("P24", bad.length === 0 ? "PASS" : "FAIL",
        `Race cùng companyName ×${ROUNDS}: đúng 1x200 + 1x409 COMPANY_NAME_TAKEN, DB 1 dòng. ${bad.join(" | ")}`);
    }

    // ─── P25: tuần tự trùng taxCode → 409 TAX_CODE_TAKEN (đường check trước khi lưu) ──
    {
      const [a, b] = [await mkEmp("seqa"), await mkEmp("seqb")];
      const tc = tax(99, 4);
      const r1 = await raw("PUT", "/employer/me", { body: profile(`UqSeqA_${TS}`, tc), headers: a });
      const r2 = await raw("PUT", "/employer/me", { body: profile(`UqSeqB_${TS}`, tc), headers: b });
      log("P25", r1.status === 200 && r2.status === 409 && r2.data?.code === "TAX_CODE_TAKEN" ? "PASS" : "FAIL",
        `Tuần tự trùng taxCode: ${r1.status}, rồi ${r2.status}/${r2.data?.code} (expect 200 rồi 409/TAX_CODE_TAKEN)`);
    }

    // ─── P26: mật khẩu tối thiểu 8 ký tự ──
    {
      const em = (t) => `qa_uq_${TS}_pw${t}@test.com`;
      const r7 = await raw("POST", "/auth/register", { body: { username: `qa_uq_${TS}_pw7`, email: em(7), password: "Abcd12!", role: "finder" } });
      log("P26.1", r7.status === 400 && /8 ký tự/.test(JSON.stringify(r7.data)) ? "PASS" : "FAIL",
        `Register 7 ký tự: expected 400 + message 8 ký tự, got ${r7.status} ${JSON.stringify(r7.data)?.slice(0, 120)}`);
      const r8 = await raw("POST", "/auth/register", { body: { username: `qa_uq_${TS}_pw8`, email: em(8), password: "Abcd123!", role: "finder" } });
      log("P26.2", r8.status === 200 || r8.status === 201 ? "PASS" : "FAIL",
        `Register 8 ký tự: expected thành công, got ${r8.status} ${JSON.stringify(r8.data)?.slice(0, 120)}`);
      const l7 = await raw("POST", "/auth/login", { body: { email: em(8), password: "Abcd12!", rememberMe: false } });
      log("P26.3", l7.status === 400 ? "PASS" : "FAIL", `Login 7 ký tự: expected 400, got ${l7.status}`);
    }
  } catch (e) {
    log("P23-26", "FAIL", `Lỗi ngoài dự kiến: ${e.message}`);
  } finally {
    // Dọn dữ liệu do P23-P26 tạo
    try {
      const ids = `SELECT userId FROM (SELECT userId FROM users WHERE email LIKE '${emailLike}') t`;
      sql(`DELETE FROM refreshToken WHERE userId IN (${ids})`);
      sql(`DELETE FROM employerprofile WHERE userId IN (${ids})`);
      sql(`DELETE FROM finderprofile WHERE userId IN (${ids})`);
      sql(`DELETE FROM users WHERE email LIKE '${emailLike}'`);
      console.log(`   🧹 P23-26 cleanup: còn ${sqlInt(`SELECT COUNT(*) FROM users WHERE email LIKE '${emailLike}'`)} user`);
    } catch (e) { console.log("   ⚠️ cleanup P23-26 lỗi:", e.message); }
  }
}

// ─── Run ────────────────────────────────────────────────────────
runTests().catch(err => {
  console.error("💥  Fatal error:", err);
  process.exit(1);
});
