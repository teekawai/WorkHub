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

            // ImageUploadParams kế thừa RawUploadParams -> dùng chung biến, chỉ khác loại params khởi tạo
            RawUploadParams uploadParam = isRaw
                ? new RawUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    PublicId = publicId,
                    Overwrite = true,
                    Invalidate = true,
                    Folder = folder
                }
                : new ImageUploadParams
                {
                    File = new FileDescription(file.FileName, stream),
                    PublicId = publicId,
                    Overwrite = true,
                    Invalidate = true,
                    Folder = folder
                };

            var uploadResult = await _cloudinary.UploadAsync(uploadParam);
            if (uploadResult.Error != null)
                return FileUploadResult.Fail("Lưu file không thành công");

            return FileUploadResult.Ok(uploadResult.SecureUrl.ToString());
        }
    }
}
