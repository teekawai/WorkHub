using Microsoft.AspNetCore.Http;
using backend.Common;

namespace backend.Services.files
{
    public interface IFileUploadService
    {
        // isRaw = true cho file không phải ảnh (vd: CV .pdf/.docx) -> dùng RawUploadParams thay vì ImageUploadParams
        Task<FileUploadResult> Upload_CV_AVT(IFormFile file, string folder, string publicId, string[] allowedExtensions, long maxSize, bool isRaw = false);
        // copy file raw từ URL Cloudinary có sẵn (CV hồ sơ) thành file riêng; lỗi Cloudinary -> Fail, không ném
        Task<FileUploadResult> CopyFromUrlAsync(string url, string folder, string publicId);
        Task<bool> DeleteFileAsync(string publicId, bool isRaw = false);
        // xóa file theo URL đã lưu trong DB (tách public_id từ URL); URL rỗng / không phải Cloudinary -> false, không làm gì
        Task<bool> DeleteByUrlAsync(string? url, bool isRaw = false);
    }
}
