import { useEffect, useState } from "react"
import { getJobOptions, getJobErrorMsg } from "../api/job"

//cache promise ở mức module: cả trang (Hero, ô ngành, Tìm việc...) dùng chung 1 request; lỗi thì xóa cache để reload gọi lại
let optionsPromise = null
const loadOptions = () => {
    if (!optionsPromise) {
        optionsPromise = getJobOptions().catch((err) => {
            optionsPromise = null
            throw err
        })
    }
    return optionsPromise
}

//Danh sách Category/Location/WorkType chỉ có ở BE, FE không giữ bản sao (CodingRules)
function useJobOptions() {
    const [options, setOptions] = useState(null)
    const [errorMsg, setErrorMsg] = useState("")
    const [reloadKey, setReloadKey] = useState(0) //đổi số này để effect nạp lại

    useEffect(() => {
        let cancelled = false //tránh setState sau khi gỡ component
        loadOptions()
            .then((data) => !cancelled && setOptions(data))
            .catch((err) => !cancelled && setErrorMsg(getJobErrorMsg(err)))
        return () => {
            cancelled = true
        }
    }, [reloadKey])

    const reload = () => {
        setErrorMsg("")
        setReloadKey((key) => key + 1)
    }

    return { options, loading: !options && !errorMsg, errorMsg, reload }
}

export default useJobOptions
