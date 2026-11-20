//Các số trang hiện trên thanh phân trang: tối đa `size` số liền nhau, trang hiện tại ở giữa khi được
export const pageWindow = (current, total, size = 3) => {
    const count = Math.min(size, total)
    const start = Math.min(Math.max(current - Math.floor(size / 2), 1), total - count + 1)
    return Array.from({ length: Math.max(count, 0) }, (_, index) => start + index)
}
