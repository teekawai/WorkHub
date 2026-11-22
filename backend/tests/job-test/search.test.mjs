// S: GET /api/jobs — Tìm kiếm Job công khai: điều kiện hiển thị, keyword, filter, sort, phân trang (Business 6, 1.3, 1.4.1)
// Chạy riêng: node backend/tests/job-test/search.test.mjs   (chạy tất cả: node backend/tests/job-test/run.mjs)
// GET /api/jobs bị rate limit 60 request/phút/IP: nhóm này tự giãn nhịp (mất thêm ~1 phút), S-12 cố tình vượt giới hạn ở cuối.
// Chạy lại ngay sau lần trước thì cửa sổ cũ còn bị S-12 dùng hết -> nhóm tự chờ theo Retry-After trước khi test.
import {
  J, TODAY, TS, addDays, ck, errStr, isErr, isMain, makeEmployer, mkJob, runSuites, sameSet, setDeadline, setVerified, sleep, sql, sqlInt,
} from "./lib.mjs";

export const name = "S: GET /api/jobs";

const ITEM_KEYS = ["jobId", "jobTitle", "companyName", "logo", "location", "salaryType", "salaryMin", "salaryMax", "createdAt", "yearOfExperience"];
const M = 1_000_000;

export default async function run(ctx) {
  const { E1, F1 } = ctx.U;
  const { OPT } = ctx;
  console.log("\n── S: GET /jobs (search)");

  // DB dùng chung với dữ liệu khác -> mọi truy vấn kèm keyword = TAG (nằm trong tên công ty của S1/S2) để chỉ thấy Job của nhóm này
  const TAG = `SRCH${TS}`;
  const S1 = await makeEmployer("S1");
  const S2 = await makeEmployer("S2");
  sql(`UPDATE employerprofile SET companyName='${TAG} Công Ty Tìm Kiếm' WHERE userId='${S1.id}'`);
  sql(`UPDATE employerprofile SET companyName='${TAG} Chưa Xác Minh' WHERE userId='${S2.id}'`);

  const [c0, c1] = OPT.categories;
  const [loc0, loc1] = OPT.locations;
  const TITLE_WORD = `TTL${TS}`, DESC_WORD = `DESC${TS}`;
  // ví dụ Business 6.5 / 1.3: A 20–30tr, B từ 25tr, C 10–15tr, D thỏa thuận; E 10–14tr hạn hôm nay
  const A = await mkJob(S1, { jobTitle: `A ${TITLE_WORD}`, salaryMin: 20 * M, salaryMax: 30 * M, yearOfExperience: 3, category: c0.name, subCategory: c0.subCategories[0], location: loc0, workType: "Onsite" });
  const B = await mkJob(S1, { jobTitle: "B", salaryMin: 25 * M, salaryMax: undefined, yearOfExperience: 1, category: c0.name, subCategory: c0.subCategories[1], location: loc1, workType: "Remote" });
  const C = await mkJob(S1, { jobTitle: "C", salaryMin: 10 * M, salaryMax: 15 * M, yearOfExperience: 0, category: c1.name, subCategory: c1.subCategories[0], location: loc0, workType: "Hybrid" });
  const D = await mkJob(S1, { jobTitle: "D", salaryType: "Negotiable", yearOfExperience: 10, category: c1.name, subCategory: undefined, location: loc1, workType: "Onsite", description: `mô tả ${DESC_WORD}` });
  const E = await mkJob(S1, { jobTitle: "E", salaryMin: 10 * M, salaryMax: 14 * M, yearOfExperience: 5, category: c0.name, subCategory: undefined, location: loc0, workType: "Remote" });
  setDeadline(E.jobId, TODAY);
  const closed = await mkJob(S1, { jobTitle: "đã đóng" });
  await J("PATCH", `/jobs/${closed.jobId}/status`, S1.token, { status: "Closed" });
  const expired = await mkJob(S1, { jobTitle: "hết hạn" });
  setDeadline(expired.jobId, addDays(TODAY, -1));
  const unverified = await mkJob(S2, { jobTitle: "chưa xác minh" });
  setVerified(S2, 0);
  // S3: tên có chữ đ để kiểm d/đ, Job "từ 1 tỷ" (mức trần) để kiểm khoảng cuối tính cả biên trên (Business 1.3)
  const TAG2 = `SRCHB${TS}`;
  const S3 = await makeEmployer("S3");
  sql(`UPDATE employerprofile SET companyName='${TAG2} Công Ty Điện Đà Nẵng' WHERE userId='${S3.id}'`);
  // API chỉ cho tối đa 999tr (Business 1.2) -> tạo 999tr rồi SQL nâng lên 1 tỷ, giả lập dữ liệu cũ để vẫn kiểm biên trên tính cả của "Trên 50 triệu" (Business 1.3)
  const F1ty = await mkJob(S3, { jobTitle: "F1ty", salaryMin: 999 * M, salaryMax: undefined });
  sql(`UPDATE job SET salaryMin=1000000000 WHERE jobId='${F1ty.jobId}'`);
  const F50 = await mkJob(S3, { jobTitle: "F50", salaryMin: 50 * M, salaryMax: undefined });

  // thứ tự newest: A > B > C = D (cùng giây -> theo jobId) > E
  const at = (job, min) => sql(`UPDATE job SET createdAt = DATE_SUB(UTC_TIMESTAMP(), INTERVAL ${min} MINUTE) WHERE jobId='${job.jobId}'`);
  at(A, 1); at(B, 2); at(C, 3); at(E, 4);
  sql(`UPDATE job SET createdAt = (SELECT x FROM (SELECT createdAt AS x FROM job WHERE jobId='${C.jobId}') t) WHERE jobId='${D.jobId}'`);
  const [first, second] = [C, D].sort((x, y) => (x.jobId < y.jobId ? -1 : 1));
  const NEWEST = [A, B, first, second, E].map((x) => x.jobId);
  const label = Object.fromEntries([A, B, C, D, E, closed, expired, unverified, F1ty, F50].map((x) => [x.jobId, x.jobTitle.split(" ")[0]]));

  // rate limit 60/phút/IP (Business 6.1): giữ tối đa 55 request trong 61 giây bất kỳ -> không chạm giới hạn ở cửa sổ cố định nào
  const sentAt = [];
  const get = async (p, token = null) => {
    for (;;) {
      const now = Date.now();
      while (sentAt.length && now - sentAt[0] > 61000) sentAt.shift();
      if (sentAt.length < 55) break;
      await sleep(61000 - (now - sentAt[0]) + 50);
    }
    sentAt.push(Date.now());
    return J("GET", p, token);
  };
  // lượt chạy trước (S-12) có thể vừa dùng hết cửa sổ -> chờ theo Retry-After cho tới khi gọi được
  for (;;) {
    const probe = await get("/jobs?limit=1");
    if (probe.status !== 429) break;
    const wait = Number(probe.headers.get("retry-after")) || 60;
    console.log(`   ⏳ đang bị rate limit từ lượt chạy trước, chờ ${wait}s`);
    await sleep(wait * 1000 + 1000);
  }
  const kw = encodeURIComponent(TAG);
  const search =(q = "", token = null) => get(`/jobs?keyword=${kw}${q ? "&" + q : ""}`, token);
  const ids = (r) => (r.data?.items || []).map((x) => x.jobId);
  const names = (r) => ids(r).map((x) => label[x] || x.slice(0, 6)).join(",");
  const expectSet = async (id, q, expected) => {
    const r = await search(q);
    ck(id, r.status === 200 && sameSet(ids(r), expected.map((x) => x.jobId)), `?${q} -> ${r.status} [${names(r)}] kỳ vọng [${expected.map((x) => label[x.jobId]).join(",")}] ${r.status !== 200 ? errStr(r) : ""}`);
  };

  // S-01 điều kiện công khai + shape (6.2, 6.7, item cho card)
  {
    const r = await search();
    ck("S-01", r.status === 200 && JSON.stringify(ids(r)) === JSON.stringify(NEWEST), `[${names(r)}] kỳ vọng A,B,C/D,E ${errStr(r).slice(0, 200)}`);
    ck("S-01", sameSet(Object.keys(r.data), ["items", "pagination"]) && JSON.stringify(r.data.pagination) === JSON.stringify({ totalItems: 5, totalPages: 1, currentPage: 1, limit: 30 }), JSON.stringify(r.data?.pagination));
    ck("S-01", r.data.items.every((x) => sameSet(Object.keys(x), ITEM_KEYS)), `keys item=${Object.keys(r.data.items[0] || {})}`);
    const a = r.data.items.find((x) => x.jobId === A.jobId), d = r.data.items.find((x) => x.jobId === D.jobId), b = r.data.items.find((x) => x.jobId === B.jobId);
    ck("S-01", a && a.companyName === `${TAG} Công Ty Tìm Kiếm` && a.location === loc0 && a.salaryType === "Range" && a.salaryMin === 20 * M && a.salaryMax === 30 * M && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(a.createdAt), JSON.stringify(a));
    ck("S-01", d && d.salaryType === "Negotiable" && d.salaryMin === null && d.salaryMax === null, `Negotiable: ${JSON.stringify(d)}`);
    ck("S-01", b && b.salaryMin === 25 * M && b.salaryMax === null, `từ 25tr: ${JSON.stringify(b)}`);
    // yearOfExperience đúng giá trị Job tạo (A=3, B=1, C=0 không yêu cầu, D=10, E=5), kiểu số nguyên
    const yoe = Object.fromEntries(r.data.items.map((x) => [label[x.jobId], x.yearOfExperience]));
    ck("S-01", yoe.A === 3 && yoe.B === 1 && yoe.C === 0 && yoe.D === 10 && yoe.E === 5, `yearOfExperience item: ${JSON.stringify(yoe)}`);
    ck("S-01", r.data.items.every((x) => Number.isInteger(x.yearOfExperience)), "yearOfExperience không phải số nguyên");
    ck("S-01", sqlInt(`SELECT COUNT(*) FROM job WHERE employerId IN ('${S1.id}','${S2.id}')`) === 8, "dữ liệu chuẩn bị");
  }
  // S-02 Employer bị hủy xác minh -> Job biến mất khỏi search; xác minh lại -> hiện lại
  {
    setVerified(S1, 0);
    const r = await search();
    setVerified(S1, 1);
    const r2 = await search();
    ck("S-02", r.status === 200 && r.data.items.length === 0 && r.data.pagination.totalItems === 0 && r2.data.items.length === 5, `${r.data?.items?.length} -> ${r2.data?.items?.length}`);
  }
  // S-03 keyword: JobTitle + CompanyName, không phân biệt hoa thường / dấu, không tìm Description, % _ là ký tự thường (6.3)
  {
    const t = await get(`/jobs?keyword=${encodeURIComponent(TITLE_WORD.toLowerCase())}`);
    ck("S-03", t.status === 200 && JSON.stringify(ids(t)) === JSON.stringify([A.jobId]), `theo title: [${names(t)}]`);
    const noAccent = await get(`/jobs?keyword=${encodeURIComponent(`${TAG.toLowerCase()} cong ty tim kiem`)}`);
    ck("S-03", noAccent.status === 200 && noAccent.data.items.length === 5, `không dấu: ${noAccent.data?.items?.length}`);
    const trimmed = await get(`/jobs?keyword=${encodeURIComponent(`   ${TAG}   `)}`);
    ck("S-03", trimmed.status === 200 && trimmed.data.items.length === 5, `có khoảng trắng 2 đầu: ${trimmed.data?.items?.length}`);
    const desc = await get(`/jobs?keyword=${DESC_WORD}`);
    ck("S-03", desc.status === 200 && desc.data.items.length === 0, `tìm theo description: ${desc.data?.items?.length}`);
    for (const w of [`%${TAG}`, `${TAG}_`, `${TAG}%`]) {
      const x = await get(`/jobs?keyword=${encodeURIComponent(w)}`);
      ck("S-03", x.status === 200 && x.data.items.length === 0, `keyword "${w}" phải coi %/_ là chữ: ${x.data?.items?.length}`);
    }
    // d khớp đ (Business 6.3): S3 tên "... Điện Đà Nẵng", gõ không dấu và không có đ
    const dd = await get(`/jobs?keyword=${encodeURIComponent(`${TAG2.toLowerCase()} cong ty dien da nang`)}`);
    ck("S-03", dd.status === 200 && sameSet(ids(dd), [F1ty.jobId, F50.jobId]), `"cong ty dien da nang": [${names(dd)}]`);
    const dd2 = await get(`/jobs?keyword=${encodeURIComponent("Đien Đà")}&salaryMin=${50 * M}&salaryMax=${1000 * M}`);
    ck("S-03", dd2.status === 200 && [F1ty.jobId, F50.jobId].every((x) => ids(dd2).includes(x)), `"Đien Đà": [${names(dd2)}]`);
    const k255 = await get(`/jobs?keyword=${"a".repeat(255)}`);
    const k256 = await get(`/jobs?keyword=${"a".repeat(256)}`);
    ck("S-03", k255.status === 200 && isErr(k256, 400, "VALIDATION_ERROR") && "keyword" in k256.data.errors, `255: ${k255.status}, 256: ${errStr(k256)}`);
    const sqlish = await get(`/jobs?keyword=${encodeURIComponent("' OR 1=1 --")}`);
    ck("S-03", sqlish.status === 200 && Array.isArray(sqlish.data.items), errStr(sqlish));
  }
  // S-04 category / subCategory / location / workType, kết hợp AND (6.4, 6.4.1)
  {
    const enc = encodeURIComponent;
    await expectSet("S-04", `category=${enc(c0.name)}`, [A, B, E]);
    await expectSet("S-04", `category=${enc(c0.name)}&subCategory=${enc(c0.subCategories[0])}`, [A]);
    await expectSet("S-04", `category=${enc(c1.name)}`, [C, D]);
    await expectSet("S-04", `location=${enc(loc0)}`, [A, C, E]);
    await expectSet("S-04", `workType=Remote`, [B, E]);
    await expectSet("S-04", `category=${enc(c0.name)}&location=${enc(loc0)}&workType=Remote`, [E]);
    await expectSet("S-04", `category=&location=&workType=&experience=&sortBy=`, [A, B, C, D, E]); // rỗng = không lọc
  }
  // S-05 lương: chỉ nhận 6 khoảng; giao nhau (chạm biên không tính) / chỉ Min tính biên dưới / Negotiable luôn hiện; khoảng cuối tính cả biên trên (1.3)
  {
    await expectSet("S-05", `salaryMin=0&salaryMax=${10 * M}`, [D]); // C, E chỉ chạm biên 10tr -> không hiện
    await expectSet("S-05", `salaryMin=${10 * M}&salaryMax=${15 * M}`, [C, E, D]);
    await expectSet("S-05", `salaryMin=${20 * M}&salaryMax=${30 * M}`, [A, B, D]);
    await expectSet("S-05", `salaryMin=${30 * M}&salaryMax=${50 * M}`, [D]); // A 20–30 chỉ chạm biên 30tr
    await expectSet("S-05", `salaryMin=${50 * M}&salaryMax=${1000 * M}`, [D]);
    const top = await get(`/jobs?keyword=${encodeURIComponent(TAG2)}&salaryMin=${50 * M}&salaryMax=${1000 * M}`);
    ck("S-05", top.status === 200 && sameSet(ids(top), [F1ty.jobId, F50.jobId]), `"Trên 50 triệu" phải có Job từ 1 tỷ: [${names(top)}]`);
    const mid = await get(`/jobs?keyword=${encodeURIComponent(TAG2)}&salaryMin=${30 * M}&salaryMax=${50 * M}`);
    ck("S-05", mid.status === 200 && ids(mid).length === 0, `30–50 không được có Job từ 50tr / 1 tỷ: [${names(mid)}]`);
    for (const q of [`salaryMin=${15 * M}&salaryMax=${25 * M}`, `salaryMin=${20 * M}&salaryMax=${20 * M}`, "salaryMin=-5&salaryMax=-1", `salaryMin=${50 * M}&salaryMax=${2000 * M}`]) {
      const r = await search(q);
      ck("S-05", isErr(r, 400, "VALIDATION_ERROR") && "salaryMin" in r.data.errors, `?${q} -> ${errStr(r)}`);
    }
  }
  // S-06 kinh nghiệm: biên dưới tính, biên trên không (1.4.1)
  {
    for (const [exp, want] of [["none", [C]], ["1-3", [B]], ["3-5", [A]], ["5-10", [E]], ["10%2B", [D]]]) await expectSet("S-06", `experience=${exp}`, want);
  }
  // S-07 sort (6.5): newest mặc định; salary_desc A(30) > B(25) > C(15) > E(14) > D(thỏa thuận)
  {
    const n = await search("sortBy=newest");
    ck("S-07", JSON.stringify(ids(n)) === JSON.stringify(NEWEST), `newest [${names(n)}]`);
    const s = await search("sortBy=salary_desc");
    ck("S-07", JSON.stringify(ids(s)) === JSON.stringify([A, B, C, E, D].map((x) => x.jobId)), `salary_desc [${names(s)}] kỳ vọng A,B,C,E,D`);
    const sf = await search(`sortBy=salary_desc&salaryMin=${20 * M}&salaryMax=${30 * M}`);
    ck("S-07", JSON.stringify(ids(sf)) === JSON.stringify([A, B, D].map((x) => x.jobId)), `salary_desc + lọc lương [${names(sf)}]`);
  }
  // S-08 phân trang (6.7): limit=2 qua 3 trang ghép lại đúng thứ tự, không lặp / mất; limit > 30 tự về 30; trang vượt -> rỗng
  {
    const pages = [];
    for (let p = 1; p <= 3; p++) pages.push(await search(`limit=2&page=${p}`));
    ck("S-08", pages.every((x, i) => x.status === 200 && JSON.stringify(x.data.pagination) === JSON.stringify({ totalItems: 5, totalPages: 3, currentPage: i + 1, limit: 2 })), pages.map((x) => JSON.stringify(x.data?.pagination)).join(" "));
    ck("S-08", JSON.stringify(pages.flatMap(ids)) === JSON.stringify(NEWEST), `ghép trang [${pages.map(names).join(" | ")}]`);
    const sp = [];
    for (let p = 1; p <= 3; p++) sp.push(await search(`limit=2&page=${p}&sortBy=salary_desc`));
    ck("S-08", JSON.stringify(sp.flatMap(ids)) === JSON.stringify([A, B, C, E, D].map((x) => x.jobId)), `ghép trang salary_desc [${sp.map(names).join(" | ")}]`);
    const over = await search("page=4&limit=2");
    ck("S-08", over.status === 200 && over.data.items.length === 0 && over.data.pagination.totalPages === 3, errStr(over));
    for (const pg of [999999, 2147483647]) {
      const big = await search(`page=${pg}`);
      ck("S-08", big.status === 200 && big.data.items.length === 0, `page=${pg} -> ${errStr(big)}`);
    }
    const cap = await get("/jobs?limit=100");
    ck("S-08", cap.status === 200 && cap.data.pagination.limit === 30 && cap.data.items.length <= 30, JSON.stringify(cap.data?.pagination));
    const none = await get(`/jobs?keyword=KHONGCO${TS}`);
    ck("S-08", none.status === 200 && JSON.stringify(none.data) === JSON.stringify({ items: [], pagination: { totalItems: 0, totalPages: 0, currentPage: 1, limit: 30 } }), errStr(none));
  }
  // S-09 validation -> 400 VALIDATION_ERROR kèm errors.<field>
  {
    const enc = encodeURIComponent;
    const bad = [
      ["subCategory", `subCategory=${enc(c0.subCategories[0])}`],
      ["subCategory", `category=${enc(c1.name)}&subCategory=${enc(c0.subCategories[0])}`],
      ["category", `category=${enc("Không có thật")}`],
      ["category", `category=${enc(c0.name.toLowerCase())}`],
      ["location", "location=Ha%20Noi"],
      ["workType", "workType=onsite"],
      ["experience", "experience=2-4"],
      ["experience", "experience=10"],
      ["sortBy", "sortBy=deadline"],
      ["sortBy", "sortBy=NEWEST"],
      ["salaryMax", `salaryMin=${10 * M}`],
      ["salaryMin", `salaryMax=${10 * M}`],
      ["salaryMin", `salaryMin=${20 * M}&salaryMax=${10 * M}`],
      ["page", "page=0"],
      ["page", "page=-1"],
      ["limit", "limit=0"],
      ["page", "page=abc"],
      ["limit", "limit=1.5"],
      ["salaryMin", "salaryMin=abc&salaryMax=1"],
    ];
    for (const [key, q] of bad) {
      const r = await get(`/jobs?${q}`);
      ck("S-09", isErr(r, 400, "VALIDATION_ERROR") && r.data.errors && key in r.data.errors, `?${q} -> ${errStr(r)}`);
    }
    const multi = await get("/jobs?page=0&limit=0&sortBy=x&experience=y");
    ck("S-09", isErr(multi, 400, "VALIDATION_ERROR") && ["page", "limit", "sortBy", "experience"].every((k) => k in multi.data.errors), errStr(multi));
  }
  // S-10 public: không cần token, token Finder / Employer / token rác đều 200 và cùng kết quả (6.1)
  {
    const base = await search();
    for (const t of [F1.token, E1.token, "rac.rac.rac"]) {
      const r = await search("", t);
      ck("S-10", r.status === 200 && JSON.stringify(ids(r)) === JSON.stringify(ids(base)), `token=${t.slice(0, 8)} -> ${errStr(r)}`);
    }
    const head = await get(`/jobs?keyword=${kw}&limit=1`);
    ck("S-10", head.status === 200 && head.ct.includes("application/json"), `content-type ${head.ct}`);
  }
  // S-11 Job vừa đóng / vừa sửa phản ánh ngay vào search (không cache)
  {
    await J("PATCH", `/jobs/${B.jobId}/status`, S1.token, { status: "Closed" });
    await expectSet("S-11", "", [A, C, D, E]);
    const put = await J("PUT", `/jobs/${E.jobId}`, S1.token, { ...(await J("GET", `/employer/jobs/${E.jobId}`, S1.token)).data, salaryType: "Range", salaryMin: 40 * M, salaryMax: 45 * M, deadline: addDays(TODAY, 5) });
    ck("S-11", put.status === 200, errStr(put));
    await expectSet("S-11", `salaryMin=${30 * M}&salaryMax=${50 * M}`, [D, E]);
  }
  // S-12 rate limit 60 request/phút/IP (Business 6.1): bắn 70 request cùng lúc -> có 429 TOO_MANY_REQUESTS + Retry-After.
  // Cửa sổ cố định có thể chuyển giữa chừng nên số 200 chỉ chặn trên ở mức 2 cửa sổ
  {
    const res = await Promise.all(Array.from({ length: 70 }, () => J("GET", `/jobs?keyword=${kw}&limit=1`)));
    const ok = res.filter((x) => x.status === 200).length, limited = res.filter((x) => x.status === 429);
    ck("S-12", limited.length >= 1 && ok + limited.length === 70 && ok <= 120, `200=${ok}, 429=${limited.length}, khác=${res.filter((x) => ![200, 429].includes(x.status)).map(errStr).slice(0, 2)}`);
    ck("S-12", limited.every((x) => isErr(x, 429, "TOO_MANY_REQUESTS") && Number(x.headers.get("retry-after")) > 0), errStr(limited[0] || { status: 0 }));
    // các API Job khác không bị chặn chung
    ck("S-12", (await J("GET", `/jobs/${A.jobId}`)).status === 200 && (await J("GET", "/jobs/options")).status === 200, "GET /jobs/:id hoặc /options bị 429 theo");
  }
}

if (isMain(import.meta.url)) await runSuites([{ name, run }]);
