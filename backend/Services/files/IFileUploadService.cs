using Microsoft.AspNetCore.Http;
using backend.Common;

namespace backend.Services.files
{
    public interface IFileUploadService
    {
        // isRaw = true cho file không phải ảnh (vd: CV .pdf/.docx) -> dùng RawUploadParams thay vì ImageUploadParams
        Task<FileUploadResult> Upload_CV_AVT(IFormFile file, string folder, string publicId, string[] allowedExtensions, long maxSize, bool isRaw = false);
    }
}
