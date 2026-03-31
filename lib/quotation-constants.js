export const CUSTOM_FURNITURE_CAT = 'Nội thất';

export const PRODUCT_CATS = [
    'Nội thất',           // ★ may đo, không xóa, không copy ảnh lẻ
    'Cửa',
    'Cửa & Khung',
    'Cửa cuốn',
    'Decor',
    'Dịch vụ',
    'Điện - Nước',
    'Điều hòa',
    'Đá & Gạch',
    'Đèn & Chiếu sáng',
    'Đèn LED',
    'Đồ rời',
    'Gỗ công nghiệp',
    'Gỗ tự nhiên',
    'Lan can kính',
    'Phòng thờ',
    'Phụ kiện nội thất',
    'Rèm cửa',
    'Sơn & Phụ kiện',
    'Thiết bị điện',
    'Thiết bị vệ sinh',
    'Vật liệu xây dựng',
];

export const QUOTATION_STATUSES = ['Nháp', 'Gửi KH', 'Xác nhận', 'Hợp đồng', 'Từ chối'];

export const QUOTATION_TYPES = [
    'Thiết kế kiến trúc',
    'Thiết kế nội thất',
    'Thi công thô',
    'Thi công hoàn thiện',
    'Thi công nội thất',
    'Thi công điện nước',
    'Báo giá thiết bị điện',
];

// Preset category tree — shared with product categories
export const PRESET_CATEGORIES = [
    {
        name: 'Vật tư thô & Hoàn thiện cơ bản',
        subcategories: ['Vật liệu xây dựng', 'Đá & Gạch ốp lát', 'Sơn, Keo & Hóa chất'],
    },
    {
        name: 'Đồ gỗ nội thất',
        subcategories: ['Gỗ công nghiệp', 'Nội thất liền tường', 'Nội thất rời (Sản xuất)'],
    },
    {
        name: 'Hệ cửa & Vách',
        subcategories: ['Cửa gỗ', 'Cửa nhôm kính & Vách kính', 'Cửa cuốn & Cửa chống cháy'],
    },
    {
        name: 'Thiết bị & Phụ kiện',
        subcategories: ['Phụ kiện mộc', 'Thiết bị Điện & Chiếu sáng', 'Thiết bị Nước & Vệ sinh', 'Thiết bị bếp & Điều hòa'],
    },
    {
        name: 'Đồ rời & Decor',
        subcategories: ['Sofa & Ghế rời', 'Rèm cửa', 'Đồ Decor & Mỹ thuật'],
    },
    {
        name: 'Dịch vụ',
        subcategories: ['Phí thiết kế', 'Nhân công lắp đặt/Thi công', 'Phí vận chuyển'],
    },
];

export const UNIT_OPTIONS = [
    'm²', 'm³', 'm', 'md', 'cái', 'bộ', 'tấm', 'kg',
    'hộp', 'cuộn', 'lít', 'chiếc', 'phòng', 'mét',
];

export const STATUS_BADGE = {
    'Nháp': 'muted',
    'Gửi KH': 'info',
    'Xác nhận': 'warning',
    'Hợp đồng': 'success',
    'Từ chối': 'danger',
};

export const emptyItem = () => ({
    _key: Date.now() + Math.random(),
    name: '', unit: 'm²', quantity: 1, volume: 0,
    mainMaterial: 0, auxMaterial: 0, labor: 0,
    unitPrice: 0, amount: 0, description: '', image: '',
    length: 0, width: 0, height: 0, subItems: [],
});

export const emptySubcategory = (name = '') => ({
    _key: Date.now() + Math.random(),
    name, image: '', items: [emptyItem()], subtotal: 0,
});

export const emptyMainCategory = (name = '') => ({
    _key: Date.now() + Math.random(),
    name, subcategories: [emptySubcategory()], subtotal: 0,
});

// Keep old emptyCategory for backward compat
export const emptyCategory = emptySubcategory;

export const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
export const fmtCurrency = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(n || 0));
