# WorkHub — Job Finder Platform

## 1. Giới thiệu
- Project full-stack đầu tiên, dạng intern-level, thời gian ~3 tháng
- 2 actor: Job Seeker (Finder) và Employer
- Ưu tiên tốc độ hoàn thành, đơn giản hóa scope thay vì tối ưu hoàn hảo

## 2. Tech Stack
- Backend: ASP.NET Core (net10.0)
- Database: **SQL Server hiện tại → sẽ chuyển sang MySQL** (xem mục Task tiếp theo)
- ORM: Entity Framework Core
- Auth: JWT — có accessToken (TTL ngắn, ~15 phút, lưu localStorage) + refreshToken (TTL dài, ~7 ngày, lưu HttpOnly Cookie), gọi `/api/auth/refresh` để cấp accessToken mới (config đã có sẵn trong `appsettings.json`)
- Password hash: BCrypt.Net-Next
- Frontend: React.js — **chưa tạo, sẽ làm sau**
- File storage: Cloudinary (CloudinaryDotNet SDK) — chưa cài
- Deploy: Vercel

## 3. Cấu trúc DB hiện tại (đã scaffold từ SQL Server)
- 5 bảng: `Users`, `FinderProfile`, `EmployerProfile`, `Job`, `Application`
- Quan hệ 1-1 Users↔FinderProfile / Users↔EmployerProfile dùng Shared Primary Key (userId)
- `Job.Salary` là kiểu **int** (VND không dùng số thập phân, không cần decimal)
- Ghi chú lệch nhẹ so với ERD gốc: Profile có thêm `Email`, `Phone`, `LinkedIn` (Finder) / `TaxCode` (Employer); `NumberOfPosition` thay vì `candidateNumber`

## 4. Chức năng sẽ làm (theo API Design đã chốt)
- `/api/auth`: register, login, logout (accessToken only, không có change-password)
- `/api/finders`: xem/sửa hồ sơ, upload avatar, upload CV
- `/api/employers`: xem/sửa hồ sơ công ty, upload logo, xem tin đã đăng
- `/api/jobs`: CRUD job, tìm kiếm/lọc/phân trang, đổi trạng thái Open/Closed
- `/api/applications`: ứng tuyển, xem danh sách đã ứng tuyển, hủy ứng tuyển, employer duyệt trạng thái

## 5. Task tiếp theo (setup)
1. **Chuyển DB provider từ SQL Server → MySQL**: gỡ `Microsoft.EntityFrameworkCore.SqlServer`, cài `Pomelo.EntityFrameworkCore.MySql`; sửa `WorkHubContext.cs` (`UseSqlServer` → `UseMySql`, bỏ `IsUnicode(false)`/tên constraint kiểu SQL Server); sửa `appsettings.json` connection string
2. Setup JWT authentication trong `Program.cs` (`AddAuthentication`, `AddJwtBearer`, middleware `UseAuthentication`) — config JWT đã có sẵn, chưa được dùng trong `Program.cs`
3. Viết Controllers cho 5 nhóm route theo API Design
4. Cấu hình Cloudinary upload (avatar, logo, CV)
5. Khởi tạo frontend React.js

## 6. Ghi chú thiết kế quan trọng
- Bỏ bảng SavedJobs, lưu skill dạng chuỗi phân cách dấu phẩy — cắt scope có chủ đích
- Pagination áp dụng mọi API trả danh sách (`page`, `limit`, mặc định 1/10)
- Application unique theo cặp (finderId, jobId)
