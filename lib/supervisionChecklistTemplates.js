// Nguồn: "Quy trình giám sát thi công nội thất" (file Excel nội bộ SCT)
// Mỗi template gồm các nhóm (group) chứa các hạng mục kiểm tra (item).
// item.hint (nếu có) là ghi chú/cách thực hiện tham khảo cho giám sát.

export const SUPERVISION_CHECKLIST_TEMPLATES = {
    protect: {
        key: 'protect',
        name: 'Bảo vệ công trình trước khi thi công',
        icon: '🛡️',
        groups: [
            {
                name: 'Hạng mục cần bảo vệ',
                items: [
                    { label: 'Chân thang, mũi bậc cầu thang', hint: 'Bọc mút xốp PE/EPE, tấm carton cứng hoặc cao su non, quấn băng dính giấy' },
                    { label: 'Mặt bậc cầu thang', hint: 'Trải bạt chống xước hoặc tấm nhựa PP, cố định chắc chắn' },
                    { label: 'Sàn gạch', hint: 'Phủ carton 3–5 lớp hoặc tấm nhựa PP chuyên dụng, tránh kéo lê đồ' },
                    { label: 'Sàn gỗ', hint: 'Phủ xốp PE và carton, tuyệt đối không để nước đọng' },
                    { label: 'Góc tường', hint: 'Bọc xốp hoặc nẹp bảo vệ góc để tránh va đập' },
                    { label: 'Cửa gỗ', hint: 'Quấn màng PE và bìa carton ở mép cửa, tay nắm và khung cửa' },
                    { label: 'Khung cửa', hint: 'Bọc mút ở các cạnh dễ va chạm' },
                    { label: 'Cửa kính', hint: 'Dán decal cảnh báo và bọc góc kính bằng mút' },
                    { label: 'Khung nhôm', hint: 'Dán băng dính giấy hoặc màng bảo vệ, tránh xước' },
                    { label: 'Lan can kính', hint: 'Quấn màng PE và bọc góc' },
                    { label: 'Mặt đá', hint: 'Phủ carton hoặc tấm nhựa, không đặt vật nặng trực tiếp' },
                    { label: 'Thiết bị vệ sinh', hint: 'Bọc nilon, carton; không dùng làm nơi để đồ nghề' },
                    { label: 'Tường sơn', hint: 'Dán bạt khi cắt mài hoặc khoan để hạn chế bụi bẩn' },
                    { label: 'Trần thạch cao', hint: 'Hạn chế va chạm khi vận chuyển vật tư dài' },
                    { label: 'Ổ điện, công tắc', hint: 'Che chắn khi sơn, bắn keo hoặc vệ sinh' },
                    { label: 'Thang máy (nếu có)', hint: 'Lót sàn, bọc vách theo quy định của tòa nhà' },
                    { label: 'Lối đi chung', hint: 'Trải bạt hoặc carton để giữ vệ sinh' },
                    { label: 'Khu vực tập kết vật tư', hint: 'Quy hoạch gọn gàng, không cản lối đi hoặc cửa thoát hiểm' },
                ],
            },
        ],
    },

    installation: {
        key: 'installation',
        name: 'Giám sát lắp đặt (tổng quát)',
        icon: '🔧',
        groups: [
            { name: 'A. Kích thước', items: ['Đúng bản vẽ', 'Đúng cao độ', 'Vuông góc', 'Đúng khoảng cách', 'Đúng tim'].map(label => ({ label })) },
            { name: 'B. Vật liệu', items: ['Đúng mã MDF', 'Đúng mã Laminate', 'Đúng Veneer', 'Đúng màu sơn', 'Đúng đá', 'Đúng kính'].map(label => ({ label })) },
            { name: 'C. Phụ kiện', items: ['Bản lề', 'Ray', 'Tay nâng', 'Tay nắm', 'Khóa', 'Đèn LED', 'Ổ cắm'].map(label => ({ label })) },
            { name: 'D. Kỹ thuật', items: ['Không cong', 'Không vênh', 'Không nứt', 'Không sứt', 'Khe hở đều', 'Đóng mở nhẹ', 'Không cọ xát', 'Silicon đẹp'].map(label => ({ label })) },
            { name: 'E. Thẩm mỹ', items: ['Không xước', 'Không bẩn', 'Không lem keo', 'Không hở cạnh', 'Vân gỗ đúng chiều', 'Màu đồng đều'].map(label => ({ label })) },
        ],
    },

    furniture_install: {
        key: 'furniture_install',
        name: 'Giám sát lắp đặt vách, tủ, kệ',
        icon: '🪵',
        groups: [
            {
                name: '1. Kiểm tra vị trí lắp đặt',
                items: [
                    'Đúng theo bản vẽ được duyệt',
                    'Đúng tim trục và kích thước',
                    'Đúng khoảng cách đến cửa, cửa sổ, ổ điện',
                    'Không che cửa kiểm tra kỹ thuật, hộp điện, van nước',
                ].map(label => ({ label })),
            },
            {
                name: '2. Kiểm tra mặt bằng trước khi lắp',
                items: [
                    'Sàn đã hoàn thiện và sạch sẽ',
                    'Tường đủ khô, không thấm',
                    'Trần đã hoàn thiện',
                    'Có đủ ánh sáng để kiểm tra',
                    'Các vị trí đã được bọc bảo vệ',
                ].map(label => ({ label })),
            },
            {
                name: '3. Kiểm tra sản phẩm trước khi đưa lên vị trí',
                items: [
                    'Đúng mã số từng cấu kiện',
                    'Đúng kích thước',
                    'Đúng màu và vật liệu',
                    'Không trầy xước',
                    'Không cong vênh',
                    'Cạnh dán kín, không bong',
                    'Không sứt mẻ góc',
                ].map(label => ({ label })),
            },
            {
                name: '4a. Trong quá trình lắp đặt — Vách trang trí',
                items: [
                    'Đúng cao độ',
                    'Thẳng đứng (kiểm tra bằng nivô hoặc laser)',
                    'Liên kết chắc với tường, sàn, trần',
                    'Không rung khi tác động nhẹ',
                    'Khe ghép đều và kín',
                ].map(label => ({ label })),
            },
            {
                name: '4b. Trong quá trình lắp đặt — Tủ áo, tủ bếp, tủ trang trí',
                items: [
                    'Khung tủ cân bằng',
                    'Các khoang vuông góc',
                    'Các modul ghép khít',
                    'Vít liên kết đủ số lượng',
                    'Không để đầu vít lộ ra ngoài',
                ].map(label => ({ label })),
            },
            {
                name: '4c. Trong quá trình lắp đặt — Kệ treo',
                items: [
                    'Bắt đúng vị trí chịu lực',
                    'Dùng đúng loại tắc kê, vít',
                    'Không võng',
                    'Thử tải nhẹ sau khi lắp',
                ].map(label => ({ label })),
            },
            {
                name: '5. Kiểm tra phụ kiện',
                items: [
                    'Bản lề đúng chủng loại',
                    'Ray trượt hoạt động êm',
                    'Tay nắm thẳng hàng',
                    'Piston, giảm chấn hoạt động tốt',
                    'Không thiếu vít hoặc phụ kiện',
                ].map(label => ({ label })),
            },
            {
                name: '6. Kiểm tra khe hở và thẩm mỹ',
                items: [
                    'Khe cánh đều',
                    'Cánh không cọ vào nhau',
                    'Mép chỉ thẳng',
                    'Vân gỗ liên tục theo thiết kế',
                    'Không hở sáng ở các mối ghép',
                ].map(label => ({ label })),
            },
            {
                name: '7. Kiểm tra liên kết với công trình',
                items: [
                    'Không khoan trúng đường điện, nước',
                    'Không làm nứt gạch hoặc đá',
                    'Không làm hỏng sơn tường',
                    'Không làm xước trần thạch cao',
                ].map(label => ({ label })),
            },
            {
                name: '8. Kiểm tra vệ sinh trong quá trình lắp',
                items: [
                    'Mùn cưa được thu gom',
                    'Không để keo dính lên bề mặt',
                    'Không để silicon lem',
                    'Không đặt dụng cụ trực tiếp lên sàn đá hoặc sàn gỗ',
                ].map(label => ({ label })),
            },
            {
                name: '9. Thử nghiệm sau khi lắp xong',
                items: [
                    'Mở/đóng toàn bộ cánh tủ',
                    'Kéo toàn bộ ngăn kéo',
                    'Kiểm tra độ chắc chắn bằng cách rung nhẹ',
                    'Kiểm tra đèn LED, ổ cắm, thiết bị tích hợp (nếu có)',
                ].map(label => ({ label })),
            },
        ],
    },

    acceptance: {
        key: 'acceptance',
        name: 'Nghiệm thu hoàn thiện nội thất',
        icon: '✅',
        groups: [
            {
                name: 'I. Kiểm tra tổng thể',
                items: [
                    'Đúng bản vẽ thiết kế', 'Đúng phối cảnh đã duyệt', 'Đúng màu sắc',
                    'Đúng vật liệu', 'Đúng kích thước', 'Đúng số lượng', 'Không thiếu hạng mục',
                ].map(label => ({ label })),
            },
            {
                name: 'II. Kiểm tra thẩm mỹ — Bề mặt',
                items: [
                    'Không trầy xước', 'Không móp méo', 'Không sứt cạnh', 'Không bong tróc',
                    'Không phồng rộp', 'Không bám keo', 'Không bẩn', 'Không lem silicon', 'Không loang màu',
                ].map(label => ({ label })),
            },
            {
                name: 'II. Kiểm tra thẩm mỹ — Cạnh dán',
                items: ['Chỉ dán kín', 'Không hở mép', 'Không bong', 'Không cong', 'Không gợn sóng'].map(label => ({ label })),
            },
            {
                name: 'II. Kiểm tra thẩm mỹ — Vân gỗ',
                items: ['Vân đúng chiều', 'Vân nối liên tục', 'Không lệch màu'].map(label => ({ label })),
            },
            {
                name: 'III. Kiểm tra kích thước',
                note: 'Sai số cho phép: ±2mm đối với đồ nội thất, ±3mm đối với hạng mục lớn',
                items: ['Cao', 'Rộng', 'Sâu', 'Cao độ', 'Khoảng cách'].map(label => ({ label })),
            },
            {
                name: 'IV. Kiểm tra độ cân bằng (dùng nivô laser)',
                items: ['Đứng thẳng', 'Nằm ngang', 'Không nghiêng', 'Không võng'].map(label => ({ label })),
            },
            {
                name: 'V. Kiểm tra khe hở — Cánh tủ',
                items: ['Khe đều', 'Không cọ', 'Không hở', 'Không xệ'].map(label => ({ label })),
            },
            {
                name: 'V. Kiểm tra khe hở — Ngăn kéo',
                items: ['Khe đều', 'Đóng kín', 'Không lệch'].map(label => ({ label })),
            },
            {
                name: 'VI. Kiểm tra phụ kiện — Bản lề',
                items: ['Đủ số lượng', 'Đúng hãng', 'Đóng mở êm', 'Không phát tiếng'].map(label => ({ label })),
            },
            {
                name: 'VI. Kiểm tra phụ kiện — Ray',
                items: ['Kéo hết hành trình', 'Không kẹt', 'Không rung'].map(label => ({ label })),
            },
            {
                name: 'VI. Kiểm tra phụ kiện — Tay nâng',
                items: ['Mở nhẹ', 'Giữ được cánh', 'Không tụt'].map(label => ({ label })),
            },
            {
                name: 'VI. Kiểm tra phụ kiện — Khóa',
                items: ['Đóng mở tốt', 'Không kẹt'].map(label => ({ label })),
            },
            {
                name: 'VII. Kiểm tra thiết bị — Đèn LED',
                items: ['Sáng đều', 'Không nhấp nháy', 'Không hở dây'].map(label => ({ label })),
            },
            {
                name: 'VII. Kiểm tra thiết bị — Ổ điện',
                items: ['Có điện', 'Đúng vị trí', 'Đúng chiều'].map(label => ({ label })),
            },
            {
                name: 'VII. Kiểm tra thiết bị — Công tắc',
                items: ['Hoạt động', 'Không lỏng'].map(label => ({ label })),
            },
            {
                name: 'VII. Kiểm tra thiết bị — Thiết bị bếp',
                note: 'Thử vận hành từng thiết bị',
                items: ['Bếp từ', 'Máy hút mùi', 'Chậu', 'Vòi', 'Máy rửa bát', 'Tủ lạnh', 'Lò'].map(label => ({ label })),
            },
            {
                name: 'VIII. Kiểm tra đá',
                items: ['Không nứt', 'Không mẻ', 'Mối nối đẹp', 'Không chênh', 'Không hở', 'Silicon đẹp'].map(label => ({ label })),
            },
            {
                name: 'IX. Kiểm tra kính',
                items: ['Không xước', 'Không nứt', 'Không bọt khí', 'Không lỏng', 'Kẹp kính chắc'].map(label => ({ label })),
            },
            {
                name: 'X. Kiểm tra sơn',
                items: ['Đều màu', 'Không rỗ', 'Không chảy', 'Không bụi', 'Không vá'].map(label => ({ label })),
            },
            {
                name: 'XI. Kiểm tra vệ sinh',
                items: ['Lau sạch', 'Hút bụi', 'Không còn mùn cưa', 'Không còn rác', 'Không còn tem dán', 'Không còn keo'].map(label => ({ label })),
            },
            {
                name: 'XII. Kiểm tra an toàn',
                items: ['Không cạnh sắc', 'Không đầu vít lộ', 'Không rung lắc', 'Không nguy cơ đổ', 'Đồ treo chắc chắn', 'Kệ chịu lực tốt'].map(label => ({ label })),
            },
        ],
    },
};

export function getTemplateList() {
    return Object.values(SUPERVISION_CHECKLIST_TEMPLATES).map(t => ({
        key: t.key,
        name: t.name,
        icon: t.icon,
        groupCount: t.groups.length,
        itemCount: t.groups.reduce((s, g) => s + g.items.length, 0),
    }));
}

export function buildItemsForTemplate(templateKey) {
    const tpl = SUPERVISION_CHECKLIST_TEMPLATES[templateKey];
    if (!tpl) return null;
    const items = [];
    let sortOrder = 0;
    for (const group of tpl.groups) {
        for (const item of group.items) {
            items.push({
                groupName: group.name,
                label: item.label,
                hint: item.hint || group.note || '',
                sortOrder: sortOrder++,
            });
        }
    }
    return items;
}
