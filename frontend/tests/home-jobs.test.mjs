import test from "node:test";
import assert from "node:assert/strict";
import { findBackCategory } from "../src/utils/homeJobs.js";

// Tên ngành thật trong backend/Constants/JobCategories.cs
const NAMES = [
  "Công nghệ thông tin (IT)", "Kỹ thuật - Công nghệ", "Kế toán - Kiểm toán", "Tài chính - Ngân hàng - Bảo hiểm",
  "Kinh doanh - Bán hàng", "Marketing - Truyền thông - Quảng cáo", "Nhân sự - Tuyển dụng", "Hành chính - Văn phòng",
  "Giáo dục - Đào tạo", "Y tế - Dược phẩm - Chăm sóc sức khỏe", "Sản xuất - Vận hành", "Cơ khí - Chế tạo",
  "Xây dựng - Kiến trúc - Nội thất", "Bất động sản", "Logistics - Xuất nhập khẩu", "Vận tải - Giao nhận",
  "Nhà hàng - Khách sạn - Du lịch", "Thương mại điện tử (E-commerce)", "Thiết kế - Mỹ thuật - Sáng tạo",
  "Báo chí - Biên tập - Nội dung", "Pháp lý - Luật", "Nông nghiệp - Lâm nghiệp - Thủy sản", "Môi trường - Năng lượng",
  "Dịch vụ khách hàng - Chăm sóc khách hàng",
];
const options = { categories: NAMES.map((name) => ({ name, subCategories: [] })) };

test("HOME-1: 8 nhãn ngắn khớp đúng 1 ngành BE (kể cả Thiết kế, Y tế kết thúc bằng ký tự có dấu)", () => {
  const expected = {
    IT: "Công nghệ thông tin (IT)",
    Marketing: "Marketing - Truyền thông - Quảng cáo",
    "Thiết kế": "Thiết kế - Mỹ thuật - Sáng tạo",
    "Tài chính": "Tài chính - Ngân hàng - Bảo hiểm",
    "Kỹ thuật": "Kỹ thuật - Công nghệ",
    "Bán hàng": "Kinh doanh - Bán hàng",
    "Giáo dục": "Giáo dục - Đào tạo",
    "Y tế": "Y tế - Dược phẩm - Chăm sóc sức khỏe",
  };
  for (const [label, name] of Object.entries(expected)) assert.equal(findBackCategory(label, options), name, label);
});

test("HOME-2: không khớp từ trọn vẹn (chỉ khớp nguyên từ) và không thấy -> null", () => {
  assert.equal(findBackCategory("Luật sư", options), null);
  assert.equal(findBackCategory("Ngâ", options), null); // chỉ là một phần của từ "Ngân"
});

test("HOME-3: khớp 2 ngành trở lên -> null (không đoán theo thứ tự)", () => {
  const dup = { categories: [{ name: "Kỹ thuật điện" }, { name: "Kỹ thuật - Công nghệ" }] };
  assert.equal(findBackCategory("Kỹ thuật", dup), null);
});

test("HOME-4: options null/thiếu hoặc nhãn rỗng -> null", () => {
  assert.equal(findBackCategory("IT", null), null);
  assert.equal(findBackCategory("IT", {}), null);
  assert.equal(findBackCategory("", options), null);
});
