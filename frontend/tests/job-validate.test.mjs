import test from "node:test"
import assert from "node:assert/strict"
import {
    emptyJobDraft,
    validateJobStep1,
    validateJobStep2,
    jobToDraft,
    draftToBody,
} from "../src/utils/JobValidate.js"

const TODAY = "2026-11-17"
const options = {
    categories: [
        { name: "IT", subCategories: ["Backend", "Frontend"] },
        { name: "Marketing", subCategories: [] },
    ],
    locations: ["Hà Nội", "Hồ Chí Minh"],
    workTypes: ["Onsite", "Remote", "Hybrid"],
}
const REQUIRED = "Không được bỏ trống"
const INVALID = "Giá trị không hợp lệ"

const step1 = (over = {}) => ({
    ...emptyJobDraft,
    jobTitle: "Dev",
    category: "IT",
    subCategory: "Backend",
    location: "Hà Nội",
    workType: "Remote",
    yearOfExperience: "2",
    numberOfPosition: "3",
    deadline: "2026-12-01",
    ...over,
})
const step2 = (over = {}) => ({
    salaryType: "Range",
    salaryMin: "15",
    salaryMax: "20",
    description: "mô tả",
    requirement: "yêu cầu",
    applicantBenefit: "quyền lợi",
    ...over,
})
const v1 = (over, today = TODAY) => validateJobStep1(step1(over), options, today)
const v2 = (over) => validateJobStep2(step2(over))

test("JOB-VAL-1: step1 hợp lệ -> không lỗi; subCategory để trống vẫn hợp lệ", () => {
    assert.deepEqual(v1({}), {})
    assert.deepEqual(v1({ subCategory: "" }), {})
})

test("JOB-VAL-2: field bắt buộc rỗng / chỉ khoảng trắng -> 'Không được bỏ trống'", () => {
    const e = validateJobStep1({ ...emptyJobDraft, jobTitle: "   ", yearOfExperience: " " }, options, TODAY)
    for (const k of ["jobTitle", "category", "location", "workType", "yearOfExperience", "numberOfPosition", "deadline"]) {
        assert.equal(e[k], REQUIRED, k)
    }
    assert.equal(e.subCategory, undefined)
})

test("JOB-VAL-3: jobTitle trim trước khi đo, tối đa 255", () => {
    assert.deepEqual(v1({ jobTitle: ` ${"a".repeat(255)} ` }), {})
    assert.equal(v1({ jobTitle: "a".repeat(256) }).jobTitle, "Tối đa 255 ký tự")
})

test("JOB-VAL-4: category / location / workType ngoài danh sách -> không hợp lệ", () => {
    const e = v1({ category: "X", location: "Mars", workType: "Home" })
    assert.equal(e.category, INVALID)
    assert.equal(e.location, INVALID)
    assert.equal(e.workType, INVALID)
})

test("JOB-VAL-5: subCategory phải thuộc category; category sai thì không báo subCategory", () => {
    assert.equal(v1({ subCategory: "Backend", category: "Marketing" }).subCategory, INVALID)
    assert.equal(v1({ category: "X", subCategory: "Backend" }).subCategory, undefined)
    assert.equal(v1({ subCategory: "Zzz" }).subCategory, INVALID)
})

test("JOB-VAL-6: yearOfExperience nguyên 0-50", () => {
    for (const ok of ["0", "50", " 7 "]) assert.equal(v1({ yearOfExperience: ok }).yearOfExperience, undefined, ok)
    for (const bad of ["51", "-1"]) assert.equal(v1({ yearOfExperience: bad }).yearOfExperience, "Phải từ 0 đến 50", bad)
    for (const bad of ["1.5", "1e1", "0x10", "12abc", "abc"]) assert.equal(v1({ yearOfExperience: bad }).yearOfExperience, INVALID, bad)
})

test("JOB-VAL-7: numberOfPosition nguyên 1-50", () => {
    for (const ok of ["1", "50"]) assert.equal(v1({ numberOfPosition: ok }).numberOfPosition, undefined, ok)
    for (const bad of ["0", "51"]) assert.equal(v1({ numberOfPosition: bad }).numberOfPosition, "Phải từ 1 đến 50", bad)
    assert.equal(v1({ numberOfPosition: "2.5" }).numberOfPosition, INVALID)
    assert.equal(v1({ numberOfPosition: "" }).numberOfPosition, REQUIRED)
})

test("JOB-VAL-8: deadline từ hôm nay đến hôm nay + 90 ngày", () => {
    const msg = "Phải từ hôm nay đến 90 ngày tới"
    assert.equal(v1({ deadline: "2026-11-17" }).deadline, undefined)
    assert.equal(v1({ deadline: "2027-02-15" }).deadline, undefined) // +90
    assert.equal(v1({ deadline: "2027-02-16" }).deadline, msg) // +91
    assert.equal(v1({ deadline: "2026-11-16" }).deadline, msg)
})

test("JOB-VAL-9: deadline qua ranh năm, sai format, ngày không có thật", () => {
    assert.equal(v1({ deadline: "2027-03-15" }, "2026-12-15").deadline, undefined)
    assert.equal(v1({ deadline: "2027-03-16" }, "2026-12-15").deadline, "Phải từ hôm nay đến 90 ngày tới")
    for (const bad of ["2026-02-30", "2026-1-5", "17/11/2026", "abc", "2026-13-01"]) {
        assert.equal(v1({ deadline: bad }, "2026-01-01").deadline, INVALID, bad)
    }
})

test("JOB-VAL-10: step2 Negotiable bỏ qua 2 ô lương", () => {
    assert.deepEqual(v2({ salaryType: "Negotiable", salaryMin: "abc", salaryMax: "-5" }), {})
})

test("JOB-VAL-11: salaryType sai/rỗng", () => {
    assert.equal(v2({ salaryType: "" }).salaryType, REQUIRED)
    assert.equal(v2({ salaryType: "Fixed" }).salaryType, INVALID)
})

test("JOB-VAL-12: Range - salaryMin bắt buộc, salaryMax tùy chọn", () => {
    assert.equal(v2({ salaryMin: "" }).salaryMin, REQUIRED)
    assert.equal(v2({ salaryMin: " " }).salaryMin, REQUIRED)
    assert.deepEqual(v2({ salaryMax: "" }), {})
})

test("JOB-VAL-13: lương nguyên 1-999 triệu", () => {
    for (const k of ["salaryMin", "salaryMax"]) {
        for (const ok of ["1", "999"]) assert.equal(v2({ salaryMin: ok, salaryMax: ok })[k], undefined, `${k} ${ok}`)
        for (const bad of ["0", "1000", "-3"]) assert.equal(v2({ [k]: bad })[k], "Phải từ 1 đến 999", `${k} ${bad}`)
        for (const bad of ["1.5", "15.5", "1e1", "0x10", "12abc", "abc"]) assert.equal(v2({ [k]: bad })[k], INVALID, `${k} ${bad}`)
    }
})

test("JOB-VAL-14: salaryMax < salaryMin báo ở salaryMax; bằng nhau OK; min lỗi thì không so", () => {
    assert.equal(v2({ salaryMin: "20", salaryMax: "15" }).salaryMax, "Phải lớn hơn hoặc bằng lương tối thiểu")
    assert.deepEqual(v2({ salaryMin: "20", salaryMax: "20" }), {})
    assert.equal(v2({ salaryMin: "abc", salaryMax: "15" }).salaryMax, undefined)
    assert.equal(v2({ salaryMin: "20", salaryMax: "1000" }).salaryMax, "Phải từ 1 đến 999")
})

test("JOB-VAL-15: description/requirement/applicantBenefit bắt buộc <=5000; skillRequired tùy chọn <=255", () => {
    const e = validateJobStep2({ ...emptyJobDraft, salaryType: "Negotiable" })
    for (const k of ["description", "requirement", "applicantBenefit"]) assert.equal(e[k], REQUIRED, k)
    assert.equal(e.skillRequired, undefined)
    assert.deepEqual(v2({ description: "a".repeat(5000), skillRequired: "a".repeat(255) }), {})
    assert.equal(v2({ requirement: "a".repeat(5001) }).requirement, "Tối đa 5000 ký tự")
    assert.equal(v2({ skillRequired: "a".repeat(256) }).skillRequired, "Tối đa 255 ký tự")
})

test("JOB-VAL-16: draftToBody - đúng 15 key của JobRequestDTO, số -> number, triệu x 1.000.000", () => {
    const body = draftToBody({ ...step1(), ...step2(), jobTitle: "  Dev  ", skillRequired: "  " })
    assert.deepEqual(Object.keys(body).sort(), [
        "applicantBenefit", "category", "deadline", "description", "jobTitle", "location", "numberOfPosition",
        "requirement", "salaryMax", "salaryMin", "salaryType", "skillRequired", "subCategory", "workType", "yearOfExperience",
    ])
    assert.equal(body.jobTitle, "Dev")
    assert.equal(body.salaryMin, 15000000)
    assert.equal(body.salaryMax, 20000000)
    assert.equal(body.yearOfExperience, 2)
    assert.equal(body.numberOfPosition, 3)
    assert.equal(body.skillRequired, null)
})

test("JOB-VAL-17: draftToBody - Negotiable ra null; max rỗng -> null; subCategory rỗng -> null", () => {
    const neg = draftToBody({ ...step1(), ...step2({ salaryType: "Negotiable" }) })
    assert.equal(neg.salaryMin, null)
    assert.equal(neg.salaryMax, null)
    const open = draftToBody({ ...step1({ subCategory: "" }), ...step2({ salaryMin: "20", salaryMax: "" }) })
    assert.equal(open.salaryMin, 20000000)
    assert.equal(open.salaryMax, null)
    assert.equal(open.subCategory, null)
})

const apiJob = {
    jobId: 9, status: "Closed", createdAt: "2026-01-01T00:00:00Z", companyName: "X",
    jobTitle: "Dev", category: "IT", subCategory: null, location: "Hà Nội", workType: "Remote",
    skillRequired: null, description: "d", requirement: "r", applicantBenefit: "b",
    salaryType: "Range", salaryMin: 15000000, salaryMax: null,
    yearOfExperience: 0, numberOfPosition: 2, deadline: "2026-12-01",
}

test("JOB-VAL-18: jobToDraft - chuỗi cho input, VND -> triệu, null -> rỗng, giữ deadline khi sửa", () => {
    const d = jobToDraft(apiJob)
    assert.equal(d.salaryMin, "15")
    assert.equal(d.salaryMax, "")
    assert.equal(d.subCategory, "")
    assert.equal(d.skillRequired, "")
    assert.equal(d.yearOfExperience, "0")
    assert.equal(d.numberOfPosition, "2")
    assert.equal(d.deadline, "2026-12-01")
    assert.equal(d.jobId, undefined)
})

test("JOB-VAL-19: jobToDraft repost -> xóa deadline, giữ field khác", () => {
    const d = jobToDraft(apiJob, { repost: true })
    assert.equal(d.deadline, "")
    assert.equal(d.jobTitle, "Dev")
})

test("JOB-VAL-20: job cũ lương lẻ / ngoài 1-999 -> giữ nguyên giá trị, validate báo lỗi", () => {
    const d = jobToDraft({ ...apiJob, salaryMin: 15500000, salaryMax: 1000000000 })
    assert.equal(d.salaryMin, "15.5")
    assert.equal(d.salaryMax, "1000")
    const e = validateJobStep2({ ...step2(), ...d })
    assert.equal(e.salaryMin, INVALID)
    assert.equal(e.salaryMax, "Phải từ 1 đến 999")
})

test("JOB-VAL-21: round-trip jobToDraft -> draftToBody trả lại đúng lương VND", () => {
    const body = draftToBody(jobToDraft(apiJob))
    assert.equal(body.salaryMin, 15000000)
    assert.equal(body.salaryMax, null)
})

test("JOB-VAL-22: draftToBody - yearOfExperience/numberOfPosition rỗng -> null, không thành 0", () => {
    const body = draftToBody({ ...emptyJobDraft, ...step2() })
    assert.equal(body.yearOfExperience, null)
    assert.equal(body.numberOfPosition, null)
})

test("JOB-VAL-23: salaryMax - min chênh tối đa 20 triệu (20 OK, 21 lỗi)", () => {
    const msg = "Không được cao hơn lương tối thiểu quá 20 triệu"
    assert.deepEqual(v2({ salaryMin: "10", salaryMax: "30" }), {})
    assert.equal(v2({ salaryMin: "10", salaryMax: "31" }).salaryMax, msg)
    assert.deepEqual(v2({ salaryMin: "80", salaryMax: "100" }), {})
    assert.deepEqual(v2({ salaryMin: "980", salaryMax: "999" }), {})
    assert.equal(v2({ salaryMin: "1", salaryMax: "100" }).salaryMax, msg)
})

test("JOB-VAL-24: chênh lệch chỉ kiểm khi min hợp lệ, và sau các lỗi khác của salaryMax", () => {
    assert.equal(v2({ salaryMin: "abc", salaryMax: "100" }).salaryMax, undefined)
    assert.equal(v2({ salaryMin: "", salaryMax: "100" }).salaryMax, undefined)
    assert.equal(v2({ salaryMin: "50", salaryMax: "40" }).salaryMax, "Phải lớn hơn hoặc bằng lương tối thiểu")
    assert.equal(v2({ salaryMin: "5", salaryMax: "1000" }).salaryMax, "Phải từ 1 đến 999")
    assert.deepEqual(v2({ salaryMin: "5", salaryMax: "" }), {})
})
