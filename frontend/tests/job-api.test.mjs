import test from "node:test";
import assert from "node:assert/strict";
import { getJobErrorMsg } from "../src/api/job.js";

const errOf = (status, data) => ({ response: { status, data } });

test("JOB-API-1: không có response (mất mạng) -> câu lỗi kết nối", () => {
  assert.equal(getJobErrorMsg({}), "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.");
});

test("JOB-API-2: lỗi có message từ BE -> dùng nguyên câu BE (BE trả tiếng Việt)", () => {
  assert.equal(
    getJobErrorMsg(errOf(409, { code: "JOB_ALREADY_CLOSED", message: "Tin tuyển dụng đã đóng" })),
    "Tin tuyển dụng đã đóng"
  );
});

test("JOB-API-3: 429 luôn là câu user chốt, kể cả khi BE có message", () => {
  assert.equal(
    getJobErrorMsg(errOf(429, { message: "Too many" })),
    "Bạn thao tác quá nhanh, vui lòng thử lại sau."
  );
});

test("JOB-API-4: không có message -> câu theo status", () => {
  assert.equal(getJobErrorMsg(errOf(404, null)), "Không tìm thấy tin tuyển dụng.");
  assert.equal(getJobErrorMsg(errOf(500, "")), "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.");
  assert.equal(getJobErrorMsg(errOf(418, {})), "Đã có lỗi xảy ra. Vui lòng thử lại.");
});
