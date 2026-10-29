/**
 * ═══════════════════════════════════════════════════════════════
 *  Finder Profile API — Automated Test Suite (F1 - F20)
 *  Endpoints: 
 *    GET  /api/finders/me
 *    PUT  /api/finders/me
 *    POST /api/finders/me/avatar
 *    POST /api/finders/me/cv
 *  Run: node tests/finder-profile-test.mjs
 * ═══════════════════════════════════════════════════════════════
 */

const BASE = "http://localhost:5165";
const API = `${BASE}/api`;

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

async function raw(method, path, { body, headers = {}, rawBody, formData } = {}) {
  const url = `${API}${path}`;
  const opts = { method, headers: { ...headers } };
  if (formData) {
    opts.body = formData;
  } else if (rawBody !== undefined) {
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

const TS = Date.now();

async function setup() {
  console.log("\n🔧  SETUP: Creating test accounts for Finder tests...\n");

  // Finder 1 (Main test account)
  const f1Reg = await raw("POST", "/auth/register", {
    body: { username: `finder1_${TS}`, email: `finder1_${TS}@test.com`, password: "Test1234!", role: "finder" }
  });
  console.log(`   Finder 1 register: ${f1Reg.status}`);

  const f1Login = await raw("POST", "/auth/login", {
    body: { email: `finder1_${TS}@test.com`, password: "Test1234!", rememberMe: false }
  });
  console.log(`   Finder 1 login: ${f1Login.status}`);
  const finder1Token = f1Login.data?.accessToken;

  // Finder 2 (Brand new, no profile yet, for 404 tests)
  const f2Reg = await raw("POST", "/auth/register", {
    body: { username: `finder2_${TS}`, email: `finder2_${TS}@test.com`, password: "Test1234!", role: "finder" }
  });
  console.log(`   Finder 2 register: ${f2Reg.status}`);

  const f2Login = await raw("POST", "/auth/login", {
    body: { email: `finder2_${TS}@test.com`, password: "Test1234!", rememberMe: false }
  });
  const finder2Token = f2Login.data?.accessToken;

  // Employer (for 403 role checks)
  const empReg = await raw("POST", "/auth/register", {
    body: { username: `emp_${TS}`, email: `emp_${TS}@test.com`, password: "Test1234!", role: "employer" }
  });
  console.log(`   Employer register: ${empReg.status}`);

  const empLogin = await raw("POST", "/auth/login", {
    body: { email: `emp_${TS}@test.com`, password: "Test1234!", rememberMe: false }
  });
  const empToken = empLogin.data?.accessToken;

  return { finder1Token, finder2Token, empToken };
}

function validFinderProfile(overrides = {}) {
  return {
    fullname: "Nguyen Van A",
    phone: "0901234567",
    address: "123 Le Loi, Quan 1, TP HCM",
    educationLevel: "Bachelor",
    major: "Software Engineering",
    experience: "2 years React and .NET developer",
    skill: "React, Node.js, C#, MySQL",
    linkedIn: "https://linkedin.com/in/nguyenvana",
    description: "Passionate developer looking for challenging opportunities",
    ...overrides,
  };
}

async function runTests() {
  const { finder1Token, finder2Token, empToken } = await setup();
  const authF1 = authHeader(finder1Token);
  const authF2 = authHeader(finder2Token);
  const authEmp = authHeader(empToken);

  console.log("\n" + "═".repeat(70));
  console.log("  🧪  RUNNING FINDER PROFILE TEST CASES (F1 - F20)");
  console.log("═".repeat(70) + "\n");

  // ─────────── F4: GET profile when not created yet → 404 ──────
  {
    const r = await raw("GET", "/finders/me", { headers: authF2 });
    log("F4", r.status === 404 ? "PASS" : "FAIL",
      `GET profile when empty: expected 404, got ${r.status}. Data: ${JSON.stringify(r.data)}`);
  }

  // ─────────── F1: First create profile → 200 ──────────────────
  {
    const r = await raw("PUT", "/finders/me", {
      body: validFinderProfile(),
      headers: authF1,
    });
    log("F1", r.status === 200 ? "PASS" : "FAIL",
      `First create profile: expected 200, got ${r.status}. Data: ${JSON.stringify(r.data)?.slice(0, 120)}`);
  }

  // ─────────── F3: GET profile after create → 200 with email ────
  {
    const r = await raw("GET", "/finders/me", { headers: authF1 });
    const hasEmail = !!r.data?.email;
    const ok = r.status === 200 && hasEmail;
    log("F3", ok ? "PASS" : "FAIL",
      `GET profile: expected 200 with email, got ${r.status}, email="${r.data?.email}", fullname="${r.data?.fullname}"`);
  }

  // ─────────── F2: Update 1 field → 200 & verify DB ────────────
  {
    const r = await raw("PUT", "/finders/me", {
      body: validFinderProfile({ address: "789 Nguyen Hue, Da Nang" }),
      headers: authF1,
    });
    log("F2", r.status === 200 ? "PASS" : "FAIL",
      `Update profile: expected 200, got ${r.status}`);

    const g = await raw("GET", "/finders/me", { headers: authF1 });
    const addressOk = g.data?.address === "789 Nguyen Hue, Da Nang";
    log("F2.1", addressOk ? "PASS" : "FAIL",
      `DB updated correctly: address = "${g.data?.address}"`);
  }

  // ─────────── F5: Empty body {} → 400 ─────────────────────────
  {
    const r = await raw("PUT", "/finders/me", {
      body: {},
      headers: authF1,
    });
    log("F5", r.status === 400 ? "PASS" : "FAIL",
      `Empty body: expected 400, got ${r.status}. ${JSON.stringify(r.data)?.slice(0, 120)}`);
  }

  // ─────────── F6: No body or wrong Content-Type → 400/415 ─────
  {
    const r6a = await raw("PUT", "/finders/me", { headers: authF1 });
    log("F6a", [400, 415].includes(r6a.status) ? "PASS" : "FAIL",
      `No body: expected 400/415, got ${r6a.status}`);

    const r6b = await raw("PUT", "/finders/me", {
      rawBody: JSON.stringify(validFinderProfile()),
      headers: { ...authF1, "Content-Type": "text/plain" },
    });
    log("F6b", [400, 415].includes(r6b.status) ? "PASS" : "FAIL",
      `Wrong Content-Type: expected 400/415, got ${r6b.status}`);
  }

  // ─────────── F7: Malformed JSON → 400 ─────────────────────────
  {
    const r = await raw("PUT", "/finders/me", {
      rawBody: '{fullname: broken syntax',
      headers: { ...authF1, "Content-Type": "application/json" },
    });
    log("F7", r.status === 400 ? "PASS" : "FAIL",
      `Malformed JSON: expected 400, got ${r.status}`);
  }

  // ─────────── F8: fullname empty / spaces / null → 400 ────────
  {
    const r8a = await raw("PUT", "/finders/me", {
      body: validFinderProfile({ fullname: "" }),
      headers: authF1,
    });
    log("F8a", r8a.status === 400 ? "PASS" : "FAIL",
      `fullname empty "": expected 400, got ${r8a.status}`);

    const r8b = await raw("PUT", "/finders/me", {
      body: validFinderProfile({ fullname: "   " }),
      headers: authF1,
    });
    log("F8b", r8b.status === 400 ? "PASS" : "FAIL",
      `fullname whitespace: expected 400, got ${r8b.status}`);

    const r8c = await raw("PUT", "/finders/me", {
      body: validFinderProfile({ fullname: null }),
      headers: authF1,
    });
    log("F8c", r8c.status === 400 ? "PASS" : "FAIL",
      `fullname null: expected 400, got ${r8c.status}`);
  }

  // ─────────── F9: fullname too long (>100 chars) → 400 ────────
  {
    const longName = "Tran ".repeat(30); // > 120 chars
    const r = await raw("PUT", "/finders/me", {
      body: validFinderProfile({ fullname: longName }),
      headers: authF1,
    });
    log("F9", r.status === 400 ? "PASS" : "FAIL",
      `fullname too long: expected 400 (not 500), got ${r.status}. ${JSON.stringify(r.data)?.slice(0, 100)}`);
  }

  // ─────────── F10: phone empty / null → 400 ───────────────────
  {
    const r10a = await raw("PUT", "/finders/me", {
      body: validFinderProfile({ phone: "" }),
      headers: authF1,
    });
    log("F10a", r10a.status === 400 ? "PASS" : "FAIL",
      `phone empty "": expected 400, got ${r10a.status}`);

    const r10b = await raw("PUT", "/finders/me", {
      body: validFinderProfile({ phone: null }),
      headers: authF1,
    });
    log("F10b", r10b.status === 400 ? "PASS" : "FAIL",
      `phone null: expected 400, got ${r10b.status}`);
  }

  // ─────────── F11: phone bad format / length → 400 ────────────
  {
    const badPhones = ["abc1234567", "12345", "0123456789012345678"/* 19 digits */];
    for (const ph of badPhones) {
      const r = await raw("PUT", "/finders/me", {
        body: validFinderProfile({ phone: ph }),
        headers: authF1,
      });
      log("F11", r.status === 400 ? "PASS" : "FAIL",
        `phone "${ph}": expected 400, got ${r.status}`);
    }
  }

  // ─────────── F12: linkedIn bad URL / XSS → 400 / safe ───────
  {
    const badUrls = ["javascript:alert(1)", "ftp://bad"];
    for (const url of badUrls) {
      const r = await raw("PUT", "/finders/me", {
        body: validFinderProfile({ linkedIn: url }),
        headers: authF1,
      });
      log("F12", r.status === 400 ? "PASS" : "FAIL",
        `linkedIn "${url}": expected 400, got ${r.status}`);
    }
  }

  // ─────────── F13: HTML/Script in description/skill → safe ────
  {
    const xssDesc = '<script>alert("XSS")</script><b>Developer</b>';
    const r = await raw("PUT", "/finders/me", {
      body: validFinderProfile({ description: xssDesc, skill: "C#, <script>bad</script>" }),
      headers: authF1,
    });
    log("F13", r.status === 200 ? "PASS" : "FAIL",
      `HTML in description/skill: expected 200 (safe save), got ${r.status}`);

    const g = await raw("GET", "/finders/me", { headers: authF1 });
    const ok = g.data?.description === xssDesc;
    log("F13.1", ok ? "PASS" : "FAIL",
      `Description read back correctly: "${g.data?.description?.slice(0, 60)}"`);
  }

  // ─────────── F14: Vietnamese + Emoji charset → 200 ───────────
  {
    const vnName = "Nguyễn Văn Đạt 🚀";
    const vnDesc = "Lập trình viên nhiệt huyết 😀, kỹ năng tốt: C#, .NET, React";
    const r = await raw("PUT", "/finders/me", {
      body: validFinderProfile({ fullname: vnName, description: vnDesc }),
      headers: authF1,
    });
    log("F14", r.status === 200 ? "PASS" : "FAIL",
      `Vietnamese + emoji save: expected 200, got ${r.status}`);

    const g = await raw("GET", "/finders/me", { headers: authF1 });
    const ok = g.data?.fullname === vnName && g.data?.description?.includes("😀");
    log("F14.1", ok ? "PASS" : "FAIL",
      `Read back: fullname="${g.data?.fullname}", desc has emoji: ${ok}`);
  }

  // ─────────── F15: Extra fields ignored → 200 ─────────────────
  {
    const r = await raw("PUT", "/finders/me", {
      body: {
        ...validFinderProfile(),
        userId: "HACKER",
        avatar: "https://evil.com/fake.png",
        cv: "https://evil.com/fake.pdf",
        email: "hacker@evil.com",
        dateOfBirth: "2000-01-01"
      },
      headers: authF1,
    });
    log("F15", r.status === 200 ? "PASS" : "FAIL",
      `Extra fields in PUT body: expected 200 (ignored), got ${r.status}`);

    const g = await raw("GET", "/finders/me", { headers: authF1 });
    const notOverwritten = g.data?.avatar !== "https://evil.com/fake.png" && g.data?.email !== "hacker@evil.com";
    log("F15.1", notOverwritten ? "PASS" : "FAIL",
      `Read back: avatar="${g.data?.avatar}" (not overwritten by extra field)`);
  }

  // ─────────── F16: Employer token calling finder API → 403 ────
  {
    const rGet = await raw("GET", "/finders/me", { headers: authEmp });
    const rPut = await raw("PUT", "/finders/me", {
      body: validFinderProfile(),
      headers: authEmp,
    });
    log("F16", rGet.status === 403 && rPut.status === 403 ? "PASS" : "FAIL",
      `Employer token calling finder API: GET=${rGet.status}, PUT=${rPut.status}. Expected 403.`);
  }

  // ─────────── F17: No token calling finder API → 401 ──────────
  {
    const rGet = await raw("GET", "/finders/me");
    const rPut = await raw("PUT", "/finders/me", { body: validFinderProfile() });
    log("F17", rGet.status === 401 && rPut.status === 401 ? "PASS" : "FAIL",
      `No token calling finder API: GET=${rGet.status}, PUT=${rPut.status}. Expected 401.`);
  }

  // ─────────── F18: Upload Avatar tests ────────────────────────
  {
    // 18a: Upload avatar when no profile yet -> 404
    const formEmpty = new FormData();
    const fakeJpg = new Blob(["fake image content"], { type: "image/jpeg" });
    formEmpty.append("avatar", fakeJpg, "avatar.jpg");
    const r18a = await raw("POST", "/finders/me/avatar", {
      formData: formEmpty,
      headers: authF2, // Finder 2 has no profile yet
    });
    log("F18a", r18a.status === 404 ? "PASS" : "FAIL",
      `Upload avatar when no profile: expected 404, got ${r18a.status}`);

    // 18b: Upload avatar with invalid extension (.txt) -> 400
    const formBadExt = new FormData();
    const fakeTxt = new Blob(["text content"], { type: "text/plain" });
    formBadExt.append("avatar", fakeTxt, "bad.txt");
    const r18b = await raw("POST", "/finders/me/avatar", {
      formData: formBadExt,
      headers: authF1, // Finder 1 has profile
    });
    log("F18b", r18b.status === 400 ? "PASS" : "FAIL",
      `Upload avatar invalid extension (.txt): expected 400, got ${r18b.status}. ${JSON.stringify(r18b.data)?.slice(0, 100)}`);
  }

  // ─────────── F19: Upload CV tests ────────────────────────────
  {
    // 19a: Upload CV when no profile yet -> 404
    const formEmpty = new FormData();
    const fakePdf = new Blob(["%PDF-1.4 test"], { type: "application/pdf" });
    formEmpty.append("cv", fakePdf, "resume.pdf");
    const r19a = await raw("POST", "/finders/me/cv", {
      formData: formEmpty,
      headers: authF2, // Finder 2 has no profile yet
    });
    log("F19a", r19a.status === 404 ? "PASS" : "FAIL",
      `Upload CV when no profile: expected 404, got ${r19a.status}`);

    // 19b: Upload CV with invalid extension (.jpg) -> 400
    const formBadExt = new FormData();
    const fakeJpg = new Blob(["fake jpg"], { type: "image/jpeg" });
    formBadExt.append("cv", fakeJpg, "not_cv.jpg");
    const r19b = await raw("POST", "/finders/me/cv", {
      formData: formBadExt,
      headers: authF1, // Finder 1 has profile
    });
    log("F19b", r19b.status === 400 ? "PASS" : "FAIL",
      `Upload CV invalid extension (.jpg): expected 400, got ${r19b.status}. ${JSON.stringify(r19b.data)?.slice(0, 100)}`);
  }

  // ─────────── F20: Concurrent PUT on create ───────────────────
  {
    // Finder 3 for concurrent test
    const f3Email = `finder3_${TS}@test.com`;
    await raw("POST", "/auth/register", {
      body: { username: `finder3_${TS}`, email: f3Email, password: "Test1234!", role: "finder" }
    });
    const f3Login = await raw("POST", "/auth/login", { body: { email: f3Email, password: "Test1234!", rememberMe: false } });
    const f3Token = f3Login.data?.accessToken;

    if (!f3Token) {
      log("F20", "SKIP", "Could not create account for Finder 3 concurrent test");
    } else {
      const authF3 = authHeader(f3Token);
      // Both requests sent simultaneously by Finder 3 creating profile
      const [rA, rB] = await Promise.all([
        raw("PUT", "/finders/me", { body: validFinderProfile({ fullname: "First" }), headers: authF3 }),
        raw("PUT", "/finders/me", { body: validFinderProfile({ fullname: "Second" }), headers: authF3 }),
      ]);
      const statuses = [rA.status, rB.status];
      const has500 = statuses.includes(500);
      log("F20", !has500 ? "PASS" : "FAIL",
        `Concurrent PUT on same user: statuses=[${rA.status}, ${rB.status}]. Expected no 500.`);
    }
  }

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

runTests().catch(err => {
  console.error("💥  Fatal error:", err);
  process.exit(1);
});
