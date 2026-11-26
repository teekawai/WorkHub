// AP: applicationCount chỉ có ở 2 API của Employer (GET /employer/jobs, GET /employer/jobs/:id), các API khác không có (Application Business 5)
// Dùng Job CÓ đơn để chắc key vắng do thiết kế (JsonIgnore khi null), không phải do count = 0.
// Chạy riêng: node backend/tests/job-test/application-count.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  DETAIL_KEYS, J, PUBLIC_DETAIL_KEYS, RESP_KEYS, TS, addApp, ck, errStr, isMain, raw, runSuites, sameSet, sleep, validJob,
} from "./lib.mjs";

export const name = "AP: applicationCount chỉ ở API Employer";

export default async function run(ctx) {
  const { E1, F1, F2 } = ctx.U;
  console.log("\n── AP: applicationCount");
  const has = (o) => o && typeof o === "object" && "applicationCount" in o;

  // AP-01: POST /jobs
  const created = await J("POST", "/jobs", E1.token, validJob({ jobTitle: `AP job ${TS}` }));
  ck("AP-01", created.status === 201 && !has(created.data) && sameSet(Object.keys(created.data), RESP_KEYS), errStr(created).slice(0, 200));
  const id = created.data.jobId;
  addApp(F1, id); addApp(F2, id, "Accepted");

  // AP-02: PUT trên Job có đơn
  const put = await J("PUT", `/jobs/${id}`, E1.token, validJob({ jobTitle: `AP job sửa ${TS}` }));
  ck("AP-02", put.status === 200 && !has(put.data) && sameSet(Object.keys(put.data), RESP_KEYS), errStr(put).slice(0, 200));

  // AP-04: chi tiết công khai (ẩn danh + Finder) trên Job có đơn
  for (const [who, tok] of [["ẩn danh", null], ["Finder", F1.token]]) {
    const pub = await raw("GET", `/jobs/${id}`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
    ck("AP-04", pub.status === 200 && !has(pub.data) && Object.keys(pub.data).every((k) => PUBLIC_DETAIL_KEYS.includes(k)), `${who}: ${errStr(pub).slice(0, 200)}`);
  }

  // AP-05: search
  // search giới hạn 60 req/phút/IP: nhóm search (S-12) vừa dùng hết cửa sổ thì chờ theo Retry-After
  let s;
  for (let i = 0; i < 3; i++) {
    s = await raw("GET", `/jobs?keyword=${encodeURIComponent(`AP job sửa ${TS}`)}`);
    if (s.status !== 429) break;
    await sleep((Number(s.headers.get("retry-after")) || 60) * 1000 + 1000);
  }
  const item = s.data?.items?.find((x) => x.jobId === id);
  ck("AP-05", s.status === 200 && item && !has(item), `search: ${errStr(s).slice(0, 200)}`);

  // AP-03: PATCH đóng Job có đơn
  const patch = await J("PATCH", `/jobs/${id}/status`, E1.token, { status: "Closed" });
  ck("AP-03", patch.status === 200 && !has(patch.data) && sameSet(Object.keys(patch.data), RESP_KEYS), errStr(patch).slice(0, 200));

  // đối chứng: 2 API Employer vẫn trả đúng 2 đơn
  const d = await J("GET", `/employer/jobs/${id}`, E1.token);
  ck("AP-06", d.status === 200 && d.data.applicationCount === 2 && DETAIL_KEYS.every((k) => k in d.data), errStr(d).slice(0, 200));
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
