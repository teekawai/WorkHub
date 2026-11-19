// Dòng nhỏ khi /jobs/options lỗi: lọc theo ngành đang bị khóa, cho thử tải lại
function OptionsRetry({ onRetry, className = 'text-gray-500' }) {
  return (
    <p role="alert" className={`text-xs ${className}`}>
      Không tải được danh sách ngành nghề.{' '}
      <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
        Thử lại
      </button>
    </p>
  )
}

export default OptionsRetry
