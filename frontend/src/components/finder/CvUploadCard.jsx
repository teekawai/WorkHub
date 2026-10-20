import { useRef, useState } from "react"
import toast from "react-hot-toast"
import { getProfileMsg, uploadCV } from "../../api/finderProfile"
import ConfirmDialog from "./ConfirmDialog"

const MAX_SIZE = 5 * 1024 * 1024 //BE chỉ nhận ≤ 5MB
const ALLOWED_EXT = [".pdf", ".docx"] //BE không nhận .doc

//"https://res.cloudinary.com/.../cv/My%20CV_abc123.pdf" -> "My CV_abc123.pdf"
const fileNameFromUrl = (url) => {
    try {
        return decodeURIComponent(url.split("?")[0].split("/").pop())
    } catch {
        return "Your CV"
    }
}

const outlineBtn = "w-full rounded-lg border border-[#155DFC] px-4 py-2 text-sm font-medium text-[#155DFC] transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"

//Card "CV for applications": chọn file CV nhà tuyển dụng sẽ thấy khi ứng tuyển.
//Muốn dùng CV tạo từ trang Profile: bấm "Export CV" ở đầu trang để tải PDF về, rồi upload lại chính file đó ở đây.
function CvUploadCard({ cvUrl, onUploaded }) {
    const inputRef = useRef(null)
    const [pendingFile, setPendingFile] = useState(null) //file đang chờ xác nhận thay CV
    const [busy, setBusy] = useState(false)

    //gửi file lên BE rồi cập nhật URL CV trong state của trang
    const uploadOwn = async (file) => {
        setPendingFile(null)
        setBusy(true)
        try {
            const url = await uploadCV(file) //BE trả về URL của file
            onUploaded(url)
            toast.success("Your CV has been uploaded.", { id: "cv-upload" })
        } catch (err) {
            toast.error(getProfileMsg(err), { id: "cv-upload" })
        } finally {
            setBusy(false)
        }
    }

    const handlePick = (e) => {
        const file = e.target.files?.[0]
        e.target.value = "" //cho phép chọn lại đúng file đó lần sau
        if (!file) return

        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
        if (!ALLOWED_EXT.includes(ext)) {
            toast.error("Please choose a PDF or DOCX file.", { id: "cv-upload" })
            return
        }
        if (file.size > MAX_SIZE) {
            toast.error("The file is too large. The maximum size is 5MB.", { id: "cv-upload" })
            return
        }

        if (cvUrl) setPendingFile(file) //đã có CV thì hỏi trước khi thay
        else uploadOwn(file)
    }

    return (
        <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">CV for applications</h2>
            <p className="mt-1 text-sm text-slate-600">This is the CV employers see when you apply for a job.</p>

            <div className="mt-4 rounded-lg bg-slate-50 p-3">
                {cvUrl ? (
                    <>
                        <p className="text-xs font-medium text-slate-500">Current CV</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-900 [overflow-wrap:anywhere]">{fileNameFromUrl(cvUrl)}</p>
                        <a href={cvUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm text-[#155DFC] underline-offset-2 hover:underline">
                            View file
                        </a>
                    </>
                ) : (
                    <p className="text-sm text-slate-600">You haven't chosen a CV yet.</p>
                )}
            </div>

            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-slate-500">Upload a CV</p>

            <div className="mt-2 flex flex-col gap-2">
                <input ref={inputRef} type="file" accept=".pdf,.docx" onChange={handlePick} className="hidden" />
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={outlineBtn}>
                    {busy ? "Uploading…" : "Upload your own CV"}
                </button>
                <p className="text-xs text-slate-500">PDF or DOCX · max 5MB</p>
            </div>

            <p className="mt-4 text-xs text-slate-500">Choosing a new CV replaces your current one.</p>

            <ConfirmDialog
                open={!!pendingFile}
                title="Replace your current CV?"
                message="Do you want to replace your current CV with this file?"
                onYes={() => uploadOwn(pendingFile)}
                onNo={() => setPendingFile(null)}
            />
        </section>
    )
}

export default CvUploadCard
