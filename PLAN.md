# WorkHub — Kế hoạch triển khai (90h)

## Current Task
- Module 1 đã xong TOÀN BỘ (BE + FE, kể cả response interceptor tự refresh token). Tiếp theo: FE Home page (Finder/Employer) — sẽ gắn ProtectedRoute + Navbar vào Layout chung tại đây, sau đó chuyển sang Module 2 (Profile).

## Lưu ý
- Xong task nào thì gạch ngang task đó (dùng `~~text~~` trong markdown) — không xóa, để tracking tiến độ
- Số giờ là ước lượng, có thể lệch — chỉnh lại nếu thực tế khác nhiều
- Đi theo module dọc: mỗi module làm xong Backend rồi làm luôn Frontend tương ứng, không dồn hết BE rồi mới sang FE

## Module 0 — Setup nền tảng (~8h)
- [x] ~~Chuyển DB SQL Server → MySQL — 3h~~
- [x] ~~Setup JWT trong Program.cs — 3h~~
- [x] ~~Khởi tạo React project, routing, cấu trúc thư mục — 2h~~

## Module 1 — Auth (~15h)
- [x] ~~BE: AuthController — Register — 1.5h~~
- [x] ~~BE: Test Register API (Postman) — 0.5h~~
- [x] ~~BE: JwtTokenService (tạo access + refresh token) — 1h~~
- [x] ~~BE: AuthController — Login — 1.5h~~
- [x] ~~BE: Test Login API (Postman) — 0.5h~~
- [x] ~~BE: AuthController — Refresh (đọc refreshToken từ cookie, cấp accessToken mới) — 1h~~
- [x] ~~BE: Test Refresh API (Postman) — 0.5h~~
- [x] ~~BE: AuthController — Logout — 0.5h~~
- [x] ~~BE: Middleware kiểm tra role (Finder/Employer) — 3h~~ (không cần viết middleware riêng, dùng [Authorize(Roles="...")] có sẵn của ASP.NET Core dựa trên claim ClaimTypes.Role đã có trong token. Lưu ý: role lưu DB dạng chữ thường ("finder"/"employer") — khi gắn attribute phải viết đúng chữ thường. Sẽ gắn attribute vào từng controller khi viết đến.)
- [x] ~~FE: Trang Login/Register — 4h~~ (UI + logic + validate + navigate sau submit đã xong)
- [x] ~~FE: Lưu accessToken, gọi API kèm Authorization header — 2h~~ (axios instance `instance.js` + request interceptor gắn Bearer token tự động — auth.js đã chuyển qua dùng instance này)
- [x] ~~FE: Layout chung (Navbar theo role, route bảo vệ) — 1h~~ (NavBar.jsx xong: hiện theo role, dropdown Chào + Hồ sơ + Đăng xuất; ProtectedRoute.jsx code xong nhưng CHƯA gắn vào route nào — sẽ gắn khi làm Home/trang cần login)
- [x] ~~FE: Response interceptor tự gọi /auth/refresh khi 401, retry request cũ — 1.5h~~ (instance.js: bắt 401 → gọi refreshToken() → cập nhật accessToken vào currentUser + localStorage → gắn lại header cho error.config → retry đúng request cũ qua instance(error.config); có cờ _retry chặn lặp vô hạn; refresh fail → xóa currentUser + redirect /login)
- [ ] FE: Trang Home Finder + Employer, gắn Navbar + ProtectedRoute vào Layout chung, thêm route thật trong App.jsx (/finder/home, /employer/home) — 2h (task mới, chưa có trong plan gốc — cần làm trước khi qua Module 2 vì Navbar/ProtectedRoute đang code sẵn nhưng chưa có trang nào dùng thật)

## Module 2 — Profile (~15h)
- [ ] BE: FinderController + EmployerController (GET/PUT /me) — 5h
- [ ] BE: Setup Cloudinary, upload avatar/logo/CV — 5h
- [ ] BE: Test profile APIs — 1h
- [ ] FE: Trang Profile Finder/Employer (xem + sửa) — 3h
- [ ] FE: Upload avatar/logo/CV — 1h

## Module 3 — Job (~22h)
- [ ] BE: JobController — POST, GET list (filter/sort/pagination), GET/:id — 6h
- [ ] BE: PUT/:id, DELETE/:id, PATCH /:id/status — 4h
- [ ] BE: GET /employers/my-jobs — 1h
- [ ] BE: Test job APIs — 1h
- [ ] FE: Trang danh sách job (search/filter/pagination) — 4h
- [ ] FE: Trang chi tiết job — 2h
- [ ] FE: Trang tạo/sửa job (Employer) — 3h
- [ ] FE: Trang my-jobs (Employer) — 1h

## Module 4 — Application (~19h)
- [ ] BE: POST /jobs/:id/applications — 3h
- [ ] BE: GET /finders/me/applications, DELETE /:id — 3h
- [ ] BE: GET /jobs/:id/applications, PATCH /:id/status — 3h
- [ ] BE: Test application APIs — 1h
- [ ] FE: Nút ứng tuyển + trang đã ứng tuyển (Finder) — 4h
- [ ] FE: Trang quản lý ứng viên (Employer) — 4h
- [ ] FE: Hủy ứng tuyển, đổi trạng thái — 1h

## Module 5 — Hoàn thiện & Deploy (~11h)
- [ ] Test tổng thể luồng Finder + Employer — 4h
- [ ] Sửa bug, polish UI — 4h
- [ ] Deploy Vercel (FE + BE) — 3h
