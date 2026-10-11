// ─── Category Grid ──────────────────────────────────────────────────────────
// `count: null` = chưa có API → hiển thị placeholder "---"
export const CATEGORIES = [
  {
    id: 1,
    label: 'Công nghệ thông tin',
    shortLabel: 'IT',
    color: 'bg-blue-50 text-blue-600',
    hoverColor: 'hover:bg-blue-600 hover:text-white',
    icon: 'it',
    count: null,
  },
  {
    id: 2,
    label: 'Marketing & Truyền thông',
    shortLabel: 'Marketing',
    color: 'bg-pink-50 text-pink-600',
    hoverColor: 'hover:bg-blue-600 hover:text-white',
    icon: 'marketing',
    count: null,
  },
  {
    id: 3,
    label: 'Tài chính - Kế toán',
    shortLabel: 'Tài chính',
    color: 'bg-emerald-50 text-emerald-600',
    hoverColor: 'hover:bg-blue-600 hover:text-white',
    icon: 'finance',
    count: null,
  },
  {
    id: 4,
    label: 'Thiết kế & Sáng tạo',
    shortLabel: 'Thiết kế',
    color: 'bg-violet-50 text-violet-600',
    hoverColor: 'hover:bg-blue-600 hover:text-white',
    icon: 'design',
    count: null,
  },
  {
    id: 5,
    label: 'Kỹ thuật - Xây dựng',
    shortLabel: 'Kỹ thuật',
    color: 'bg-orange-50 text-orange-600',
    hoverColor: 'hover:bg-blue-600 hover:text-white',
    icon: 'engineering',
    count: null,
  },
  {
    id: 6,
    label: 'Giáo dục & Đào tạo',
    shortLabel: 'Giáo dục',
    color: 'bg-yellow-50 text-yellow-600',
    hoverColor: 'hover:bg-blue-600 hover:text-white',
    icon: 'education',
    count: null,
  },
  {
    id: 7,
    label: 'Y tế & Dược phẩm',
    shortLabel: 'Y tế',
    color: 'bg-red-50 text-red-500',
    hoverColor: 'hover:bg-blue-600 hover:text-white',
    icon: 'health',
    count: null,
  },
  {
    id: 8,
    label: 'Kinh doanh & Bán hàng',
    shortLabel: 'Bán hàng',
    color: 'bg-teal-50 text-teal-600',
    hoverColor: 'hover:bg-blue-600 hover:text-white',
    icon: 'sales',
    count: null,
  },
]

// ─── Stats Row ───────────────────────────────────────────────────────────────
// `value: null` = chưa có dữ liệu thật → hiển thị "---"
export const STATS = [
  {
    id: 1,
    value: 500,
    suffix: '+',
    label: 'Doanh nghiệp',
    sub: 'Đối tác tuyển dụng',
  },
  {
    id: 2,
    value: 1000,
    suffix: '+',
    label: 'Người dùng',
    sub: 'Ứng viên đang tìm việc',
  },
  {
    id: 3,
    value: 100,
    suffix: '+',
    label: 'Việc làm mới',
    sub: 'Được đăng mỗi ngày',
  },
]

// ─── Company Grid ─────────────────────────────────────────────────────────────
export const COMPANIES = [
  { id: 1,  name: 'FPT Software',     field: 'Công nghệ thông tin',    initials: 'FPT' },
  { id: 2,  name: 'VNG Corporation',  field: 'Game & Công nghệ',        initials: 'VNG' },
  { id: 3,  name: 'Vingroup',         field: 'Tập đoàn đa ngành',       initials: 'VIC' },
  { id: 4,  name: 'MoMo',             field: 'Fintech',                  initials: 'MM'  },
  { id: 5,  name: 'Shopee Vietnam',   field: 'Thương mại điện tử',      initials: 'SPE' },
  { id: 6,  name: 'Tiki',             field: 'Thương mại điện tử',      initials: 'TKI' },
  { id: 7,  name: 'VNPT',             field: 'Viễn thông',               initials: 'VNP' },
  { id: 8,  name: 'Viettel',          field: 'Viễn thông & Công nghệ',  initials: 'VTL' },
  { id: 9,  name: 'Techcombank',      field: 'Ngân hàng',                initials: 'TCB' },
  { id: 10, name: 'VPBank',           field: 'Ngân hàng',                initials: 'VPB' },
  { id: 11, name: 'KMS Technology',   field: 'Phần mềm',                 initials: 'KMS' },
  { id: 12, name: 'Grab Vietnam',     field: 'Super App',                initials: 'GRB' },
]

// ─── Quick search tags (Hero) ─────────────────────────────────────────────────
export const QUICK_TAGS = ['IT', 'Marketing', 'Thiết kế', 'Tài chính', 'Kỹ thuật', 'Bán hàng']
