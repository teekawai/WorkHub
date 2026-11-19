// AC: Tự đóng Job quá hạn — Nhóm service: JobAutoCloseService (BackgroundService), chạy bù khi khởi động + mỗi 00:00 giờ VN (Business 2.3)
// Chạy riêng: node backend/tests/job-test/auto-close.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
// Lưu ý: BE phụ khởi động sẽ đóng MỌI Job Open quá hạn trong DB local (kể cả dữ liệu không phải của test) — đúng hành vi thật lúc 00:00
import {
  J, TODAY, addDays, ck, errStr, isMain, jobStatusDb, makeEmployer, mkJob, note, raw, runSuites, setDeadline, setVerified, sleep, withExtraBackend,
} from "./lib.mjs";

export const name = "AC: JobAutoCloseService (BE phụ cổng 5166)";

export default async function run() {
  console.log("\n── AC: tự đóng Job quá hạn khi BE khởi động (chạy bù)");
  const A1 = await makeEmployer("AC1");
  const A2 = await makeEmployer("AC2");

  const yesterday = await mkJob(A1, { jobTitle: "AC hết hạn hôm qua" });
  setDeadline(yesterday.jobId, addDays(TODAY, -1));
  const longAgo = await mkJob(A1, { jobTitle: "AC hết hạn 30 ngày" });
  setDeadline(longAgo.jobId, addDays(TODAY, -30));
  const today = await mkJob(A1, { jobTitle: "AC hạn hôm nay" });
  setDeadline(today.jobId, TODAY); // còn hạn hết ngày Deadline -> không đóng
  const future = await mkJob(A1, { jobTitle: "AC còn hạn" });
  const closedBefore = await mkJob(A1, { jobTitle: "AC đã đóng trước" });
  await J("PATCH", `/jobs/${closedBefore.jobId}/status`, A1.token, { status: "Closed" });
  setDeadline(closedBefore.jobId, addDays(TODAY, -2));
  // Employer bị hủy xác minh: Job quá hạn vẫn bị đóng (auto-close không lọc IsVerified)
  const unverified = await mkJob(A2, { jobTitle: "AC chưa xác minh hết hạn" });
  setDeadline(unverified.jobId, addDays(TODAY, -1));
  setVerified(A2, 0);

  const watched = { yesterday, longAgo, today, future, closedBefore, unverified };
  const statusAll = () => Object.fromEntries(Object.entries(watched).map(([k, j]) => [k, jobStatusDb(j.jobId)]));
  const before = statusAll();
  ck("AC-00", before.yesterday === "Open" && before.longAgo === "Open" && before.unverified === "Open" && before.closedBefore === "Closed",
    `trước khi chạy bù: ${JSON.stringify(before)}`);

  // BE phụ chạy bù ngay trong ExecuteAsync lúc khởi động -> chờ tới khi log báo xong (tối đa ~10 giây) rồi mới kiểm
  await withExtraBackend("AC-01", {}, async (_base, getLog) => {
    for (let i = 0; i < 20 && !/Đã tự đóng \d+ Job quá hạn|Tự đóng Job quá hạn thất bại/.test(getLog()); i++) await sleep(500);
    const after = statusAll();
    ck("AC-01", after.yesterday === "Closed" && after.longAgo === "Closed", `Job quá hạn chưa bị đóng: ${JSON.stringify(after)}`);
    ck("AC-02", after.today === "Open" && after.future === "Open", `Job còn hạn bị đóng nhầm: ${JSON.stringify(after)}`);
    ck("AC-03", after.closedBefore === "Closed", `Job đã đóng bị đổi: ${after.closedBefore}`);
    ck("AC-04", after.unverified === "Closed", `Job của Employer chưa xác minh: ${after.unverified}`);
    const line = getLog().match(/Đã tự đóng \d+ Job quá hạn/);
    ck("AC-05", !!line, `không thấy log chạy bù trong BE phụ: ${getLog().slice(-300)}`);
    if (line) note("AC-05", line[0]);
  });

  // kết quả đóng phản ánh qua API của BE chính
  const owner = await J("GET", `/employer/jobs/${yesterday.jobId}`, A1.token);
  ck("AC-06", owner.status === 200 && owner.data.status === "Closed", errStr(owner));
  const pub = await raw("GET", `/jobs/${longAgo.jobId}`);
  ck("AC-06", pub.status === 200 && pub.data.status === "Closed", errStr(pub));
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
