// AI: Idempotency-Key cho POST /api/jobs/{id}/applications (Redis thật) — thiếu key 400, replay 201 y hệt, 403 / 400 không "ăn" key, key sai định dạng
// Chạy riêng: node backend/tests/application-test/idempotency.test.mjs [--base=http://localhost:5166/api]
// Mỗi finder <= 5 request apply / phút (rate limit đếm cả 400/403/409/replay)
import {
  apply, ck, createProfile, errStr, isErr, isMain, makeEmployerJob, makeFinder, mkJob, redisCmd, runAdminSuites, sqlInt, uid, cloudSummary,
} from "./lib.mjs";

export const name = "AI: Idempotency-Key ứng tuyển (Redis thật)";

export default async function run() {
  console.log("\n── AI: idempotency");
  const { e, job } = await makeEmployerJob("AIE1", { jobTitle: "AI job" });
  const keysOf = (u, k) => redisCmd("KEYS", `idem:${u.id}:*${k.toLowerCase()}*`);
  const apps = (jobId) => sqlInt(`SELECT COUNT(*) FROM application WHERE jobId='${jobId}'`);

  // Finder 1: đúng 5 request
  {
    const F = await makeFinder("AIF1");
    const r0 = await apply(F, job.jobId, { key: null });
    ck("AI-01", isErr(r0, 400, "VALIDATION_ERROR") && !!r0.data.errors?.idempotencyKey && apps(job.jobId) === 0, `thiếu key: ${errStr(r0)}`);

    const K = uid();
    const r1 = await apply(F, job.jobId, { key: K });
    ck("AI-02", r1.status === 201, errStr(r1));
    ck("AI-02", (await keysOf(F, K)).length >= 1, "không thấy key idem trong Redis sau 201");

    const r2 = await apply(F, job.jobId, { key: K, replay: true });
    ck("AI-03", r2.status === 201 && r2.text === r1.text && r2.ct === r1.ct && r2.headers.get("location") === null, `replay không giống hệt:\n #1=${r1.text.slice(0, 300)}\n #2=${r2.text.slice(0, 300)}`);
    ck("AI-03", apps(job.jobId) === 1, `DB có ${apps(job.jobId)} đơn sau replay`);

    // cùng key, nội dung khác -> replay đơn cũ (Business 2.1: hash body multipart rỗng, đã chốt), không tạo đơn mới
    const r3 = await apply(F, job.jobId, { key: K, replay: true, fields: { fullName: "Người Khác" } });
    ck("AI-04", r3.status === 201 && r3.text === r1.text && apps(job.jobId) === 1, `cùng key nội dung khác: ${errStr(r3)}`);

    // key mới lần 2 -> 409 ALREADY_APPLIED (key 409 bị xóa)
    const K2 = uid();
    const r4 = await apply(F, job.jobId, { key: K2 });
    ck("AI-05", isErr(r4, 409, "ALREADY_APPLIED") && apps(job.jobId) === 1, errStr(r4));
    ck("AI-05", (await keysOf(F, K2)).length === 0, "key còn trong Redis sau lỗi 409");
  }

  // Finder 2: 403 không có hồ sơ không "ăn" key -> tạo hồ sơ -> cùng key chạy thật; key sai định dạng -> 400
  {
    const F = await makeFinder("AIF2", false);
    const K = uid();
    const r1 = await apply(F, job.jobId, { key: K });
    ck("AI-06", isErr(r1, 403, "FINDER_PROFILE_NOT_FOUND") && (await keysOf(F, K)).length === 0, errStr(r1));
    const p = await createProfile(F);
    ck("AI-06", p.status === 200, `tạo hồ sơ: ${errStr(p)}`);
    const r2 = await apply(F, job.jobId, { key: K });
    ck("AI-06", r2.status === 201 && apps(job.jobId) === 2, `cùng key sau khi có hồ sơ: ${errStr(r2)}`);
    const r3 = await apply(F, job.jobId, { key: "abc" });
    ck("AI-07", isErr(r3, 400, "VALIDATION_ERROR") && !!r3.data.errors?.idempotencyKey, `key sai định dạng: ${errStr(r3)}`);
  }

  // Finder 3: 404 / 400 xóa key -> gửi lại cùng key sau khi sửa thì chạy thật
  {
    const F = await makeFinder("AIF3");
    const j2 = await mkJob(e, { jobTitle: "AI job 2" });
    const r1 = await apply(F, uid(), { key: uid() });
    ck("AI-08", isErr(r1, 404, "JOB_NOT_FOUND"), errStr(r1));
    const K3 = uid();
    const bad = await apply(F, j2.jobId, { key: K3, fields: { email: "x" } });
    ck("AI-08", isErr(bad, 400, "VALIDATION_ERROR") && (await keysOf(F, K3)).length === 0, `400 để lại key: ${errStr(bad)}`);
    const good = await apply(F, j2.jobId, { key: K3 });
    ck("AI-08", good.status === 201, `form sửa lại, cùng key: ${errStr(good)}`);
  }
}

if (isMain(import.meta.url)) await runAdminSuites([{ name, run }, cloudSummary]);
