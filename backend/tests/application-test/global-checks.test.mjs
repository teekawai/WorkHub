// AG: Kiểm tra toàn cục (chạy cuối) cho mọi response POST /jobs/{id}/applications trong run — format lỗi { code, message, errors }, mã lỗi thuộc bảng, không lộ field nhạy cảm, không 500
// Chạy riêng: node backend/tests/application-test/global-checks.test.mjs (không có response nào để quét thì chỉ ghi nhận)
import { TS, ck, cloudFilesSince, isMain, note, recorded, runAdminSuites, cloudSummary, sqlCol } from "./lib.mjs";

export const name = "AG: Kiểm tra toàn cục apply (chạy cuối)";

const CODES = new Set(["VALIDATION_ERROR", "UNAUTHENTICATED", "FORBIDDEN_ROLE", "FINDER_PROFILE_NOT_FOUND", "JOB_NOT_FOUND", "JOB_NOT_OPEN", "ALREADY_APPLIED", "REQUEST_IN_PROGRESS", "IDEMPOTENCY_KEY_REUSED", "TOO_MANY_REQUESTS", "SERVICE_UNAVAILABLE", "INTERNAL_ERROR"]);

export default async function run() {
  console.log("\n── AG: toàn cục");
  const recs = recorded.filter((r) => /^\/jobs\/[^/]+\/applications$/.test(r.path) && !r.probe);
  let nErr = 0;
  for (const r of recs) {
    if (r.status === 500) ck("AG-03", false, `${r.status} ${r.text.slice(0, 160)}`);
    if (r.status === 415 || r.status === 413) continue; // request lạ (JSON thay multipart, > 30MB): ghi nhận ở AP-F, không theo format chuẩn
    if (r.status >= 400) {
      nErr++;
      const ok = r.ct.includes("json") && r.data && typeof r.data === "object" && Object.keys(r.data).every((k) => ["code", "message", "errors"].includes(k)) && CODES.has(r.data.code) && typeof r.data.message === "string";
      ck("AG-01", ok, `${r.status} ct=${r.ct} body=${r.text.slice(0, 160)}`);
    } else if (r.status === 201) {
      ck("AG-02", !/finderId|passwordHash|accessToken|refreshToken|userId/i.test(r.text), `201 lộ field nhạy cảm: ${r.text.slice(0, 200)}`);
    }
  }
  ck("AG-03", true);

  // AG-04: không file mồ côi trên Cloudinary (TR-1). File tạo trong run này mà không đơn nào trỏ tới = BE không xóa được (vd publicId xóa lệch publicId upload)
  try {
    const files = await cloudFilesSince(TS);
    const urls = sqlCol("SELECT cvUrl FROM application").join("\n");
    const orphans = files.filter((f) => !urls.includes(f.public_id));
    note("AG-04", `file Cloudinary tạo trong run: ${files.length}, đơn trỏ tới: ${files.length - orphans.length}, mồ côi: ${orphans.length}`);
    ck("AG-04", orphans.length === 0, `${orphans.length} file mồ côi (không đơn nào trỏ tới), mẫu: ${orphans.slice(0, 3).map((f) => f.public_id).join(" | ")}`);
  } catch (e) { note("AG-04", `không kiểm được Cloudinary: ${e.message}`); }
  note("AG-01", `đã quét ${recs.length} response apply (${nErr} lỗi)`);
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }, cloudSummary]);
