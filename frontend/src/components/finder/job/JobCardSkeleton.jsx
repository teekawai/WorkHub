// Skeleton đúng hình JobCard (cùng h-[168px]) để lúc tải không nhảy bố cục
function JobCardSkeleton() {
    return (
        <div aria-hidden="true" className="flex h-[168px] animate-pulse flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="size-12 shrink-0 rounded-lg bg-slate-200" />
                <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 w-3/4 rounded bg-slate-200" />
                    <div className="h-3.5 w-1/2 rounded bg-slate-200" />
                </div>
            </div>
            <div className="h-3 w-2/3 rounded bg-slate-200" />
            <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="h-9 w-24 rounded-lg bg-slate-200" />
            </div>
        </div>
    )
}

export default JobCardSkeleton
