// EF: GET /api/employer/jobs?keyword=&status= — tìm / lọc "Tin tuyển dụng của tôi" (Application Business 5.1)
// Phần InMemory của unit test không kiểm được (hoa/thường, dấu, đ/Đ ở MySQL, % _ không phải wildcard, biên ngày trên dữ liệu thật) nằm ở đây.
// Chạy riêng: node backend/tests/job-test/employer-list-filter.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
import {
  EMPLOYER_LIST_KEYS, J, TODAY, addApp, addDays, ck, errStr, isErr, isMain, makeEmployer, mkJob, raw, runSuites, sameSet, setDeadline, setVerified, sql,
} from "./lib.mjs";

export const name = "EF: GET /api/employer/jobs keyword + status";

export default async function run(ctx) {
  const { F1 } = ctx.U;
  // Employer riêng để đếm chính xác: E1 chứa dữ liệu lọc, E2 cùng tên tin (không được lọt), E3 bị hủy xác minh
  const E1 = await makeEmployer("EF1"), E2 = await makeEmployer("EF2"), E3 = await makeEmployer("EF3");
  const enc = encodeURIComponent;

  // ── Dữ liệu: 11 Job của E1 (đóng / hết hạn dựng bằng PATCH + UPDATE deadline) ──
  const mk = (title) => mkJob(E1, { jobTitle: title });
  const L = {}; // nhãn -> jobId
  const lab = {}; // jobId -> nhãn
  const add = (k, j) => { L[k] = j.jobId; lab[j.jobId] = k; return j; };
  add("J1", await mk("Senior Developer Dev"));
  add("J2", await mk("Tuyển nhân viên kinh doanh"));
  add("J3", await mk("Quản lý Đà Nẵng"));
  add("J4", await mk("Giảm giá 100% sale"));
  add("J5", await mk("Lập trình_viên backend"));
  add("J6", await mk("Kế toán tổng hợp"));
  add("J7", await mk("Hết hạn Dev"));
  add("J8", await mk("Hôm nay còn mở"));
  add("J9", await mk("Hôm nay Closed"));
  add("J10", await mk("Hôm qua Closed"));
  add("J11", await mk("Đơn Hàng Online"));
  await J("PATCH", `/jobs/${L.J6}/status`, E1.token, { status: "Closed" });
  await J("PATCH", `/jobs/${L.J9}/status`, E1.token, { status: "Closed" });
  await J("PATCH", `/jobs/${L.J10}/status`, E1.token, { status: "Closed" });
  setDeadline(L.J7, addDays(TODAY, -1)); // Open + hết hạn (auto-close chưa chạy)
  setDeadline(L.J8, TODAY); // biên: hạn đúng hôm nay vẫn còn hạn
  setDeadline(L.J9, TODAY);
  setDeadline(L.J10, addDays(TODAY, -1)); // Closed + hết hạn -> expired
  addApp(F1, L.J1); // để kiểm applicationCount khi có lọc

  const get = (qs, tok = E1.token) => J("GET", `/employer/jobs${qs ? "?" + qs : ""}`, tok);
  const names = (r) => (r.data?.items || []).map((x) => lab[x.jobId] || x.jobId.slice(0, 6)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(",");
  const expect = (id, r, want, extra = "") => ck(id, r.status === 200 && names(r) === [...want].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).join(","), `[${r.status === 200 ? names(r) : errStr(r)}] kỳ vọng [${want}] ${extra}`);
  const ALL = Object.keys(L);

  console.log("\n── EF-00: không lọc");
  {
    const r = await get("");
    expect("EF-00", r, ALL);
    ck("EF-00", r.data?.pagination?.totalItems === 11, JSON.stringify(r.data?.pagination));
  }

  console.log("\n── EF-01: keyword chỉ khớp tên tin, không khớp tên công ty");
  {
    expect("EF-01", await get(`keyword=${enc("Kế toán")}`), ["J6"]);
    const company = (await J("GET", "/employer/me", E1.token)).data?.companyName;
    ck("EF-01", !!company, "không đọc được tên công ty");
    expect("EF-01", await get(`keyword=${enc(company)}`), [], "keyword = tên công ty phải không khớp");
    expect("EF-01", await get(`keyword=JobQA`), [], "một phần tên công ty");
  }

  console.log("\n── EF-02: hoa / thường");
  for (const k of ["DEV", "dev", "dEv", "DEVELOPER"]) expect("EF-02", await get(`keyword=${enc(k)}`), k.toUpperCase() === "DEVELOPER" ? ["J1"] : ["J1", "J7"], `keyword=${k}`);

  console.log("\n── EF-03: dấu thanh (Business 6.3: không phân biệt dấu)");
  for (const k of ["Tuyển nhân", "tuyen nhan", "TUYỂN NHÂN", "TUYEN NHAN"]) expect("EF-03", await get(`keyword=${enc(k)}`), ["J2"], `keyword=${k}`);

  console.log("\n── EF-04: đ / Đ");
  for (const k of ["Đà", "đà", "da", "DA NANG", "Da Nang", "ĐÀ NẴNG"]) expect("EF-04", await get(`keyword=${enc(k)}`), ["J3"], `keyword=${k}`);
  for (const k of ["Đơn hàng", "đơn hàng", "don hang", "DON HANG", "ĐƠN HÀNG"]) expect("EF-04", await get(`keyword=${enc(k)}`), ["J11"], `keyword=${k}`);

  console.log("\n── EF-05: % và _ là ký tự thường");
  expect("EF-05", await get(`keyword=${enc("%")}`), ["J4"], "% chỉ khớp tin chứa ký tự %");
  expect("EF-05", await get(`keyword=${enc("100%")}`), ["J4"]);
  expect("EF-05", await get(`keyword=${enc("_")}`), ["J5"], "_ chỉ khớp tin chứa ký tự _");
  expect("EF-05", await get(`keyword=${enc("trình_viên")}`), ["J5"]);
  for (const k of ["a%b", "Dev%", "%Dev", "D_v", "Senior_Developer", "\\", "%%", "__"]) expect("EF-05", await get(`keyword=${enc(k)}`), [], `keyword=${k} không được là wildcard`);

  console.log("\n── EF-06: trim, rỗng, toàn khoảng trắng = không lọc");
  expect("EF-06", await get(`keyword=${enc("  dev ")}`), ["J1", "J7"]);
  for (const k of ["", "   ", "%20%20%20"]) expect("EF-06", await get(`keyword=${k === "%20%20%20" ? k : enc(k)}`), ALL, `keyword="${k}"`);

  console.log("\n── EF-07: độ dài keyword");
  {
    const a255 = "a".repeat(255);
    const r1 = await get(`keyword=${a255}`), r2 = await get(`keyword=${enc(`  ${a255}  `)}`), r3 = await get(`keyword=${a255}a`), r4 = await get(`keyword=${enc(` ${"a".repeat(256)}`)}`);
    ck("EF-07", r1.status === 200 && r2.status === 200, `255: ${r1.status}, 255+khoảng trắng: ${r2.status}`);
    ck("EF-07", isErr(r3, 400, "VALIDATION_ERROR") && sameSet(Object.keys(r3.data.errors), ["keyword"]) && r3.data.errors.keyword.length > 0, `256: ${errStr(r3)}`);
    ck("EF-07", isErr(r4, 400, "VALIDATION_ERROR") && "keyword" in r4.data.errors, `256 sau trim: ${errStr(r4)}`);
    // đếm theo ký tự, không theo byte: 255 chữ có dấu hợp lệ
    const r5 = await get(`keyword=${enc("ệ".repeat(255))}`);
    ck("EF-07", r5.status === 200, `255 ký tự có dấu: ${errStr(r5)}`);
  }

  console.log("\n── EF-08..11: status + biên Deadline");
  {
    const OPEN = ["J1", "J2", "J3", "J4", "J5", "J8", "J11"], CLOSED = ["J6", "J9"], EXPIRED = ["J7", "J10"];
    expect("EF-08", await get("status=open"), OPEN);
    expect("EF-08", await get("status=closed"), CLOSED);
    expect("EF-08", await get("status=expired"), EXPIRED);
    expect("EF-08", await get("status="), ALL);
    expect("EF-08", await get("status=%20%20"), ALL);
    expect("EF-08", await get(`status=${enc(" open ")}`), OPEN, "status có khoảng trắng 2 đầu");
    // 3 tập rời nhau, hợp = tất cả
    ck("EF-08", OPEN.length + CLOSED.length + EXPIRED.length === ALL.length && sameSet([...OPEN, ...CLOSED, ...EXPIRED], ALL), "3 tập không phủ đủ");
    // biên: hạn = hôm nay -> còn hạn; hạn = hôm qua -> hết hạn (Open lẫn Closed)
    const open = await get("status=open"), closed = await get("status=closed"), expired = await get("status=expired");
    ck("EF-09", names(open).includes("J8") && names(closed).includes("J9") && !names(expired).includes("J8") && !names(expired).includes("J9"), "Deadline = hôm nay phải là open / closed, không phải expired");
    ck("EF-10", names(expired).includes("J7") && names(expired).includes("J10") && !names(open).includes("J7") && !names(closed).includes("J10"), "Deadline = hôm qua phải là expired (Open lẫn Closed)");
    // status của item vẫn là giá trị DB (Open) kể cả khi lọc expired: contract không đổi
    ck("EF-10", expired.data.items.find((x) => x.jobId === L.J7)?.status === "Open", "item expired giữ status DB = Open");
    // EF-11: hạn tương lai; chuyển hạn của J2 sang hôm qua thì rời open -> expired
    setDeadline(L.J2, addDays(TODAY, -1));
    expect("EF-11", await get("status=open"), OPEN.filter((x) => x !== "J2"));
    expect("EF-11", await get("status=expired"), [...EXPIRED, "J2"]);
    setDeadline(L.J2, addDays(TODAY, 30));
    expect("EF-11", await get("status=open"), OPEN);
  }

  console.log("\n── EF-12: status không hợp lệ");
  for (const s of ["Open", "OPEN", "Closed", "Expired", "abc", "opened", "open,closed", "all", "0"]) {
    const r = await get(`status=${enc(s)}`);
    ck("EF-12", isErr(r, 400, "VALIDATION_ERROR") && sameSet(Object.keys(r.data.errors), ["status"]) && r.data.errors.status.length > 0, `status=${s}: ${errStr(r)}`);
  }

  console.log("\n── EF-13: lỗi validate gộp");
  {
    const r = await get(`page=0&limit=0&status=x&keyword=${"a".repeat(256)}`);
    ck("EF-13", isErr(r, 400, "VALIDATION_ERROR") && sameSet(Object.keys(r.data.errors), ["page", "limit", "status", "keyword"]), errStr(r));
    const r2 = await get("page=0&status=x");
    ck("EF-13", isErr(r2, 400, "VALIDATION_ERROR") && sameSet(Object.keys(r2.data.errors), ["page", "status"]), errStr(r2));
    const r3 = await get(`limit=-1&keyword=${"a".repeat(256)}`);
    ck("EF-13", isErr(r3, 400, "VALIDATION_ERROR") && sameSet(Object.keys(r3.data.errors), ["limit", "keyword"]), errStr(r3));
  }

  console.log("\n── EF-14: keyword AND status, totalItems sau lọc, phân trang");
  {
    // createdAt cắt giây + sort chỉ createdAt DESC: 7 Job tạo cùng giây sẽ nhảy trang ngẫu nhiên -> đặt createdAt khác nhau (cách 1 phút); updatedAt đi theo để giữ updatedAt >= createdAt
    ALL.forEach((k, i) => sql(`UPDATE job SET createdAt=DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${i + 1} MINUTE), updatedAt=createdAt WHERE jobId='${L[k]}'`));
    expect("EF-14", await get("keyword=dev&status=open"), ["J1"]);
    expect("EF-14", await get("keyword=dev&status=expired"), ["J7"]);
    expect("EF-14", await get("keyword=dev&status=closed"), []);
    expect("EF-14", await get(`keyword=${enc("hôm nay")}&status=closed`), ["J9"]);
    expect("EF-14", await get(`keyword=${enc("hôm nay")}`), ["J8", "J9"]);
    const k = await get("keyword=dev");
    ck("EF-14", k.data?.pagination?.totalItems === 2 && k.data.pagination.totalPages === 1, JSON.stringify(k.data?.pagination));
    const none = await get("keyword=khongco&status=open");
    ck("EF-14", none.status === 200 && none.data.items.length === 0 && none.data.pagination.totalItems === 0 && none.data.pagination.totalPages === 0, errStr(none).slice(0, 200));
    // 7 Job open, limit=3 -> 3 trang (3,3,1), totalItems tính sau lọc
    const seen = [];
    for (const [pg, n] of [[1, 3], [2, 3], [3, 1], [4, 0]]) {
      const r = await get(`status=open&limit=3&page=${pg}`);
      ck("EF-14", r.status === 200 && r.data.items.length === n && r.data.pagination.totalItems === 7 && r.data.pagination.totalPages === 3 && r.data.pagination.currentPage === pg, `page ${pg}: ${errStr(r).slice(0, 200)}`);
      const cs = r.data.items.map((x) => Date.parse(x.createdAt));
      ck("EF-14", cs.every((c, i) => i === 0 || cs[i - 1] >= c), `createdAt không giảm dần: ${r.data.items.map((x) => x.createdAt)}`);
      seen.push(...r.data.items.map((x) => lab[x.jobId]));
    }
    ck("EF-14", sameSet(seen, ["J1", "J2", "J3", "J4", "J5", "J8", "J11"]) && new Set(seen).size === 7, `các trang gộp: ${seen}`);
  }

  console.log("\n── EF-15: chỉ Job của chính Employer; Employer chưa xác minh vẫn lọc được");
  {
    // E2 cùng tên tin với E1 nhưng không được lọt vào kết quả của E1 và ngược lại
    const x1 = await mkJob(E2, { jobTitle: "Senior Developer Dev của E2" });
    const x2 = await mkJob(E2, { jobTitle: "Dev đã đóng của E2" });
    await J("PATCH", `/jobs/${x2.jobId}/status`, E2.token, { status: "Closed" });
    expect("EF-15", await get("keyword=dev"), ["J1", "J7"], "Job của E2 lọt vào E1");
    expect("EF-15", await get("keyword=dev&status=closed"), []);
    const r2 = await get("keyword=dev", E2.token);
    ck("EF-15", r2.status === 200 && sameSet(r2.data.items.map((x) => x.jobId), [x1.jobId, x2.jobId]), `E2: ${errStr(r2).slice(0, 200)}`);
    // E3: 1 open + 1 closed rồi hủy xác minh -> vẫn xem / lọc được (chỉ xem)
    const o3 = await mkJob(E3, { jobTitle: "E3 mở Dev" });
    const c3 = await mkJob(E3, { jobTitle: "E3 đóng Dev" });
    await J("PATCH", `/jobs/${c3.jobId}/status`, E3.token, { status: "Closed" });
    setVerified(E3, 0);
    const a = await get("keyword=dev&status=open", E3.token), b = await get("status=closed", E3.token), c = await get("keyword=DEV", E3.token);
    ck("EF-15", a.status === 200 && sameSet(a.data.items.map((x) => x.jobId), [o3.jobId]), `E3 open: ${errStr(a).slice(0, 200)}`);
    ck("EF-15", b.status === 200 && sameSet(b.data.items.map((x) => x.jobId), [c3.jobId]), `E3 closed: ${errStr(b).slice(0, 200)}`);
    ck("EF-15", c.status === 200 && c.data.pagination.totalItems === 2, `E3 keyword: ${errStr(c).slice(0, 200)}`);
  }

  console.log("\n── EF-16: item sau lọc vẫn đủ field (applicationCount, updatedAt)");
  {
    const r = await get("keyword=dev&status=open");
    const it = r.data?.items?.[0];
    ck("EF-16", r.status === 200 && r.data.items.length === 1 && sameSet(Object.keys(it), EMPLOYER_LIST_KEYS), `keys=${it && Object.keys(it)}`);
    ck("EF-16", it?.applicationCount === 1 && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(it?.updatedAt), `applicationCount=${it?.applicationCount} updatedAt=${it?.updatedAt}`);
    const r7 = await get("keyword=dev&status=expired");
    ck("EF-16", r7.data?.items?.[0]?.applicationCount === 0, `J7 không có đơn: ${r7.data?.items?.[0]?.applicationCount}`);
  }

  console.log("\n── EF-17: ký tự đặc biệt không lỗi / không lộ");
  for (const k of ["' OR 1=1 --", "\"; DROP TABLE job; --", "\\' OR '1'='1", "<script>", "%27", "日本語", "😀"]) {
    const r = await get(`keyword=${enc(k)}`);
    ck("EF-17", r.status === 200 && r.data.items.length === 0, `keyword=${k}: ${errStr(r).slice(0, 160)}`);
  }

  console.log("\n── EF-18: quyền không đổi khi có tham số lọc");
  {
    const anon = await raw("GET", "/employer/jobs?keyword=dev&status=open");
    ck("EF-18", isErr(anon, 401, "UNAUTHENTICATED"), errStr(anon));
    const fin = await get("keyword=dev&status=open", F1.token);
    ck("EF-18", isErr(fin, 403, "FORBIDDEN_ROLE"), errStr(fin));
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
