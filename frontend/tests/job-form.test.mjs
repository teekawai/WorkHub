import test from "node:test"
import assert from "node:assert/strict"
import {
    getRetryDelay,
    classifySubmitError,
    hasStep1Error,
    newIdempotencyKey,
    shouldGoBack,
    STEP2_FIELDS,
} from "../src/utils/jobFormSubmit.js"

const errOf = (status, data) => ({ response: { status, data } })

test("JOB-FORM-1: lịch retry 2s, 4s, 8s rồi dừng", () => {
    assert.equal(getRetryDelay(0), 2000)
    assert.equal(getRetryDelay(1), 4000)
    assert.equal(getRetryDelay(2), 8000)
    assert.equal(getRetryDelay(3), null)
})

test("JOB-FORM-2: hasStep1Error", () => {
    assert.equal(hasStep1Error({ jobTitle: "x" }), true)
    assert.equal(hasStep1Error({ description: "x", salaryMin: "y" }), false)
    assert.equal(hasStep1Error({}), false)
})

test("JOB-FORM-3: 400 chỉ field bước 2 -> step1 false, lấy phần tử đầu của mảng", () => {
    const result = classifySubmitError(
        errOf(400, { code: "VALIDATION_ERROR", message: "sai", errors: { description: ["a", "b"] } }),
    )
    assert.equal(result.kind, "validation")
    assert.deepEqual(result.errors, { description: "a" })
    assert.equal(result.step1, false)
    assert.equal(result.message, "")
})

test("JOB-FORM-4: 400 có field bước 1 -> step1 true", () => {
    const result = classifySubmitError(
        errOf(400, { code: "VALIDATION_ERROR", message: "sai", errors: { deadline: ["x"], salaryMin: ["y"] } }),
    )
    assert.equal(result.step1, true)
    assert.deepEqual(result.errors, { deadline: "x", salaryMin: "y" })
})

test("JOB-FORM-5: 400 có key lạ -> giữ field biết, phần lạ vào message", () => {
    const result = classifySubmitError(
        errOf(400, { code: "VALIDATION_ERROR", message: "sai", errors: { jobTitle: ["x"], idempotencyKey: ["Key lạ"] } }),
    )
    assert.equal(result.kind, "validation")
    assert.deepEqual(result.errors, { jobTitle: "x" })
    assert.equal(result.message, "Key lạ")
})

test("JOB-FORM-5b: 400 chỉ có key lạ -> other, vẫn hiện câu cụ thể của BE", () => {
    const result = classifySubmitError(
        errOf(400, { code: "VALIDATION_ERROR", message: "sai", errors: { idempotencyKey: ["Key lạ"] } }),
    )
    assert.equal(result.kind, "other")
    assert.equal(result.message, "Key lạ")
})

test("JOB-FORM-6: 400 không errors -> other, message BE", () => {
    const result = classifySubmitError(errOf(400, { code: "VALIDATION_ERROR", message: "JSON hỏng" }))
    assert.equal(result.kind, "other")
    assert.equal(result.message, "JSON hỏng")
})

test("JOB-FORM-7: 409 theo code", () => {
    assert.equal(classifySubmitError(errOf(409, { code: "REQUEST_IN_PROGRESS", message: "m" })).kind, "inProgress")
    assert.equal(classifySubmitError(errOf(409, { code: "JOB_NOT_EDITABLE", message: "m" })).kind, "notEditable")
    const reused = classifySubmitError(errOf(409, { code: "IDEMPOTENCY_KEY_REUSED", message: "dùng lại" }))
    assert.equal(reused.kind, "keyReused")
})

test("JOB-FORM-8: 409 code lạ không bị coi là inProgress", () => {
    assert.equal(classifySubmitError(errOf(409, { code: "CONFLICT", message: "m" })).kind, "other")
    assert.equal(classifySubmitError(errOf(409, { message: "REQUEST_IN_PROGRESS" })).kind, "other")
})

test("JOB-FORM-9: 404 -> notFound; 403, 429, mất mạng -> other", () => {
    assert.equal(classifySubmitError(errOf(404, { code: "NOT_FOUND", message: "m" })).kind, "notFound")
    assert.equal(classifySubmitError(errOf(403, { code: "NOT_JOB_OWNER", message: "không phải chủ" })).message, "không phải chủ")
    assert.equal(classifySubmitError(errOf(403, { message: "m" })).kind, "other")
    assert.equal(classifySubmitError(errOf(429, {})).message, "Bạn thao tác quá nhanh, vui lòng thử lại sau.")
    assert.equal(classifySubmitError({}).kind, "other")
})

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test("JOB-FORM-10: newIdempotencyKey dùng randomUUID nếu có", () => {
    assert.equal(newIdempotencyKey({ randomUUID: () => "abc" }), "abc")
})

test("JOB-FORM-11: newIdempotencyKey không có randomUUID (http) -> UUID v4 từ getRandomValues", () => {
    const fake = { getRandomValues: (bytes) => bytes.fill(255) }
    assert.match(newIdempotencyKey(fake), UUID_V4)
    const real = { getRandomValues: (bytes) => globalThis.crypto.getRandomValues(bytes) }
    const keys = new Set([newIdempotencyKey(real), newIdempotencyKey(real)])
    assert.equal(keys.size, 2)
    for (const key of keys) assert.match(key, UUID_V4)
})

test("JOB-FORM-12: shouldGoBack chỉ khi trang trước đúng là đích", () => {
    assert.equal(shouldGoBack("list", "create"), true)
    assert.equal(shouldGoBack("list", "repost"), true)
    assert.equal(shouldGoBack("detail", "edit"), true)
    assert.equal(shouldGoBack("detail", "create"), false)
    assert.equal(shouldGoBack("list", "edit"), false)
    assert.equal(shouldGoBack(undefined, "edit"), false)
})

test("JOB-FORM-13: STEP2_FIELDS được export", () => {
    assert.ok(STEP2_FIELDS.includes("description"))
})
