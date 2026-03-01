export const QUOTATION_STATUSES = ['Nháp', 'Gửi KH', 'Xác nhận', 'Hợp đồng', 'Từ chối'];

export const QUOTATION_TYPES = [
    'Thiết kế kiến trúc',
    'Thiết kế nội thất',
    'Thi công thô',
    'Thi công hoàn thiện',
    'Thi công nội thất',
];

export const UNIT_OPTIONS = [
    'm²', 'm³', 'm', 'cái', 'bộ', 'tấm', 'kg',
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
    name: '', unit: 'm²', quantity: 0,
    mainMaterial: 0, auxMaterial: 0, labor: 0,
    unitPrice: 0, amount: 0, description: '', image: '',
    length: 0, width: 0, height: 0,
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
