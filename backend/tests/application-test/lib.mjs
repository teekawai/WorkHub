/**
 * Thư viện API test Application (Bước 3: POST /api/jobs/{id}/applications). Dùng lại helper của job-test + admin-test (import), chỉ thêm phần riêng:
 * multipart form, finder có hồ sơ, upload CV hồ sơ, rate limit "apply" (5 request / phút / userId, đếm MỌI request kể cả 400/403/404/409/replay).
 *
 * - Mỗi nhóm dùng finder RIÊNG (hoặc finderPool tự xoay finder sau mỗi 4 request) để không đụng rate limit.
 * - Request khách / token hỏng chia theo IP: cả run <= 5 request khách / phút (xem authorization).
 * - Cloudinary THẬT: mỗi đơn 201 upload 1 file (publicId WorkHub/applications/{applicationId}), file này KHÔNG xóa được qua API/SQL.
 *   `cloud` đếm số file test đẩy lên, in ở cuối run (xem cloudSummary).
 * - Cờ: --base=<url> (BE cổng 5166), --rounds=N (job-test, ở đây giới hạn tối đa 4 vòng/case để tiết kiệm upload), --keep.
 */
import fs from "node:fs";
import path from "node:path";
import { BACKEND_DIR, J, TS, bearer, ck, makeEmployerSafe, makeUserSafe, mkJob, note, raw, uid } from "../admin-test/lib.mjs";

export * from "../admin-test/lib.mjs";

export const cloud = { apps: 0, profileCv: 0, avatar: 0 };
export const cloudSummary = {
  name: "Z: Tổng kết file Cloudinary",
  async run() { note("CLOUD", `201 đơn (file WorkHub/applications/*) = ${cloud.apps}; upload CV hồ sơ finder test = ${cloud.profileCv}; upload avatar = ${cloud.avatar}; chưa tính file bị BE xóa sau race (TR-1) và các lần upload của request chạy song song`); },
};

/** Liệt kê file raw Cloudinary prefix WorkHub/applications/ tạo từ `sinceMs` (Admin API, key đọc từ appsettings lúc chạy, không in) */
export async function cloudFilesSince(sinceMs) {
  const c = JSON.parse(fs.readFileSync(path.join(BACKEND_DIR, "appsettings.json"), "utf8").replace(/^﻿/, "")).Cloudinary;
  const auth = "Basic " + Buffer.from(`${c.api_key}:${c.api_secret}`).toString("base64");
  const out = [];
  let next = "";
  do {
    const r = await fetch(`https://api.cloudinary.com/v1_1/${c.cloud_name}/resources/raw/upload?prefix=WorkHub/applications/&max_results=500${next}`, { headers: { Authorization: auth } });
    if (r.status !== 200) throw new Error(`Cloudinary list ${r.status}`);
    const j = await r.json();
    out.push(...j.resources);
    next = j.next_cursor ? `&next_cursor=${j.next_cursor}` : "";
  } while (next);
  return out.filter((x) => Date.parse(x.created_at) >= sinceMs - 5000);
}

export const GOOD ={ fullName: "Nguyễn Văn A", email: "qa@test.com", coverLetter: "Xin chào" };

/** multipart: fields undefined/null = bỏ field; file {name,size} | null; `cvFile` đặt tên field đúng brief */
export function formOf(fields = {}, file = { name: "cv.pdf", size: 2048 }) {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...GOOD, ...fields })) if (v !== undefined && v !== null) fd.append(k, String(v));
  if (file) fd.append("cvFile", new Blob([new Uint8Array(file.size ?? 2048).fill(65)]), file.name);
  return fd;
}

/** Nộp đơn. key: mặc định UUID mới; null = bỏ header. token mặc định của u (u = null => khách) */
export async function apply(u, jobId, { fields = {}, file = { name: "cv.pdf", size: 2048 }, key = uid(), token = u?.token, headers = {}, rawBody, replay = false } = {}) {
  const h = { ...(token ? bearer(token) : {}), ...(key === null ? {} : { "Idempotency-Key": key }), ...headers };
  const r = await raw("POST", `/jobs/${jobId}/applications`, { rawBody: rawBody ?? formOf(fields, file), headers: h });
  if (r.status === 201 && !replay) cloud.apps++; // replay / race: không đếm (không biết request nào upload)
  return r;
}

/** Finder (có hồ sơ mặc định). Không có CV hồ sơ cho tới khi gọi uploadProfileCv */
export async function makeFinder(name, withProfile = true) {
  const u = await makeUserSafe(name, "finder");
  if (withProfile) {
    const r = await J("PUT", "/finders/me", u.token, {
      fullname: "Finder QA", phone: "0901234567", address: "1 Le Loi", educationLevel: "Bachelor", major: "SE", experience: "2 years", skill: "C#", description: "qa",
    });
    if (r.status !== 200) throw new Error(`finder profile ${name}: ${r.status} ${JSON.stringify(r.data)}`);
  }
  return u;
}
export const createProfile = (u) => J("PUT", "/finders/me", u.token, { fullname: "Finder QA", phone: "0901234567" });

/** POST /api/finders/me/cv (field `cv`), lưu CV hồ sơ */
export async function uploadProfileCv(u, name = "profile.pdf", size = 1024) {
  const fd = new FormData();
  fd.append("cv", new Blob([new Uint8Array(size).fill(66)]), name);
  const r = await raw("POST", "/finders/me/cv", { rawBody: fd, headers: bearer(u.token) });
  if (r.status === 200) cloud.profileCv++;
  return r;
}

/** POST /api/finders/me/avatar (field `avatar`, PNG 1x1 thật vì Cloudinary kiểm ảnh) */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
export async function uploadAvatar(u) {
  const fd = new FormData();
  fd.append("avatar", new Blob([PNG], { type: "image/png" }), "a.png");
  cloud.avatar++;
  return raw("POST", "/finders/me/avatar", { rawBody: fd, headers: bearer(u.token) });
}

/** Xoay finder: mỗi finder chỉ dùng tối đa `limit` request apply (rate limit 5/phút) */
export function finderPool(prefix, limit = 4) {
  let cur = null, used = 0, n = 0;
  return {
    async next() {
      if (!cur || used >= limit) { cur = await makeFinder(`${prefix}${++n}`); used = 0; }
      used++;
      return cur;
    },
  };
}

/** Employer đã xác minh + 1 Job Open (hạn 30 ngày). Mỗi nhóm đặt tên khác nhau (companyName unique theo tên) */
export async function makeEmployerJob(name, o = {}) {
  const e = await makeEmployerSafe(name, true);
  return { e, job: await mkJob(e, o) };
}

export const errKeys = (r) => Object.keys(r.data?.errors || {}).sort();
/** message đầu tiên của key lỗi (errors[key] là mảng hoặc chuỗi) */
export const errMsg = (r, key) => { const v = r.data?.errors?.[key]; return Array.isArray(v) ? v[0] : v; };
export const appRows = (finderId) => `SELECT COUNT(*) FROM application WHERE finderId='${finderId}'`;
export const maxRounds = (n, cap = 4) => Math.min(n, cap);
export { TS };
