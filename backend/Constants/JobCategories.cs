using System.Collections.Generic;

namespace backend.Constants
{
    /// <summary>
    /// Danh sách Category (cha) -> SubCategory (con) cố định cho Job.
    /// Nguồn: PLAN_Job_Categories.md — PHẢI khớp y hệt với src/constants/jobCategories.js bên frontend.
    /// Dùng để validate Category + SubCategory trong JobService (SubCategory phải thuộc đúng Category đã chọn).
    /// </summary>
    public static class JobCategories
    {
        public static readonly Dictionary<string, List<string>> Map = new()
        {
            ["Công nghệ thông tin (IT)"] = new List<string>
            {
                "Phát triển phần mềm (Software Development)",
                "Kiểm thử phần mềm (Software Testing / QA)",
                "Phát triển ứng dụng di động (Mobile Development)",
                "Phát triển Web",
                "Trí tuệ nhân tạo và Machine Learning",
                "Khoa học dữ liệu (Data Science)",
                "Phân tích dữ liệu (Data Analytics)",
                "Kỹ thuật dữ liệu (Data Engineering)",
                "An toàn thông tin và bảo mật (Cybersecurity)",
                "DevOps và Cloud Computing",
                "Quản trị hệ thống và mạng (System & Network Administration)",
                "Quản trị cơ sở dữ liệu (Database Administration)",
                "IT Support và Helpdesk",
                "Blockchain và Web3",
                "Game Development"
            },
            ["Kỹ thuật - Công nghệ"] = new List<string>
            {
                "Kỹ thuật điện",
                "Kỹ thuật điện tử",
                "Kỹ thuật tự động hóa",
                "Kỹ thuật điều khiển",
                "Kỹ thuật viễn thông",
                "Kỹ thuật nhiệt - lạnh",
                "Kỹ thuật công nghiệp",
                "Kỹ thuật vật liệu",
                "Kỹ thuật bán dẫn",
                "Kỹ thuật robot",
                "Kỹ thuật bảo trì và bảo dưỡng"
            },
            ["Kế toán - Kiểm toán"] = new List<string>
            {
                "Kế toán tổng hợp",
                "Kế toán thuế",
                "Kế toán nội bộ",
                "Kế toán công nợ",
                "Kế toán kho",
                "Kế toán tài chính",
                "Kiểm toán nội bộ",
                "Kiểm toán độc lập",
                "Kế toán quản trị",
                "Kiểm soát tài chính"
            },
            ["Tài chính - Ngân hàng - Bảo hiểm"] = new List<string>
            {
                "Tài chính doanh nghiệp",
                "Phân tích tài chính",
                "Ngân hàng",
                "Tín dụng",
                "Quan hệ khách hàng ngân hàng",
                "Đầu tư và chứng khoán",
                "Quản lý tài sản",
                "Bảo hiểm nhân thọ",
                "Bảo hiểm phi nhân thọ",
                "Quản trị rủi ro",
                "Fintech"
            },
            ["Kinh doanh - Bán hàng"] = new List<string>
            {
                "Nhân viên kinh doanh (Sales)",
                "Phát triển kinh doanh (Business Development)",
                "Tư vấn bán hàng",
                "Bán hàng doanh nghiệp (B2B Sales)",
                "Bán hàng cá nhân (B2C Sales)",
                "Quản lý kinh doanh",
                "Quản lý khách hàng (Account Management)",
                "Chăm sóc đại lý và nhà phân phối",
                "Kinh doanh quốc tế",
                "Sales Operations"
            },
            ["Marketing - Truyền thông - Quảng cáo"] = new List<string>
            {
                "Digital Marketing",
                "Content Marketing",
                "SEO",
                "SEM / PPC",
                "Social Media Marketing",
                "Performance Marketing",
                "Email Marketing",
                "Affiliate Marketing",
                "Brand Marketing",
                "Trade Marketing",
                "PR và quan hệ công chúng",
                "Marketing Research",
                "Event Marketing",
                "Influencer Marketing"
            },
            ["Nhân sự - Tuyển dụng"] = new List<string>
            {
                "Tuyển dụng (Recruitment)",
                "Đào tạo và phát triển nhân sự (L&D)",
                "Quản lý tiền lương và phúc lợi (C&B)",
                "Quan hệ lao động",
                "Quản trị nhân sự (HRM)",
                "HR Business Partner",
                "Quản lý hiệu suất (Performance Management)",
                "Employer Branding",
                "Hành chính nhân sự",
                "Hoạch định nguồn nhân lực"
            },
            ["Hành chính - Văn phòng"] = new List<string>
            {
                "Hành chính văn phòng",
                "Trợ lý giám đốc",
                "Thư ký",
                "Nhập liệu (Data Entry)",
                "Quản lý hồ sơ và tài liệu",
                "Lễ tân văn phòng",
                "Điều phối viên",
                "Quản lý văn phòng",
                "Nhân viên tổng vụ",
                "Hỗ trợ vận hành văn phòng"
            },
            ["Giáo dục - Đào tạo"] = new List<string>
            {
                "Giáo viên mầm non",
                "Giáo viên tiểu học",
                "Giáo viên trung học",
                "Giảng viên đại học",
                "Giáo viên ngoại ngữ",
                "Giáo viên dạy nghề",
                "Gia sư",
                "Đào tạo doanh nghiệp",
                "Thiết kế chương trình đào tạo",
                "Tư vấn giáo dục",
                "Quản lý giáo dục",
                "EdTech"
            },
            ["Y tế - Dược phẩm - Chăm sóc sức khỏe"] = new List<string>
            {
                "Bác sĩ",
                "Điều dưỡng",
                "Dược sĩ",
                "Kỹ thuật viên xét nghiệm",
                "Kỹ thuật viên chẩn đoán hình ảnh",
                "Y tế dự phòng",
                "Dinh dưỡng",
                "Vật lý trị liệu và phục hồi chức năng",
                "Quản lý bệnh viện",
                "Kinh doanh dược phẩm",
                "Nghiên cứu và phát triển dược phẩm",
                "Thiết bị y tế"
            },
            ["Sản xuất - Vận hành"] = new List<string>
            {
                "Quản lý sản xuất",
                "Giám sát sản xuất",
                "Công nhân sản xuất",
                "Vận hành máy móc",
                "Quản lý chất lượng (QC)",
                "Đảm bảo chất lượng (QA)",
                "Cải tiến quy trình (Continuous Improvement)",
                "Hoạch định sản xuất",
                "Bảo trì nhà máy",
                "Quản lý chuỗi cung ứng",
                "Lean Manufacturing"
            },
            ["Cơ khí - Chế tạo"] = new List<string>
            {
                "Cơ khí chế tạo máy",
                "Thiết kế cơ khí",
                "Gia công CNC",
                "Hàn và gia công kim loại",
                "Kỹ thuật khuôn mẫu",
                "Cơ điện tử",
                "Kỹ thuật ô tô",
                "Bảo trì cơ khí",
                "Lắp ráp cơ khí",
                "Kiểm định cơ khí"
            },
            ["Xây dựng - Kiến trúc - Nội thất"] = new List<string>
            {
                "Kỹ thuật xây dựng",
                "Giám sát công trình",
                "Thiết kế kiến trúc",
                "Thiết kế nội thất",
                "Thiết kế kết cấu",
                "Kỹ thuật MEP",
                "Dự toán xây dựng (QS)",
                "Quản lý dự án xây dựng",
                "Thi công công trình",
                "Trắc địa",
                "Thiết kế cảnh quan",
                "BIM"
            },
            ["Bất động sản"] = new List<string>
            {
                "Môi giới bất động sản",
                "Tư vấn bất động sản",
                "Quản lý dự án bất động sản",
                "Phát triển dự án",
                "Định giá bất động sản",
                "Quản lý vận hành tòa nhà",
                "Quản lý bất động sản",
                "Đầu tư bất động sản",
                "Cho thuê bất động sản",
                "Marketing bất động sản"
            },
            ["Logistics - Xuất nhập khẩu"] = new List<string>
            {
                "Quản lý logistics",
                "Xuất nhập khẩu",
                "Khai báo hải quan",
                "Chứng từ xuất nhập khẩu",
                "Quản lý kho",
                "Điều phối vận tải",
                "Quản lý chuỗi cung ứng (Supply Chain)",
                "Mua hàng (Purchasing)",
                "Thu mua quốc tế",
                "Forwarding",
                "Procurement",
                "Inventory Management"
            },
            ["Vận tải - Giao nhận"] = new List<string>
            {
                "Tài xế ô tô",
                "Tài xế xe tải",
                "Tài xế xe khách",
                "Nhân viên giao hàng",
                "Nhân viên chuyển phát",
                "Điều phối giao hàng",
                "Quản lý đội xe",
                "Vận hành vận tải",
                "Lái xe nâng",
                "Vận hành phương tiện chuyên dụng"
            },
            ["Nhà hàng - Khách sạn - Du lịch"] = new List<string>
            {
                "Lễ tân khách sạn",
                "Quản lý khách sạn",
                "Nghiệp vụ buồng phòng",
                "Nhà hàng",
                "Phục vụ bàn",
                "Đầu bếp",
                "Pha chế (Bartender / Barista)",
                "Quản lý nhà hàng",
                "Hướng dẫn viên du lịch",
                "Điều hành tour",
                "Đại lý du lịch",
                "Quản lý sự kiện và hội nghị"
            },
            ["Thương mại điện tử (E-commerce)"] = new List<string>
            {
                "Quản lý sàn thương mại điện tử",
                "Vận hành gian hàng",
                "Quản lý sản phẩm",
                "Quản lý đơn hàng",
                "E-commerce Marketing",
                "Livestream bán hàng",
                "Quản lý nội dung sản phẩm",
                "Phân tích dữ liệu thương mại điện tử",
                "Quản lý sàn Shopee / TikTok Shop / Lazada",
                "Phát triển kinh doanh thương mại điện tử"
            },
            ["Thiết kế - Mỹ thuật - Sáng tạo"] = new List<string>
            {
                "Graphic Design",
                "UI/UX Design",
                "Product Design",
                "Web Design",
                "Motion Graphics",
                "2D Design",
                "3D Design",
                "Illustration",
                "Thiết kế bao bì",
                "Thiết kế thời trang",
                "Art Direction",
                "Video Editing"
            },
            ["Báo chí - Biên tập - Nội dung"] = new List<string>
            {
                "Báo chí",
                "Biên tập viên",
                "Content Writer",
                "Copywriter",
                "Technical Writer",
                "Biên kịch",
                "Biên dịch",
                "Phiên dịch",
                "Sản xuất nội dung số",
                "Quản lý nội dung",
                "Phóng viên",
                "Sản xuất Podcast"
            },
            ["Pháp lý - Luật"] = new List<string>
            {
                "Luật doanh nghiệp",
                "Pháp chế doanh nghiệp",
                "Luật thương mại",
                "Luật lao động",
                "Luật dân sự",
                "Luật sở hữu trí tuệ",
                "Tư vấn pháp lý",
                "Luật sư tranh tụng",
                "Công chứng",
                "Tuân thủ pháp luật (Compliance)"
            },
            ["Nông nghiệp - Lâm nghiệp - Thủy sản"] = new List<string>
            {
                "Trồng trọt",
                "Chăn nuôi",
                "Thú y",
                "Nuôi trồng thủy sản",
                "Khai thác thủy sản",
                "Lâm nghiệp",
                "Công nghệ sinh học nông nghiệp",
                "Kỹ thuật nông nghiệp",
                "Quản lý trang trại",
                "Chế biến nông sản",
                "Kiểm định chất lượng nông sản"
            },
            ["Môi trường - Năng lượng"] = new List<string>
            {
                "Kỹ thuật môi trường",
                "Quản lý môi trường",
                "Xử lý nước và nước thải",
                "Quản lý chất thải",
                "Đánh giá tác động môi trường",
                "Năng lượng tái tạo",
                "Điện mặt trời",
                "Điện gió",
                "Kỹ thuật năng lượng",
                "An toàn và sức khỏe nghề nghiệp (HSE)",
                "ESG và phát triển bền vững"
            },
            ["Dịch vụ khách hàng - Chăm sóc khách hàng"] = new List<string>
            {
                "Customer Service",
                "Customer Support",
                "Call Center",
                "Telesales",
                "Chăm sóc khách hàng trực tuyến",
                "Hỗ trợ kỹ thuật khách hàng",
                "Quản lý trải nghiệm khách hàng (CX)",
                "Quản lý quan hệ khách hàng (CRM)",
                "Customer Success",
                "Giải quyết khiếu nại"
            }
        };

        /// <summary>
        /// Kiểm tra SubCategory có thuộc đúng Category đã chọn không.
        /// </summary>
        public static bool IsValid(string category, string? subCategory)
        {
            if (!Map.TryGetValue(category, out var subs))
            {
                return false;
            }
            if (string.IsNullOrEmpty(subCategory))
            {
                return true; // SubCategory optional theo rule hiện tại — tự siết lại nếu JobService muốn bắt buộc
            }
            return subs.Contains(subCategory);
        }
    }
}
