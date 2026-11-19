import test from "node:test";
import assert from "node:assert/strict";
import {
  todayVn,
  jobStatusLabel,
  formatSalary,
  formatExperience,
  formatDateVn,
  formatDeadline,
  workTypeLabel,
} from "../src/utils/jobFormat.js";

const NOW = new Date("2026-11-17T03:00:00Z"); // 10:00 ngày 17/11 giờ VN

test("JOB-FMT-1: todayVn đổi ngày đúng ranh nửa đêm VN (17:00Z)", () => {
  assert.equal(todayVn(new Date("2026-11-16T16:59:59Z")), "2026-11-16");
  assert.equal(todayVn(new Date("2026-11-16T17:00:00Z")), "2026-11-17");
});

test("JOB-FMT-2: trạng thái, hết hạn xét trước Closed, deadline = hôm nay còn hạn", () => {
  assert.equal(jobStatusLabel({ deadline: "2026-11-16", status: "Open" }, NOW), "Hết hạn");
  assert.equal(jobStatusLabel({ deadline: "2026-11-16", status: "Closed" }, NOW), "Hết hạn");
  assert.equal(jobStatusLabel({ deadline: "2026-11-17", status: "Open" }, NOW), "Đang mở");
  assert.equal(jobStatusLabel({ deadline: "2026-11-17", status: "Closed" }, NOW), "Đã đóng");
});

test("JOB-FMT-3: lương Negotiable / Range", () => {
  assert.equal(formatSalary({ salaryType: "Negotiable", salaryMin: 10000000, salaryMax: 20000000 }), "Thỏa thuận");
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: 20000000, salaryMax: null }), "Từ 20 triệu");
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: 15000000, salaryMax: 20000000 }), "15-20 triệu");
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: 20000000, salaryMax: 20000000 }), "20 triệu");
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: null, salaryMax: null }), "Thỏa thuận");
});

test("JOB-FMT-4: lương lẻ (dữ liệu cũ) hiện đủ số VND, không làm tròn, không đơn vị", () => {
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: 15500000, salaryMax: null }), "Từ 15.500.000");
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: 500000, salaryMax: null }), "Từ 500.000");
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: 15500000, salaryMax: 20000000 }), "15.500.000-20 triệu");
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: 15000000, salaryMax: 20500000 }), "15 triệu-20.500.000");
});

test("JOB-FMT-5: không dùng đơn vị tỷ, tròn triệu thì hiện N triệu", () => {
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: 1000000000, salaryMax: null }), "Từ 1000 triệu");
  assert.equal(formatSalary({ salaryType: "Range", salaryMin: 900000000, salaryMax: 1000000000 }), "900-1000 triệu");
});

test("JOB-FMT-6: kinh nghiệm", () => {
  assert.equal(formatExperience(0), "Không yêu cầu kinh nghiệm");
  assert.equal(formatExperience(3), "Từ 3 năm");
});

test("JOB-FMT-7: ngày dd/MM/yyyy (createdAt theo giờ VN, deadline tách chuỗi)", () => {
  assert.equal(formatDateVn("2026-11-16T17:30:00Z"), "17/11/2026");
  assert.equal(formatDateVn("2026-11-16T16:30:00Z"), "16/11/2026");
  assert.equal(formatDeadline("2026-01-05"), "05/01/2026");
});

test("JOB-FMT-8: hình thức làm việc", () => {
  assert.equal(workTypeLabel("Onsite"), "Tại văn phòng");
  assert.equal(workTypeLabel("Remote"), "Từ xa");
  assert.equal(workTypeLabel("Hybrid"), "Kết hợp");
});
