# HomeERP — Hệ thống giao diện

Tài liệu này mô tả bộ giao diện dùng chung của HomeERP (Công ty Kiến Trúc Đô Thị SCT).
Mục tiêu: mọi trang có cùng khung bố cục, cùng màu trạng thái, cùng kiểu nút/ô nhập,
và **không trang nào tự vá CSS riêng**.

---

## 1. Ba lớp của hệ thống

| Lớp | File | Vai trò |
|---|---|---|
| Design token | `app/styles/tokens.css` | Nguồn duy nhất của màu, khoảng cách, bo góc, bóng đổ, typography |
| Component CSS | `app/styles/components.css` | Mọi class `ui-*` dùng chung |
| Component React | `components/ui/*` | Bọc CSS trên thành API dùng trong trang |

`app/globals.css` import cả ba ở đầu file, rồi chứa CSS của layout (AppShell, Sidebar,
Header) và phần CSS cũ theo nghiệp vụ.

> **Quy tắc số 1:** không hardcode mã màu trong component. Luôn dùng `var(--color-…)`.

---

## 2. Màu sắc

Cam SCT chỉ là **điểm nhấn** — nút hành động chính, mục menu đang chọn, focus ring.
Không phủ cam lên nền lớn.

```
--color-primary-600  #F97316   nút chính, mục menu đang chọn
--color-primary-700  #EA580C   trạng thái hover, chữ nhấn
--color-primary-100  #FFEDD5   nền badge
--color-primary-50   #FFF7ED   nền mục menu đang chọn

--color-bg           #F6F7F9   nền trang
--color-surface      #FFFFFF   nền thẻ, bảng, modal
--color-border       #E5E7EB

--color-text         #111827
--color-text-secondary #6B7280
--color-text-muted   #9CA3AF

--color-success #16A34A   --color-warning #D97706
--color-danger  #DC2626   --color-info    #2563EB
```

Dark mode giữ cơ chế sẵn có: `document.documentElement[data-theme="dark"]`,
chỉ định nghĩa lại token trong `tokens.css`.

**Tương thích ngược:** tất cả biến cũ (`--bg-card`, `--text-primary`, `--accent-primary`,
`--border-color`, `--shadow-sm`…) vẫn tồn tại và trỏ sang token mới, nên hơn 120 trang
chưa chuyển đổi vẫn hiển thị đúng theo bộ màu mới mà không phải sửa code.

---

## 3. Typography & khoảng cách

| Vai trò | Cỡ | Đậm |
|---|---|---|
| Tiêu đề trang | 24px | 700 |
| Tiêu đề section | 18px | 600 |
| Tiêu đề thẻ | 15px | 600 |
| Nội dung | 14px | 400 |
| Bảng | 13px | 400 |
| Chú thích | 12px | 400 |

Khoảng cách theo hệ 8px: `--space-1..8` (4 / 8 / 12 / 16 / 24 / 32).
Section cách nhau 24px, padding thẻ 20px, cao input/nút 40px, cao dòng bảng 52px,
bo góc 8–12px, bóng đổ rất nhẹ.

Số liệu và tiền tệ dùng `font-variant-numeric: tabular-nums` và **căn phải** trong bảng
(class `is-num` hoặc `align: 'num'`).

---

## 4. Khung trang chuẩn

```jsx
import { PageContainer, PageHeader, Card, Button } from '@/components/ui';

export default function Page() {
    return (
        <PageContainer>
            <PageHeader
                title="Khách hàng"
                description="Quản lý khách hàng và quá trình chăm sóc"
                breadcrumbs={[{ label: 'Trang chủ', href: '/' }, { label: 'Khách hàng' }]}
                actions={<Button variant="primary">Thêm khách hàng</Button>}
                filters={<SearchBar value={q} onChange={setQ} />}
            />

            <Card flush>
                <Table … />
            </Card>
        </PageContainer>
    );
}
```

`AppShell` (Sidebar + Header + `.page-content`) đã bọc sẵn ở `app/layout.js`,
trang **không** tự dựng lại khung.

---

## 5. Danh mục component

| Import | Dùng khi |
|---|---|
| `PageContainer`, `Stack` | Khung nội dung, giới hạn bề rộng, giãn cách section |
| `PageHeader`, `Breadcrumbs` | Tiêu đề trang thống nhất |
| `Button`, `IconButton` | 6 biến thể: primary / secondary / outline / ghost / danger / danger-solid |
| `Field`, `Input`, `Select`, `Textarea`, `Checkbox` | Form có label, dấu `*`, mô tả, lỗi |
| `FormSection`, `FormGrid`, `FormActions` | Form dài chia section, nút Lưu/Hủy cuối form |
| `Card`, `CardGrid` | Thẻ nội dung |
| `StatCard`, `StatGrid` | Thẻ KPI |
| `Badge`, `StatusBadge` | Badge trạng thái |
| `Table`, `RowMenu`, `TablePagination` | Bảng dùng chung |
| `Modal`, `ConfirmDialog` | Hộp thoại |
| `useToast` | Thông báo kết quả thao tác |
| `Skeleton`, `SkeletonCard`, `SkeletonStats`, `SkeletonTable`, `Spinner`, `LoadingArea` | Trạng thái đang tải |
| `EmptyState`, `NoResultsState`, `ErrorState`, `ForbiddenState` | Trạng thái rỗng / lỗi / không có quyền |

### Button

Mỗi màn hình chỉ có **một** nút `primary`. Hành động phụ dùng `outline`/`secondary`.
Nút xóa dùng `danger` và không đặt sát nút chính.

```jsx
<Button variant="primary" icon={Plus} loading={saving}>Lưu mẫu</Button>
<IconButton icon={Trash2} label="Xóa mẫu" />   {/* label là bắt buộc */}
```

### Table

```jsx
<Table
    columns={[
        { key: 'code',   header: 'Mã dự án', nowrap: true, strong: true },
        { key: 'name',   header: 'Tên',     truncate: true },
        { key: 'amount', header: 'Giá trị', align: 'num', render: v => formatCurrency(v) },
    ]}
    data={rows}
    loading={loading}
    error={failed}
    onRetry={reload}
    onRowClick={row => router.push(`/projects/${row.id}`)}
    rowActions={row => [
        { label: 'Xem', icon: Eye, onClick: () => open(row) },
        { label: 'Xóa', icon: Trash2, danger: true, separatorBefore: true, onClick: () => remove(row) },
    ]}
    stickyHeader
    emptyTitle="Chưa có dữ liệu"
    emptyDescription="…"
    emptyAction={<Button variant="primary">Thêm mới</Button>}
/>
```

Mỗi dòng chỉ nên có tối đa một nút chính; các thao tác còn lại nằm trong `rowActions`
(menu ba chấm).

### Badge trạng thái

Bảng ánh xạ trạng thái → tone nằm ở `components/ui/Badge.js` (`toneOf`).
**Cùng một trạng thái phải có cùng một màu trên toàn hệ thống** — muốn đổi màu thì sửa
bảng ánh xạ đó, không sửa trong trang.

```
Nháp / Khảo sát / Lưu trữ          → neutral (xám)
Chờ xử lý / Chờ duyệt              → warning (vàng)
Đang thực hiện / Đang thi công     → info    (xanh dương)
Hoàn thành / Đã duyệt / Đã thu     → success (xanh lá)
Quá hạn / Hủy / Từ chối            → danger  (đỏ)
Thiết kế / Bảo hành                → purple
```

### Modal

- Đóng bằng `Escape`, focus không thoát ra ngoài, trả focus về chỗ cũ khi đóng.
- Form quan trọng đặt `closeOnOverlayClick={false}` để không mất dữ liệu.
- Dưới 768px modal tự thành bottom sheet; `drawer` cho modal toàn màn hình.
- Modal xóa luôn ghi rõ đối tượng qua `itemName` của `ConfirmDialog`.

### Toast

Thông báo nói rõ **kết quả**, không hiện lỗi kỹ thuật hay stack trace:

```jsx
toast.success('Đã lưu khách hàng thành công.');
toast.error('Không thể lưu. Vui lòng kiểm tra các trường bắt buộc.');
toast.warning('Bạn không có quyền thực hiện thao tác này.');
```

### Loading / Empty / Error

- Không dùng dòng chữ “Đang tải…”; dùng skeleton đúng hình dạng nội dung để
  bố cục không nhảy khi dữ liệu về.
- Tải quá 8 giây: `LoadingArea` hiện “Dữ liệu đang tải lâu hơn dự kiến.” kèm nút **Thử lại**.
- Empty state luôn có icon + tiêu đề + mô tả + nút hành động (nếu người dùng có quyền).
- Lỗi tải dữ liệu dùng `ErrorState`; 404 ở `app/not-found.js`; 500 ở `app/error.js`.

---

## 6. Định dạng dữ liệu

Dùng `lib/format.js`, không tự viết lại `Intl.NumberFormat` trong trang.

```js
formatCurrency(35966666.667)  // "35.966.667 ₫"  (luôn làm tròn đến đồng)
formatCompact(1250000000)     // "1,25 tỷ"
formatNumber(1234567)         // "1.234.567"
formatPercent(75)             // "75%"
formatDate('2026-09-15')      // "15/09/2026"
formatDateShort('2026-09-15') // "15/09"
formatPhone('0901234567')     // "0901 234 567"
initials('Nguyễn Văn An')     // "NA"
```

---

## 7. Responsive

Đã kiểm tra ở 375 / 768 / 1024 / 1366 / 1440px.

- Sidebar: 248px (mở) — 72px (thu gọn, lưu trong `localStorage`) — drawer dưới 768px,
  đóng bằng `Escape`, bằng overlay, hoặc khi chọn một mục menu.
- `.page-content`: padding 24px desktop, 16px mobile.
- Bảng rộng chỉ cuộn ngang **trong vùng bảng** (`.ui-table-wrap`), trang không tràn ngang.
- Form nhiều cột tự về một cột; card KPI tự xuống hàng.

---

## 8. Accessibility

- Mỗi trang chỉ một `<h1>` (do `PageHeader` tạo); tiêu đề header không phải heading.
- Mọi icon button có `aria-label` + tooltip (`IconButton` bắt buộc prop `label`).
- Focus ring cam thống nhất qua `--focus-ring`, hiển thị bằng `:focus-visible`.
- Lỗi form báo bằng icon + chữ, không chỉ bằng màu.
- Có link “Bỏ qua điều hướng” (`.skip-link`) ở đầu AppShell.
- Tôn trọng `prefers-reduced-motion`.

---

## 9. Khi chuyển đổi một trang cũ

1. Bỏ khung tự dựng, thay bằng `PageContainer` + `PageHeader`.
2. Thay `<table className="data-table">` bằng `Table`.
3. Thay `alert()` / `confirm()` bằng `toast` / `ConfirmDialog`.
4. Thay các hàm format cục bộ bằng `lib/format.js`.
5. Thay màu hardcode bằng token.
6. Chạy `npm run lint`, `npm run type-check`, `npm test`, `npm run build`.

Trang mẫu đã chuyển đổi: `app/page.js` (Dashboard) và
`app/schedule-templates/page.js` (trang danh sách).
