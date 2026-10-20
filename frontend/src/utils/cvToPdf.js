//Chụp tờ CV (phần tử DOM) thành file PDF khổ A4, trả về File để đưa vào uploadCV().
//Thư viện nạp bằng import() động nên chỉ tải khi người dùng bấm nút, không làm nặng trang.
//Lưu ý: PDF tạo ra là ảnh chụp, chữ không bôi chọn / copy được.

//"Nguyễn Văn A" -> "Nguyen-Van-A" (tên file không dấu, không ký tự lạ)
const toSlug = (name) =>
    (name || "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/gi, "d")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

export async function cvElementToPdfFile(element, fullname) {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")])

    await document.fonts.ready //đợi font Inter nạp xong rồi mới chụp

    const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: "#ffffff" })
    const image = canvas.toDataURL("image/jpeg", 0.92)

    const pdf = new jsPDF({ unit: "pt", format: "a4" })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgH = (canvas.height * pageW) / canvas.width //chiều cao ảnh khi co vừa bề ngang trang

    //CV dài hơn 1 trang thì cắt tiếp sang trang sau
    let heightLeft = imgH
    let position = 0
    pdf.addImage(image, "JPEG", 0, position, pageW, imgH)
    heightLeft -= pageH
    while (heightLeft > 1) {
        position = heightLeft - imgH
        pdf.addPage()
        pdf.addImage(image, "JPEG", 0, position, pageW, imgH)
        heightLeft -= pageH
    }

    const slug = toSlug(fullname)
    const fileName = slug ? `WorkHub-CV-${slug}.pdf` : "WorkHub-CV.pdf"
    return new File([pdf.output("blob")], fileName, { type: "application/pdf" })
}
