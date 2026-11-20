import test from "node:test";
import assert from "node:assert/strict";
import { getAdminErrorMsg, getAdminErrorCode, getFieldError, getRetryAfterSeconds, cleanParams } from "../src/api/admin.js";
import homeOf from "../src/utils/homeOf.js";

const errOf = (status, data, headers = {}) => ({ response: { status, data, headers } });

test("ADMIN-API-1: mất mạng -> câu kết nối", () => {
  assert.equal(getAdminErrorMsg({}), "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.");
});

test("ADMIN-API-2: dùng message BE, kể cả 429 (có số phút)", () => {
  assert.equal(getAdminErrorMsg(errOf(429, { message: "Thử lại sau 30 phút" })), "Thử lại sau 30 phút");
  assert.equal(getAdminErrorMsg(errOf(409, { message: "Thông tin vừa thay đổi" })), "Thông tin vừa thay đổi");
});

test("ADMIN-API-3: không có message -> câu theo status / câu chung", () => {
  assert.equal(getAdminErrorMsg(errOf(404, null)), "Không tìm thấy công ty.");
  assert.equal(getAdminErrorMsg(errOf(503, "")), "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.");
  assert.equal(getAdminErrorMsg(errOf(418, {})), "Đã có lỗi xảy ra. Vui lòng thử lại.");
});

test("ADMIN-API-4: getAdminErrorCode", () => {
  assert.equal(getAdminErrorCode(errOf(409, { code: "EMPLOYER_PROFILE_CHANGED" })), "EMPLOYER_PROFILE_CHANGED");
  assert.equal(getAdminErrorCode({}), undefined);
  assert.equal(getAdminErrorCode(errOf(500, null)), undefined);
});

test("ADMIN-API-5: getFieldError lấy câu đầu của errors[field]", () => {
  const e = errOf(400, { errors: { reason: ["Vui lòng nhập lý do", "khác"] } });
  assert.equal(getFieldError(e, "reason"), "Vui lòng nhập lý do");
  assert.equal(getFieldError(e, "email"), undefined);
  assert.equal(getFieldError({}, "reason"), undefined);
  assert.equal(getFieldError(errOf(400, { errors: { reason: [] } }), "reason"), undefined);
});

test("ADMIN-API-6: getRetryAfterSeconds chỉ nhận số nguyên > 0", () => {
  assert.equal(getRetryAfterSeconds(errOf(429, {}, { "retry-after": "1800" })), 1800);
  assert.equal(getRetryAfterSeconds(errOf(429, {}, { "retry-after": "0" })), null);
  assert.equal(getRetryAfterSeconds(errOf(429, {}, { "retry-after": "-5" })), null);
  assert.equal(getRetryAfterSeconds(errOf(429, {}, { "retry-after": "abc" })), null);
  assert.equal(getRetryAfterSeconds(errOf(429, {}, {})), null);
  assert.equal(getRetryAfterSeconds({}), null);
});

test("ADMIN-API-7: cleanParams bỏ undefined/rỗng nhưng GIỮ isVerified=false", () => {
  assert.deepEqual(cleanParams({ keyword: "", isVerified: false, page: 2, limit: undefined }), { isVerified: false, page: 2 });
  assert.deepEqual(cleanParams({ keyword: "abc", isVerified: undefined }), { keyword: "abc" });
});

test("ADMIN-API-8: homeOf theo role, role lạ -> /", () => {
  assert.equal(homeOf("finder"), "/finder/home");
  assert.equal(homeOf("employer"), "/employer/home");
  assert.equal(homeOf("admin"), "/admin/employers");
  assert.equal(homeOf("xyz"), "/");
  assert.equal(homeOf(undefined), "/");
});
