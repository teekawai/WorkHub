import test from "node:test";
import assert from "node:assert/strict";
import { buildQuery, validateReason, mergeSelected, safeWebsite } from "../src/utils/adminEmployers.js";

test("ADM-EMP-1: buildQuery theo tab, isVerified=false vẫn gửi, không gửi limit", () => {
  assert.deepEqual(buildQuery({ keyword: "", tab: "all", page: 1 }), { page: 1 });
  assert.deepEqual(buildQuery({ keyword: " abc ", tab: "verified", page: 2 }), { keyword: "abc", isVerified: true, page: 2 });
  assert.deepEqual(buildQuery({ keyword: "   ", tab: "unverified", page: 1 }), { isVerified: false, page: 1 });
});

test("ADM-EMP-2: validateReason đếm sau trim", () => {
  assert.deepEqual(validateReason(""), { ok: false, count: 0, error: "Vui lòng nhập lý do" });
  assert.equal(validateReason("   \n ").error, "Vui lòng nhập lý do");
  assert.deepEqual(validateReason("  abc  "), { ok: true, count: 3, error: "" });
  assert.equal(validateReason(" " + "a".repeat(500) + " ").ok, true);
  const over = validateReason("a".repeat(501));
  assert.equal(over.ok, false);
  assert.equal(over.count, 501);
  assert.equal(over.error, "Tối đa 500 ký tự");
});

const old = { userId: 1, companyName: "Cũ", taxCode: "1", isVerified: false, openJobCount: 3 };

test("ADM-EMP-3: mergeSelected thay snapshot khi item còn trong list", () => {
  const fresh = { ...old, companyName: "Mới", isVerified: true };
  assert.equal(mergeSelected(old, [fresh], null), fresh);
  assert.equal(mergeSelected(old, [fresh], { isVerified: false }, 1), fresh); // list thắng patch
});

test("ADM-EMP-4: rời list sau verify / unverify thì patch cục bộ; không patch thì giữ nguyên", () => {
  assert.deepEqual(mergeSelected(old, [], { isVerified: true }, 1), { ...old, isVerified: true });
  const verified = { ...old, isVerified: true };
  assert.deepEqual(mergeSelected(verified, [], { isVerified: false, openJobCount: 0 }, 1), { ...old, isVerified: false, openJobCount: 0 });
  assert.equal(mergeSelected(old, [], null), old);
  assert.equal(mergeSelected(old, [], { isVerified: true }, 2), old); // đang mở công ty khác thì không patch nhầm
  assert.equal(mergeSelected(null, [old], null), null);
});

test("ADM-EMP-5: safeWebsite chỉ http/https", () => {
  assert.equal(safeWebsite("https://a.com"), "https://a.com");
  assert.equal(safeWebsite("HTTP://a.com"), "HTTP://a.com");
  assert.equal(safeWebsite("javascript:alert(1)"), null);
  assert.equal(safeWebsite(""), null);
  assert.equal(safeWebsite(null), null);
  assert.equal(safeWebsite("a.com"), null);
});
