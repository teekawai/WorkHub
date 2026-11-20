import useEmployerProfile from "../../hooks/useEmployerProfile"
import Button from "../../components/shared/Button"
import ConfirmDialog from "../../components/shared/ConfirmDialog"
import CompanyHeaderCard from "../../components/employer/profile/CompanyHeaderCard"
import CompanyDetailsCard from "../../components/employer/profile/CompanyDetailsCard"
import OperationsLocationCard from "../../components/employer/profile/OperationsLocationCard"
import VerifyCompanyWidget from "../../components/employer/profile/VerifyCompanyWidget"
import CompanyProfileForm from "../../components/employer/profile/CompanyProfileForm"

//Trang chỉ điều phối: gọi hook, chọn trạng thái để render — không gọi API trực tiếp, không chứa logic HTTP.
//4 trạng thái của hook: loading / empty (chưa có hồ sơ) / ready / error. Có thêm isEditing để chuyển
//giữa 3 Card (xem) và CompanyProfileForm (sửa) — đúng pattern inline-edit của FinderProfile.jsx.
function EmployerProfile() {
    const {
        profile,
        status,
        errorMsg,
        retry,
        isEditing,
        draft,
        errors,
        saving,
        logoBusy,
        logoError,
        confirm,
        startEdit,
        askCancel,
        discardEdit,
        handleChange,
        askSave,
        doSave,
        setConfirm,
        handleLogoPick,
    } = useEmployerProfile()

    //có nội dung để hiện (3 Card hoặc Form) khi đã load xong (ready), hoặc khi đang tạo hồ sơ mới (empty + isEditing)
    const showContent = status === "ready" || (status === "empty" && isEditing)

    return (
        <div className="mx-auto max-w-[900px]">
            <header className="mb-6">
                <p className="text-xs font-medium uppercase tracking-wider text-blue-600">Hồ sơ</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Hồ sơ công ty</h1>
                <p className="mt-2 text-base text-slate-600">Cách ứng viên nhìn thấy công ty của bạn khi bạn đăng tin tuyển dụng.</p>
            </header>

            {status === "loading" && (
                <div role="status" className="animate-pulse space-y-4 rounded-md bg-white p-8 ring-1 ring-slate-200">
                    <div className="h-8 w-1/2 rounded bg-slate-200" />
                    <div className="h-4 w-full rounded bg-slate-200" />
                    <div className="h-4 w-5/6 rounded bg-slate-200" />
                    <div className="h-4 w-2/3 rounded bg-slate-200" />
                    <span className="sr-only">Đang tải hồ sơ công ty của bạn…</span>
                </div>
            )}

            {status === "error" && (
                <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-5">
                    <p className="text-sm font-medium text-red-800">Không thể tải hồ sơ công ty của bạn</p>
                    <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
                    <button
                        type="button"
                        onClick={retry}
                        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {status === "empty" && !isEditing && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                    <h2 className="text-lg font-semibold text-slate-900">Bạn chưa thiết lập hồ sơ công ty</h2>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Thêm thông tin công ty để ứng viên biết họ đang ứng tuyển vào đâu.</p>
                    <Button variant="primary" onClick={startEdit} className="mt-6">
                        Tạo hồ sơ của bạn
                    </Button>
                </div>
            )}

            {showContent && (
                <div className="flex flex-col gap-6">
                    {isEditing ? (
                        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
                            <CompanyProfileForm
                                profile={profile}
                                draft={draft}
                                errors={errors}
                                onChange={handleChange}
                                logo={{ canChange: true, busy: logoBusy, error: logoError, onPick: handleLogoPick }}
                            />

                            <div className="mt-8 flex justify-end gap-2 border-t border-slate-100 pt-6">
                                <Button variant="secondary" onClick={askCancel} disabled={saving}>
                                    Hủy
                                </Button>
                                <Button variant="primary" onClick={askSave} disabled={saving}>
                                    {saving ? "Đang lưu…" : "Lưu thay đổi"}
                                </Button>
                            </div>
                        </section>
                    ) : (
                        <>
                            <CompanyHeaderCard profile={profile} onEdit={startEdit} isEditing={isEditing} />
                            <VerifyCompanyWidget profile={profile} />
                            <div className="grid gap-6 sm:grid-cols-2">
                                <CompanyDetailsCard profile={profile} />
                                <OperationsLocationCard profile={profile} />
                            </div>
                        </>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={confirm === "save"}
                title="Lưu thay đổi?"
                message="Bạn có muốn lưu các thay đổi của hồ sơ công ty không?"
                onYes={doSave}
                onNo={() => setConfirm(null)}
            />
            <ConfirmDialog
                open={confirm === "cancel"}
                title="Hủy thay đổi?"
                message="Bạn có muốn hủy các thay đổi không? Thao tác này không thể hoàn tác."
                onYes={discardEdit}
                onNo={() => setConfirm(null)}
            />
        </div>
    )
}

export default EmployerProfile
