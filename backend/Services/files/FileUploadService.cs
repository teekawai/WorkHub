using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using backend.Common;

namespace backend.Services.files
{
    public class FileUploadService : IFileUploadService
    {
        private readonly ICloudinary _cloudinary;

        public FileUploadService(ICloudinary cloudinary)
        {
            _cloudinary = cloudinary;
        }
        
        //dùng để upload các file cv hoặc avt
        public async Task<FileUploadResult> Upload_CV_AVT(IFormFile file, string folder, string publicId, string[] allowedExtensions, long maxSize, bool isRaw = false)
        {
            if (file == null || file.Length == 0)
                return FileUploadResult.Fail("Chưa có file!");

            if (file.Length > maxSize)
                return FileUploadResult.Fail("Dung lượng file quá lớn!");

            var extension = Path.GetExtension(file.FileName).ToLower();
            if (!allowedExtensions.Contains(extension))
                return FileUploadResult.Fail("Sai định dạng file");

            using var stream = file.OpenReadStream();

            //tên file gốc có thể chứa tiếng Việt/dấu cách/ký tự lạ -> dùng tên an toàn, PublicId mới là thứ quyết định file trên Cloudinary
            var safeFileName = $"{Guid.NewGuid():N}{extension}";

            // ImageUploadParams kế thừa RawUploadParams -> dùng chung biến, chỉ khác loại params khởi tạo
            RawUploadParams uploadParam = isRaw
                ? new RawUploadParams
                {
                    File = new FileDescription(safeFileName, stream),
                    PublicId = publicId,
                    Overwrite = true,
                    Invalidate = true,
                    Folder = folder
                }
                : new ImageUploadParams
                {
                    File = new FileDescription(safeFileName, stream),
                    PublicId = publicId,
                    Overwrite = true,
                    Invalidate = true,
                    Folder = folder
                };

            var uploadResult = await _cloudinary.UploadAsync(uploadParam);
            if (uploadResult.Error != null)
            {
                Console.WriteLine($"[Cloudinary upload error] {uploadResult.Error.Message}"); //xem ở cửa sổ chạy dotnet
                return FileUploadResult.Fail("Lưu file không thành công, vui lòng thử lại"); // chi tiết lỗi Cloudinary chỉ log ở server
            }

            return FileUploadResult.Ok(uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
        }

        public async Task<FileUploadResult> CopyFromUrlAsync(string url, string folder, string publicId)
        {
            try
            {
                // url lấy từ hồ sơ trong DB (chỉ ghi qua UploadCV), không nhận từ client
                var result = await _cloudinary.UploadAsync(new RawUploadParams
                {
                    File = new FileDescription(url),
                    PublicId = publicId,
                    Overwrite = true,
                    Invalidate = true,
                    Folder = folder
                });
                if (result.Error != null)
                {
                    Console.WriteLine($"[Cloudinary copy error] {result.Error.Message}");
                    return FileUploadResult.Fail("Lưu file không thành công, vui lòng thử lại");
                }
                return FileUploadResult.Ok(result.SecureUrl.ToString(), result.PublicId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Cloudinary copy error] {ex.Message}");
                return FileUploadResult.Fail("Lưu file không thành công, vui lòng thử lại");
            }
        }

        // URL dạng .../{image|raw}/upload/[v123/]{public_id}[.đuôi]; image bỏ đuôi, raw giữ (đuôi thuộc public_id). Không phải URL Cloudinary -> null
        public static string? PublicIdFromUrl(string? url, bool isRaw)
        {
            const string marker = "/upload/";
            var i = url?.IndexOf(marker, StringComparison.Ordinal) ?? -1;
            if (i < 0) return null;
            var path = Uri.UnescapeDataString(url![(i + marker.Length)..]);
            if (System.Text.RegularExpressions.Regex.IsMatch(path, @"^v\d+/")) path = path[(path.IndexOf('/') + 1)..];
            if (!isRaw)
            {
                var dot = path.LastIndexOf('.');
                if (dot > path.LastIndexOf('/')) path = path[..dot];
            }
            return path.Length == 0 ? null : path;
        }

        public Task<bool> DeleteByUrlAsync(string? url, bool isRaw = false)
        {
            var publicId = PublicIdFromUrl(url, isRaw);
            return publicId == null ? Task.FromResult(false) : DeleteFileAsync(publicId, isRaw);
        }

        public async Task<bool> DeleteFileAsync(string publicId, bool isRaw = false)
        {
            try
            {
                var delParams = new DeletionParams(publicId)
                {
                    ResourceType = isRaw ? ResourceType.Raw : ResourceType.Image
                };
                var result = await _cloudinary.DestroyAsync(delParams);
                return result.Result == "ok";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Cloudinary delete error] {ex.Message}");
                return false;
            }
        }
    }
}
