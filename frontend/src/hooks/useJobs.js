import { useCallback, useEffect, useRef, useState } from "react"
import axios from "axios"
import { useSearchParams } from "react-router-dom"
import { searchJobs, getJobErrorMsg } from "../api/job"
import { buildSearchParams, parseSearchQuery, toApiParams } from "../utils/jobSearch"

const DEBOUNCE_MS = 300

//Hook trang Tìm việc. URL query là nguồn sự thật của bộ lọc (F5 / Back / Hero điều hướng đều giữ được).
//options = /jobs/options (lọc bỏ giá trị cũ trong URL); optionsReady = đã có kết quả (thành công hoặc lỗi) -> chờ rồi mới tải.
//status: loading | ready | error. Khi 429: giữ kết quả cũ, status vẫn ready, rateLimitedSec = số giây chờ (hoặc 0 nếu thiếu header).
function useJobs({ options = null, optionsReady = true } = {}) {
    const [searchParams, setSearchParams] = useSearchParams()
    const query = searchParams.toString()
    const filters = parseSearchQuery(searchParams, options)

    const [items, setItems] = useState([])
    const [pagination, setPagination] = useState(null)
    const [outcome, setOutcome] = useState({ key: null, status: "loading", errorMsg: "" }) //kết quả của lần tải mang `key`
    const [rateLimitedSec, setRateLimitedSec] = useState(null) //null = không bị 429
    const [reloadKey, setReloadKey] = useState(0)

    //ô keyword có state riêng để gõ mượt; đồng bộ lại khi URL đổi từ ngoài (derived state, không dùng effect)
    const [keywordInput, setKeywordInput] = useState(filters.keyword)
    const [seenKeyword, setSeenKeyword] = useState(filters.keyword)
    if (seenKeyword !== filters.keyword) {
        setSeenKeyword(filters.keyword)
        if (keywordInput.trim() !== filters.keyword) setKeywordInput(filters.keyword)
    }

    const timer = useRef(null)
    useEffect(() => () => clearTimeout(timer.current), [])
    useEffect(() => () => clearTimeout(timer.current), [filters.keyword]) //URL đổi keyword từ ngoài (Back...) -> bỏ lần debounce chờ

    //đổi bộ lọc: luôn về page 1; đổi/bỏ ngành thì bỏ chuyên ngành. Dùng dạng hàm để không bị closure cũ khi debounce.
    const apply = useCallback((patch, replace = false) => {
        setSearchParams((prev) => {
            const current = parseSearchQuery(prev, options)
            if ("keyword" in patch && patch.keyword === current.keyword) return prev //không đổi -> giữ nguyên trang
            const next = { ...current, page: 1, ...patch }
            if ("category" in patch && patch.category !== current.category && !("subCategory" in patch)) next.subCategory = ""
            return buildSearchParams(next)
        }, { replace })
    }, [setSearchParams, options])

    //thao tác khác (lọc, sort, trang, xóa lọc) hủy lần gõ keyword đang chờ, ô keyword trả về giá trị trên URL
    const cancelTyping = () => {
        clearTimeout(timer.current)
        setKeywordInput(filters.keyword)
    }
    const update = (patch) => {
        cancelTyping()
        apply(patch)
    }
    const setPage = (page) => update({ page })
    //xóa mọi bộ lọc, giữ keyword + sortBy
    const clearFilters = () => {
        cancelTyping()
        setSearchParams(buildSearchParams({ keyword: filters.keyword, sortBy: filters.sortBy }))
    }

    const setKeyword = (value) => {
        setKeywordInput(value)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => apply({ keyword: value.trim() }, true), DEBOUNCE_MS)
    }

    const reload = () => setReloadKey((key) => key + 1)
    const requestKey = `${query}#${reloadKey}`
    const status = outcome.key === requestKey ? outcome.status : "loading" //chưa có kết quả cho URL hiện tại = đang tải

    useEffect(() => {
        if (!optionsReady) return //chờ options để lọc giá trị cũ trong URL trước khi gọi BE
        const controller = new AbortController()
        searchJobs(toApiParams(parseSearchQuery(new URLSearchParams(query), options)), controller.signal)
            .then((data) => {
                setItems(data.items)
                setPagination(data.pagination)
                setRateLimitedSec(null)
                setOutcome({ key: requestKey, status: "ready", errorMsg: "" })
            })
            .catch((err) => {
                if (axios.isCancel(err)) return //request cũ bị huỷ: không phải lỗi
                if (err.response?.status === 429) {
                    setRateLimitedSec(Number.parseInt(err.response.headers?.["retry-after"], 10) || 0)
                    setOutcome({ key: requestKey, status: "ready", errorMsg: "" }) //giữ kết quả cũ (Figma 10.1.20)
                    return
                }
                setOutcome({ key: requestKey, status: "error", errorMsg: getJobErrorMsg(err) })
            })
        return () => controller.abort()
    }, [query, requestKey, options, optionsReady])

    return {
        filters, keywordInput, setKeyword, update, clearFilters, setPage,
        items, pagination, status, errorMsg: outcome.errorMsg, rateLimitedSec, reload,
    }
}

export default useJobs
