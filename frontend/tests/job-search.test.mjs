import test from "node:test";
import assert from "node:assert/strict";
import {
  SALARY_RANGES, buildSearchParams, buildSearchUrl, parseSearchQuery, toApiParams, timeAgo,
} from "../src/utils/jobSearch.js";

const parse = (url, options) => parseSearchQuery(new URL(url, "http://x").searchParams, options);

test("JS-1: không có bộ lọc -> /jobs, parse rỗng ra mặc định", () => {
  assert.equal(buildSearchUrl(), "/jobs");
  assert.deepEqual(parse("/jobs"), {
    keyword: "", category: "", subCategory: "", location: "", workType: "",
    salary: "", experience: "", sortBy: "newest", page: 1,
  });
});

test("JS-2: round-trip đủ trường, gồm 10+ và keyword có & # dấu", () => {
  const filters = {
    keyword: "C# & .NET / Kế toán", category: "Công nghệ thông tin (IT)", subCategory: "Phát triển Web",
    location: "Hồ Chí Minh", workType: "Hybrid", salary: "20-30", experience: "10+", sortBy: "salary_desc", page: 3,
  };
  const url = buildSearchUrl(filters);
  assert.ok(url.includes("experience=10%2B"));
  assert.deepEqual(parse(url), filters);
});

test("JS-3: giá trị rỗng/khoảng trắng bị bỏ; page 1 và sort newest không ghi vào URL", () => {
  assert.equal(buildSearchUrl({ keyword: "  ", category: "", page: 1, sortBy: "newest" }), "/jobs");
});

test("JS-4: salary/experience/sortBy lạ bị bỏ", () => {
  const f = parse("/jobs?salary=99&experience=abc&sortBy=oldest");
  assert.equal(f.salary, "");
  assert.equal(f.experience, "");
  assert.equal(f.sortBy, "newest");
});

test("JS-5: subCategory không có category bị bỏ", () => {
  assert.equal(parse("/jobs?subCategory=Web").subCategory, "");
  assert.equal(parse("/jobs?category=IT&subCategory=Web").subCategory, "Web");
});

test("JS-6: page lạ -> 1", () => {
  for (const bad of ["0", "-2", "abc", "1.5", ""]) assert.equal(parse(`/jobs?page=${bad}`).page, 1);
  assert.equal(parse("/jobs?page=4").page, 4);
});

test("JS-7: 6 khoảng lương đúng cặp Business 1.3, gửi đủ 2 đầu (kể cả salaryMin=0)", () => {
  assert.deepEqual(
    SALARY_RANGES.map(({ min, max }) => [min, max]),
    [[0, 1e7], [1e7, 1.5e7], [1.5e7, 2e7], [2e7, 3e7], [3e7, 5e7], [5e7, 1e9]],
  );
  for (const range of SALARY_RANGES) {
    const params = toApiParams({ ...parse("/jobs"), salary: range.key });
    assert.equal(params.salaryMin, range.min);
    assert.equal(params.salaryMax, range.max);
  }
});

test("JS-8: toApiParams bỏ rỗng, không gửi limit mặc định, gửi limit khi truyền", () => {
  const empty = toApiParams(parse("/jobs"));
  assert.deepEqual(empty, { sortBy: "newest", page: 1 });
  assert.equal(toApiParams(parse("/jobs"), { limit: 6 }).limit, 6);
  assert.equal(toApiParams({ ...parse("/jobs"), keyword: " react " }).keyword, "react");
});

test("JS-9: timeAgo theo ngày lịch VN", () => {
  const now = new Date("2026-11-18T17:10:00Z"); // 00:10 ngày 19/11 VN
  assert.equal(timeAgo("2026-11-18T16:30:00Z", now), "Hôm qua"); // 23:30 ngày 18 VN
  assert.equal(timeAgo("2026-11-18T17:00:00Z", now), "Hôm nay"); // 00:00 ngày 19 VN
  assert.equal(timeAgo("2026-11-19T10:00:00Z", now), "Hôm nay"); // tương lai
  assert.equal(timeAgo("2026-11-16T05:00:00Z", now), "3 ngày trước");
  assert.equal(timeAgo("2026-11-12T05:00:00Z", now), "1 tuần trước"); // 7 ngày
  assert.equal(timeAgo("2026-10-25T05:00:00Z", now), "3 tuần trước"); // 25 ngày
  assert.equal(timeAgo("2026-10-20T05:00:00Z", now), "1 tháng trước"); // 30 ngày
  assert.equal(timeAgo("2026-05-19T05:00:00Z", now), "6 tháng trước");
});

const OPTIONS = {
  categories: [{ name: "IT", subCategories: ["Web", "QA"] }, { name: "Kế toán", subCategories: ["Thuế"] }],
  locations: ["Hà Nội", "Huế"],
  workTypes: ["Onsite", "Remote"],
};

test("JS-10: có options -> bỏ category/location/workType không có trong options", () => {
  const f = parse("/jobs?category=Cũ&location=Mars&workType=Teleport", OPTIONS);
  assert.deepEqual([f.category, f.location, f.workType], ["", "", ""]);
  const ok = parse("/jobs?category=IT&location=Huế&workType=Remote", OPTIONS);
  assert.deepEqual([ok.category, ok.location, ok.workType], ["IT", "Huế", "Remote"]);
});

test("JS-11: subCategory phải thuộc category; category bị bỏ thì subCategory cũng bỏ", () => {
  assert.equal(parse("/jobs?category=IT&subCategory=Web", OPTIONS).subCategory, "Web");
  assert.equal(parse("/jobs?category=IT&subCategory=Thuế", OPTIONS).subCategory, "");
  assert.equal(parse("/jobs?category=Cũ&subCategory=Web", OPTIONS).subCategory, "");
});

test("JS-12: không có options (chưa tải/lỗi) -> không kiểm tra danh sách", () => {
  assert.equal(parse("/jobs?category=Cũ&location=Mars").category, "Cũ");
});

test("JS-13: keyword cắt còn 255 ký tự", () => {
  assert.equal(parse(`/jobs?keyword=${"a".repeat(300)}`).keyword.length, 255);
});

test("JS-14: buildSearchParams trả URLSearchParams, khớp buildSearchUrl", () => {
  const filters = { keyword: "a b", experience: "10+", page: 2 };
  assert.ok(buildSearchParams(filters) instanceof URLSearchParams);
  assert.equal(`/jobs?${buildSearchParams(filters)}`, buildSearchUrl(filters));
  assert.equal(buildSearchParams({}).toString(), "");
});
