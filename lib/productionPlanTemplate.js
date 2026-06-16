export const PRODUCTION_PLAN_TEMPLATE = [
  {
    key: 'intake',
    name: 'Tiếp nhận đơn hàng',
    steps: ['Bản su', 'Ảnh 3D', 'Ghi chú mã gỗ', 'Thống kê đồ'],
  },
  {
    key: 'material',
    name: 'Đặt nguyên vật liệu',
    steps: [
      'Thời gian bóc NVL',
      'Đặt gỗ',
      'Đặt cánh kính/tranh trúc chỉ/vân đá',
      'Đặt NVL phụ (nẹp, phụ kiện...)',
    ],
  },
  {
    key: 'production',
    name: 'Sản xuất',
    steps: ['Kiểm tra mặt bằng, đo hiện trạng', 'Cắt CNC', 'Ráp sản phẩm', 'Đóng gói sản phẩm'],
  },
  {
    key: 'install',
    name: 'Lắp đặt',
    steps: [
      'Kiểm tra mặt bằng',
      'BC thời gian lắp đặt cho KD + chủ nhà',
      'Thời gian hoàn thiện từng tầng',
    ],
  },
  {
    key: 'complete',
    name: 'Hoàn thiện',
    steps: ['Kiểm tra nội bộ', 'Nghiệm thu khách hàng'],
  },
];
