import test from "node:test";
import assert from "node:assert/strict";
import validateEmployerProfile from "../src/utils/EmployerProfileValidate.js";
import { getEmployerProfileMsg } from "../src/api/employerProfile.js";

// ─── Setup sample draft ──────────────────────────────────────────
function createValidDraft(overrides = {}) {
  return {
    companyName: "FPT Software",
    address: "Khu Cong nghe cao Hoa Lac, Ha Noi",
    field: "IT, Software Outsourcing",
    phone: "0901234567",
    taxCode: "0101248141",
    foundedYear: "1999",
    description: "Leading software outsourcing company in Vietnam.",
    website: "https://fptsoftware.com",
    ...overrides,
  };
}

// ─── Test Suite: EmployerProfileValidate ─────────────────────────
test("FE-V1: Valid draft passes validation with zero errors", () => {
  const errors = validateEmployerProfile(createValidDraft());
  assert.deepEqual(errors, {});
});

test("FE-V2: Missing companyName produces error", () => {
  const errorsEmpty = validateEmployerProfile(createValidDraft({ companyName: "" }));
  assert.equal(errorsEmpty.companyName, "Vui lòng nhập tên công ty.");

  const errorsSpace = validateEmployerProfile(createValidDraft({ companyName: "   " }));
  assert.equal(errorsSpace.companyName, "Vui lòng nhập tên công ty.");
});

test("FE-V3: companyName exceeding 100 characters produces error", () => {
  const longName = "A".repeat(101);
  const errors = validateEmployerProfile(createValidDraft({ companyName: longName }));
  assert.equal(errors.companyName, "Tên công ty không được dài quá 100 ký tự.");
});

test("FE-V4: Missing address or field produces required errors", () => {
  const errors = validateEmployerProfile(createValidDraft({ address: "", field: "" }));
  assert.equal(errors.address, "Vui lòng nhập địa chỉ.");
  assert.equal(errors.field, "Vui lòng nhập lĩnh vực hoạt động.");
});

test("FE-V5: Phone number validation", () => {
  // Missing
  assert.equal(validateEmployerProfile(createValidDraft({ phone: "" })).phone, "Vui lòng nhập số điện thoại.");
  // Less than 10 digits
  assert.equal(validateEmployerProfile(createValidDraft({ phone: "12345" })).phone, "Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng số 0.");
  // Letters
  assert.equal(validateEmployerProfile(createValidDraft({ phone: "0901234abc" })).phone, "Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng số 0.");
  // Doesn't start with 0
  assert.equal(validateEmployerProfile(createValidDraft({ phone: "1901234567" })).phone, "Số điện thoại phải gồm 10-11 chữ số và bắt đầu bằng số 0.");
  // Valid 10 digits
  assert.equal(validateEmployerProfile(createValidDraft({ phone: "0901234567" })).phone, undefined);
  // Valid 11 digits
  assert.equal(validateEmployerProfile(createValidDraft({ phone: "09012345678" })).phone, undefined);
});

test("FE-V6: Tax code validation (VN 10 or 13 digits)", () => {
  // Missing
  assert.equal(validateEmployerProfile(createValidDraft({ taxCode: "" })).taxCode, "Vui lòng nhập mã số thuế.");
  // Not 10 or 13 digits
  assert.equal(validateEmployerProfile(createValidDraft({ taxCode: "12345" })).taxCode, "Mã số thuế phải gồm 10 hoặc 13 chữ số (định dạng 10 hoặc 10-3).");
  // Letters
  assert.equal(validateEmployerProfile(createValidDraft({ taxCode: "010124814A" })).taxCode, "Mã số thuế phải gồm 10 hoặc 13 chữ số (định dạng 10 hoặc 10-3).");
  // Valid 10 digits
  assert.equal(validateEmployerProfile(createValidDraft({ taxCode: "0101248141" })).taxCode, undefined);
  // Valid 13 digits with hyphen
  assert.equal(validateEmployerProfile(createValidDraft({ taxCode: "0101248141-001" })).taxCode, undefined);
  // Valid 13 digits without hyphen
  assert.equal(validateEmployerProfile(createValidDraft({ taxCode: "0101248141001" })).taxCode, undefined);
});

test("FE-V7: Founded year validation", () => {
  const currentYear = new Date().getFullYear();
  // Missing
  assert.equal(validateEmployerProfile(createValidDraft({ foundedYear: "" })).foundedYear, "Vui lòng nhập năm thành lập.");
  // Not 4 digits
  assert.match(validateEmployerProfile(createValidDraft({ foundedYear: "99" })).foundedYear, /khoảng 1800 đến/);
  // Year < 1800
  assert.match(validateEmployerProfile(createValidDraft({ foundedYear: "1750" })).foundedYear, /khoảng 1800 đến/);
  // Future year
  assert.match(validateEmployerProfile(createValidDraft({ foundedYear: String(currentYear + 5) })).foundedYear, /khoảng 1800 đến/);
  // Valid current year
  assert.equal(validateEmployerProfile(createValidDraft({ foundedYear: String(currentYear) })).foundedYear, undefined);
  // Valid past year
  assert.equal(validateEmployerProfile(createValidDraft({ foundedYear: "2015" })).foundedYear, undefined);
});

test("FE-V8: Website URL validation (optional, but validated if present)", () => {
  // Empty is valid
  assert.equal(validateEmployerProfile(createValidDraft({ website: "" })).website, undefined);
  // Invalid string
  assert.equal(validateEmployerProfile(createValidDraft({ website: "invalid-url" })).website, "Website phải là đường dẫn hợp lệ, bắt đầu bằng http:// hoặc https://.");
  // XSS injection script
  assert.equal(validateEmployerProfile(createValidDraft({ website: "javascript:alert(1)" })).website, "Website phải là đường dẫn hợp lệ, bắt đầu bằng http:// hoặc https://.");
  // Valid https
  assert.equal(validateEmployerProfile(createValidDraft({ website: "https://mycompany.com" })).website, undefined);
  // Valid http
  assert.equal(validateEmployerProfile(createValidDraft({ website: "http://mycompany.vn" })).website, undefined);
});

// ─── Test Suite: Error message mapper ────────────────────────────
test("FE-M1: getEmployerProfileMsg maps network and HTTP status codes correctly", () => {
  // Network error (no response)
  assert.equal(getEmployerProfileMsg({}), "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.");

  // HTTP status codes
  assert.equal(getEmployerProfileMsg({ response: { status: 400 } }), "Một số thông tin không hợp lệ. Vui lòng kiểm tra và thử lại.");
  assert.equal(getEmployerProfileMsg({ response: { status: 403 } }), "Bạn không có quyền truy cập trang này.");
  assert.equal(getEmployerProfileMsg({ response: { status: 404 } }), "Không tìm thấy hồ sơ công ty của bạn.");
  assert.equal(getEmployerProfileMsg({ response: { status: 409 } }), "Tên công ty hoặc mã số thuế này đã được sử dụng.");
  assert.equal(getEmployerProfileMsg({ response: { status: 413 } }), "Tệp quá lớn.");
  assert.equal(getEmployerProfileMsg({ response: { status: 500 } }), "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.");
  assert.equal(getEmployerProfileMsg({ response: { status: 502 } }), "Đã có lỗi xảy ra. Vui lòng thử lại.");
});

// ─── Test Suite: Data transform functions ────────────────────────
test("FE-T1: toDraft and toPayload transformations", () => {
  const FIELDS = ["companyName", "address", "description", "website", "field", "foundedYear", "phone", "taxCode"];
  const REQUIRED_FIELDS = ["companyName", "address", "field", "phone", "taxCode"];

  const toDraft = (profile) =>
    Object.fromEntries(FIELDS.map((f) => [f, profile?.[f] != null ? String(profile[f]) : ""]));

  const toPayload = (draft) => ({
    ...Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, draft[f].trim()])),
    description: draft.description.trim() || null,
    website: draft.website.trim() || null,
    foundedYear: draft.foundedYear.trim() ? Number(draft.foundedYear.trim()) : null,
  });

  // Null profile -> empty draft
  const emptyDraft = toDraft(null);
  assert.equal(emptyDraft.companyName, "");
  assert.equal(emptyDraft.foundedYear, "");
  assert.equal(emptyDraft.phone, "");

  // Profile with numbers/nulls -> string draft
  const profile = {
    companyName: "TechCorp",
    address: "Hanoi",
    description: null,
    website: "https://techcorp.vn",
    field: "IT",
    foundedYear: 2018,
    phone: "0912345678",
    taxCode: "0109999999",
  };
  const filledDraft = toDraft(profile);
  assert.equal(filledDraft.foundedYear, "2018");
  assert.equal(filledDraft.description, "");
  assert.equal(filledDraft.companyName, "TechCorp");

  // Draft -> Payload
  const payload = toPayload(filledDraft);
  assert.equal(payload.foundedYear, 2018); // parsed to number
  assert.equal(payload.description, null); // empty string becomes null
  assert.equal(payload.website, "https://techcorp.vn");
});
