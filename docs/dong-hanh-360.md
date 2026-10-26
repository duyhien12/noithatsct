# Đặc tả module Đồng hành 360 — HomeERP SCT

> Mục 11–14 và các câu đánh dấu ✅ là nội dung người dùng gửi trong chat.
> Các phần đánh dấu 🟡 là **Claude đề xuất** để lấp chỗ bị cắt mất (người dùng yêu cầu Claude tự hoàn thiện file). **Người dùng đã duyệt toàn bộ các giá trị 🟡 ngày 24/10/2026.**

## Quyết định đã chốt
- ✅ Hướng làm theo báo cáo khảo sát: ĐÃ DUYỆT.
- ✅ Giữ nguyên MaintenanceRecord / Bảo hành 360, không di chuyển dữ liệu cũ.
- ✅ 24/10/2026: Duyệt toàn bộ giá trị 🟡 (Giai đoạn 2).
- ✅ Không truyền dữ liệu Phiếu công việc sang Đồng hành 360 nếu schema WorkOrder hiện tại không hỗ trợ an toàn (ghi chú hoàn thành → hiện dùng tiêu đề phiếu, vì `workOrderUpdateSchema` là strict).
- ✅ Không sửa schema cũ hoặc mở rộng phạm vi ngoài module. Chưa chạy migration lên production. Chỉ dùng DB dev `localhost:5432/noithatsct_donghanh360_dev`. Không commit/push/deploy.

## 1. Mục đích và phạm vi
- 🟡 Đồng hành 360 ghi nhận và theo dõi xử lý mọi vấn đề/phản ánh của khách hàng trong suốt vòng đời công trình (thi công, bàn giao, sau bàn giao) đến khi khách hàng xác nhận hài lòng.
- 🟡 Mỗi vấn đề **bắt buộc gắn Khách hàng**, **tùy chọn gắn Dự án** (dự án phải thuộc đúng khách hàng đó). Nếu chỉ chọn Dự án, hệ thống tự lấy Khách hàng của dự án.
- 🟡 Là module riêng (bảng mới), độc lập với MaintenanceRecord.

## 2. Ràng buộc chung
- ✅ Tuân theo kiến trúc hiện tại: cơ chế đăng nhập (NextAuth + Bearer), phân quyền theo vai trò/phòng ban.
- ✅ Không sửa các module không liên quan ngoài những điểm cần thiết để liên kết Đồng hành 360.
- ✅ Tất cả các vị trí (module riêng, tab Khách hàng, tab Dự án) dùng chung một nguồn dữ liệu, không tạo bản ghi trùng.
- ✅ Hệ thống ghi nhớ chế độ xem gần nhất của người dùng nếu kiến trúc hiện tại cho phép. 🟡 Kiến trúc hiện tại không có bảng tùy chọn người dùng → lưu `localStorage` theo khoá có userId (làm ở giai đoạn giao diện).
- ✅ Không so sánh bằng chuỗi tiếng Việt trong logic. Dùng constant mã tiếng Anh + bảng nhãn tiếng Việt, giống `lib/manufacturing/constants.js`.

## 3. Dữ liệu của một vấn đề
🟡 Các trường (mã tự sinh dạng `DH0001`):
| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Khách hàng | ✅ | |
| Dự án | | phải thuộc khách hàng |
| Tiêu đề | ✅ | |
| ✅ Khu vực/hạng mục | | chữ tự do, VD "Phòng ngủ 2 / Tủ áo" |
| ✅ Nhóm vấn đề | ✅ | danh sách bên dưới |
| ✅ Nội dung vấn đề | ✅ | |
| Mức độ ưu tiên | ✅ | mặc định MEDIUM |
| Kênh tiếp nhận | | PHONE Điện thoại, ZALO Zalo, EMAIL Email, SITE Tại công trình, MEETING Gặp trực tiếp, OTHER Khác |
| Người phản ánh, SĐT người phản ánh | | |
| Thời điểm ghi nhận | ✅ | mặc định lúc tạo |
| Hạn xử lý | | không nhập → tự tính theo mức ưu tiên (mục 6) |
| Người phụ trách | | 1 tài khoản User |
| Người phối hợp | | nhiều tài khoản User |
| Kết quả xử lý | | bắt buộc trước khi chuyển Chờ xác nhận |
| Lý do huỷ / mở lại / không đạt | | bắt buộc khi thao tác tương ứng |

🟡 Nhóm vấn đề: `CONSTRUCTION_QUALITY` Chất lượng thi công · `FURNITURE` Đồ nội thất · `MATERIAL` Vật tư/vật liệu · `ELECTRICAL` Điện · `PLUMBING` Cấp thoát nước · `WATERPROOFING` Thấm dột · `DESIGN` Thiết kế · `SCHEDULE` Tiến độ · `SERVICE` Thái độ/dịch vụ · `PAYMENT_DOCUMENT` Thanh toán/hồ sơ · `OTHER` Khác.

## 4. Trạng thái và quy trình
🟡 Trạng thái:
| Mã | Nhãn |
|---|---|
| `NEW` | Mới tiếp nhận |
| `IN_PROGRESS` | Đang xử lý |
| `WAITING_CONFIRMATION` | Chờ xác nhận |
| `DONE` | Hoàn thành |
| `CANCELLED` | Đã huỷ |

🟡 Chuyển trạng thái hợp lệ (dùng chung cho nút bấm và kéo thả Kanban):
| Từ | Sang | Quyền cần | Điều kiện |
|---|---|---|---|
| NEW | IN_PROGRESS | transition | |
| NEW, IN_PROGRESS | CANCELLED | cancel | bắt buộc lý do |
| IN_PROGRESS | WAITING_CONFIRMATION | transition | bắt buộc có Kết quả xử lý |
| WAITING_CONFIRMATION | DONE | confirm | |
| WAITING_CONFIRMATION | IN_PROGRESS | confirm | không đạt, bắt buộc lý do |
| DONE | IN_PROGRESS | reopen | mở lại, bắt buộc lý do |
| CANCELLED | NEW | reopen | khôi phục, bắt buộc lý do |

## 5. Chế độ xem
- ✅ KANBAN (cập nhật Giai đoạn 3, người dùng duyệt cách chia cột 24/10/2026) — 4 cột: Mới tiếp nhận · Đang xử lý · Chờ phối hợp · Chờ xác nhận/Hoàn thành. Cột là cách NHÓM trạng thái, không thêm trạng thái mới (`KANBAN_BOARD` trong `lib/customerIssue/constants.js`):
  - Mới tiếp nhận = `NEW`.
  - Đang xử lý = `IN_PROGRESS` không còn phiếu công việc liên kết chưa hoàn thành.
  - Chờ phối hợp = `IN_PROGRESS` còn ít nhất 1 phiếu công việc liên kết chưa hoàn thành (tự tính, không thả thẻ vào được).
  - Chờ xác nhận/Hoàn thành = `WAITING_CONFIRMATION` + `DONE`. Thả thẻ vào đây = chuyển sang Chờ xác nhận (bắt buộc kết quả xử lý); xác nhận Hoàn thành bằng nút trong panel.
  - Kéo thả chỉ nhận cột mà workflow mục 4 + quyền cho phép; trên điện thoại dùng menu "…" trên thẻ. Vấn đề Đã huỷ không hiện trên Kanban, xem ở chế độ Danh sách.
  - Thả hợp lệ: thẻ sang cột mới ngay rồi gọi API; API từ chối thì thẻ trả về chỗ cũ kèm thông báo lỗi. Thả vào cột không hợp lệ: thẻ giữ nguyên chỗ, báo lý do bằng tiếng Việt (`dropRejectReason` trong `workflow.js`).
- ✅ Bộ lọc thời hạn: quá hạn / đến hạn hôm nay / đến hạn trong 7 ngày (`?due=overdue|today|week`).
- ✅ Danh sách — các cột: Trạng thái, Cập nhật gần nhất, Thao tác, Khu vực/hạng mục, Nhóm vấn đề, Nội dung vấn đề. 🟡 thêm Mã, Khách hàng/Dự án, Ưu tiên, Người phụ trách, Hạn xử lý.
- 🟡 "Cập nhật gần nhất" = trường `lastActivityAt`, cập nhật mỗi khi có hoạt động (sửa, đổi trạng thái, tệp, ghi chú, phiếu công việc).
- 🟡 Bộ lọc: trạng thái (nhiều), ưu tiên, nhóm vấn đề, người phụ trách, khách hàng, dự án, quá hạn, khoảng ngày ghi nhận, từ khoá.

## 6. Mức độ ưu tiên
- ✅ `LOW`: Thấp. 🟡 hạn mặc định 14 ngày
- 🟡 `MEDIUM`: Trung bình — 7 ngày
- 🟡 `HIGH`: Cao — 3 ngày
- 🟡 `URGENT`: Khẩn cấp — 1 ngày

## 7. Phân công và người phối hợp
- 🟡 Mỗi vấn đề có tối đa 1 người phụ trách và nhiều người phối hợp (đều là tài khoản User đang hoạt động). Một người không vừa là phụ trách vừa là phối hợp.
- 🟡 Phân công không tự đổi trạng thái. Người được phân công / thêm phối hợp nhận thông báo trong app (bảng Notification hiện có).

## 8. Liên kết Phiếu công việc
- 🟡 Từ vấn đề có gắn Dự án: tạo Phiếu công việc mới (dùng đúng bảng WorkOrder) hoặc liên kết Phiếu công việc có sẵn cùng dự án. Một phiếu chỉ thuộc tối đa 1 vấn đề. Tạo/liên kết khi vấn đề đang NEW sẽ chuyển vấn đề sang IN_PROGRESS.
- ✅ Sau khi Phiếu công việc hoàn thành, vấn đề chuyển sang Chờ xác nhận nếu đủ điều kiện. 🟡 Đủ điều kiện = vấn đề đang NEW/IN_PROGRESS **và** mọi phiếu công việc liên kết (chưa xoá) đều đã hoàn thành.
- ✅ Kết quả trở thành kết quả xử lý. 🟡 Ghi chú hoàn thành của phiếu (hoặc tiêu đề phiếu nếu không có ghi chú) được nối vào Kết quả xử lý của vấn đề.
- 🟡 Phiếu công việc không liên kết vấn đề: hành vi giữ nguyên 100%.

## 9. Phân quyền theo phòng ban
🟡 Quyền: view, create, update, assign, collaborators, transition, confirm, cancel, reopen, delete, files, note, work_order.
| Đối tượng | Quyền |
|---|---|
| Ban GĐ / admin (`ban_gd`, `giam_doc`, `pho_gd`, `admin`) | toàn quyền |
| Phòng Xây dựng — quản lý (Trưởng/Phó phòng, Quản lý) | toàn quyền trừ xoá |
| Phòng Xây dựng — nhân viên | view, create, update, transition, files, note, work_order |
| Phòng Kinh doanh — quản lý | view, create, update, confirm, files, note |
| Phòng Kinh doanh — nhân viên | ✅ xem tình trạng trong hồ sơ khách hàng; 🟡 view, create, files, note |
| Phòng Thiết kế | view, create, note |
| Xưởng | view, note |
| Hành chính kế toán, viewer | view |
| Người phụ trách / phối hợp của vấn đề (mọi phòng) | thêm update, transition, files, note trên vấn đề đó |
- 🟡 Phòng ban/chức danh luôn đọc lại từ DB theo user id (token di động không mang department).

## 10. Nhật ký hoạt động
- 🟡 Ghi tự động trong cùng transaction: CREATED, UPDATED (kèm các trường thay đổi), ASSIGNED, COLLABORATOR_ADDED, COLLABORATOR_REMOVED, STATUS_CHANGED, FILE_ADDED, FILE_REMOVED, WORK_ORDER_CREATED, WORK_ORDER_LINKED, WORK_ORDER_COMPLETED, DELETED; NOTE = ghi chú tay của người dùng.
- ✅ Không cho người dùng thông thường sửa hoặc xóa nhật ký. 🟡 Không có API sửa/xoá nhật ký cho bất kỳ ai; nhật ký không bị xoá khi xoá mềm vấn đề.

## 11. Hình ảnh và tệp

Phân loại:

- `BEFORE`: ảnh hiện trạng trước xử lý.
- `DURING`: ảnh trong quá trình xử lý.
- `AFTER`: ảnh sau xử lý.
- `DOCUMENT`: tài liệu liên quan.

Tận dụng cơ chế upload đang có. Không xây hệ upload hoàn toàn mới nếu có thể tái sử dụng.

✅ Giới hạn (Giai đoạn 3, `lib/customerIssue/files.js` + hằng số trong `constants.js`):
- Mục ảnh (BEFORE/DURING/AFTER): JPG, JPEG, PNG, WEBP, GIF, HEIC, HEIF — tối đa 10 MB/ảnh.
- DOCUMENT: các định dạng ảnh trên + PDF, DOC(X), XLS(X), PPT(X), TXT, CSV, DWG, ZIP — tối đa 25 MB/tệp.
- Giao diện kiểm tra trước khi upload (báo lỗi tiếng Việt); API `POST /attachments` kiểm tra lại (mục ảnh chỉ nhận ảnh, DOCUMENT từ chối định dạng lạ → 400).
- Bấm ảnh để xem trước, mở tab mới, tải xuống; "Gỡ tệp" chỉ hiện cho người tải lên hoặc người có quyền `update` theo phòng ban (khớp kiểm tra của API).

## 12. API

Xây dựng API theo pattern hiện tại, tối thiểu gồm:

- Danh sách có phân trang và bộ lọc.
- Thống kê KPI.
- Tạo vấn đề.
- Xem chi tiết.
- Cập nhật vấn đề.
- Phân công.
- Chuyển trạng thái.
- Thêm/xóa người phối hợp.
- Upload và quản lý tệp.
- Nhật ký hoạt động.
- Tạo/liên kết Phiếu công việc.
- Danh sách theo customerId.
- Danh sách theo projectId.

Mọi API phải:

- Xác thực đăng nhập.
- Kiểm tra quyền.
- Validate dữ liệu.
- Trả lỗi rõ ràng.
- Dùng transaction cho thao tác cập nhật nhiều bảng.
- Không so sánh logic bằng nhãn tiếng Việt.

## 13. Giao diện cho giai đoạn sau

Chưa làm giao diện trong Giai đoạn 2, nhưng API phải phục vụ:

- Module riêng trong nhóm Dự án & Thi công.
- Tab trong chi tiết Khách hàng.
- Tab trong chi tiết Dự án.
- KPI.
- Kanban.
- Danh sách.
- Bộ lọc.
- Form ghi nhận.
- Panel chi tiết.
- Ảnh trước, trong và sau xử lý.
- Nhật ký hoạt động.

## 14. Bảo toàn hệ thống

- Giữ nguyên MaintenanceRecord/Bảo hành 360.
- Không di chuyển dữ liệu cũ.
- Không làm thay đổi hành vi Phiếu công việc cũ.
- Không xóa hoặc đổi tên trường/bảng đang dùng.
- Không sửa migration cũ.
- Không chạy migration trên production.
- Không chạy `prisma migrate deploy` vào PROD.
- Không commit.
- Không push GitHub.
- Không triển khai production.
- Không sửa module không liên quan ngoài vị trí thực sự cần thiết.

# QUY TRÌNH THỰC HIỆN

## Giai đoạn 2 – Database và API (chỉ thực hiện sau khi duyệt)
1. Xác nhận file này đã chứa đủ 14 mục.
2. Thực hiện Giai đoạn 2: Database và API trên môi trường phát triển.
3. Tạo migration mới nhưng chưa áp dụng vào production.
4. Chạy Prisma generate, typecheck, lint và các kiểm thử phù hợp trong môi trường an toàn.
5. Không tự ý dùng database production để thử.
- ✅ Tuyệt đối không kết nối hoặc thay đổi database production cổng 15433; không sửa `.env`; không chạy `prisma migrate deploy`; không commit/push/deploy.
- ✅ Trước khi chạy migration, in ra host, port và database (không in mật khẩu).
- 🟡 DB dev: `localhost:5432/noithatsct_donghanh360_dev`. Khi chạy dev server để kiểm thử: tắt `UPLOAD_FORWARD_URL`/R2 để file upload chỉ lưu local, không lên server production.
- Test tạo/sửa/xóa mềm.
- Test kéo thả Kanban.
- Test upload.
- 11. Sau khi hoàn thành Giai đoạn 2, chạy kiểm tra phù hợp, liệt kê toàn bộ file đã tạo/sửa, migration đã tạo, API đã xây dựng, kết quả kiểm thử và dừng lại chờ duyệt trước khi làm giao diện.
