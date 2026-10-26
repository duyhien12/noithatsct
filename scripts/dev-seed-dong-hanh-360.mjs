// Seed dev tối thiểu cho module Đồng hành 360 — CHỈ chạy trên DB dev riêng.
//
//   1) Dữ liệu nền (tài khoản, khách hàng, dự án, phiếu công việc) — ghi thẳng DB dev:
//        $env:DATABASE_URL='postgresql://postgres@localhost:5432/noithatsct_donghanh360_dev?schema=public'
//        node scripts/dev-seed-dong-hanh-360.mjs
//   2) Vấn đề mẫu — tạo qua API của dev server đang chạy (đi đúng workflow/quyền):
//        node scripts/dev-seed-dong-hanh-360.mjs --issues http://localhost:3360
//
// Mật khẩu mọi tài khoản seed: Dh360@dev
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const DEV_DB = { host: ['localhost', '127.0.0.1'], port: '5432', database: 'noithatsct_donghanh360_dev' };
const PASSWORD = 'Dh360@dev';

const USERS = [
    { key: 'bgd', email: 'dh360.bgd@dev.local', name: 'Trần Giám Đốc (dev)', role: 'ban_gd', department: '' },
    { key: 'xdMgr', email: 'dh360.xd.truongphong@dev.local', name: 'Lê Trưởng Phòng XD (dev)', role: 'xay_dung', department: 'Trưởng phòng' },
    { key: 'xdStaff', email: 'dh360.xd.nhanvien@dev.local', name: 'Phạm Kỹ Thuật (dev)', role: 'xay_dung', department: 'Nhân viên' },
    { key: 'kd', email: 'dh360.kd@dev.local', name: 'Ngô Kinh Doanh (dev)', role: 'kinh_doanh', department: 'Nhân viên' },
    { key: 'xuong', email: 'dh360.xuong@dev.local', name: 'Đỗ Thợ Xưởng (dev)', role: 'xuong', department: '' },
];

function assertDevDatabase(raw) {
    if (!raw) throw new Error('Thiếu DATABASE_URL — đặt URL của DB dev trước khi chạy.');
    const url = new URL(raw);
    const database = url.pathname.replace(/^\//, '');
    const port = url.port || '5432';
    console.log(`Target: host=${url.hostname} port=${port} database=${database}`);
    if (!DEV_DB.host.includes(url.hostname) || port !== DEV_DB.port || database !== DEV_DB.database) {
        throw new Error('Từ chối: chỉ được seed vào localhost:5432/noithatsct_donghanh360_dev.');
    }
}

async function seedBase() {
    assertDevDatabase(process.env.DATABASE_URL);
    const prisma = new PrismaClient();
    try {
        const [{ db, port }] = await prisma.$queryRaw`SELECT current_database() AS db, inet_server_port() AS port`;
        if (db !== DEV_DB.database || String(port) !== DEV_DB.port) throw new Error(`Từ chối: đang kết nối ${db}:${port}`);

        const hash = bcrypt.hashSync(PASSWORD, 10);
        for (const u of USERS) {
            await prisma.user.upsert({
                where: { email: u.email },
                update: { name: u.name, role: u.role, department: u.department, active: true },
                create: { email: u.email, name: u.name, role: u.role, department: u.department, password: hash },
            });
        }

        const customers = [
            { code: 'KHDEV01', name: 'Nguyễn Thị Hoa (dev)', phone: '0901000001', address: '12 Nguyễn Trãi, Hà Đông' },
            { code: 'KHDEV02', name: 'Vũ Minh Quân (dev)', phone: '0901000002', address: 'Vinhomes Ocean Park, Gia Lâm' },
        ];
        const byCode = {};
        for (const c of customers) {
            byCode[c.code] = await prisma.customer.upsert({ where: { code: c.code }, update: {}, create: c });
        }
        const projects = [
            { code: 'DADEV01', name: 'Nhà phố Hà Đông (dev)', type: 'Thi công', customerId: byCode.KHDEV01.id, address: customers[0].address },
            { code: 'DADEV02', name: 'Căn hộ Ocean Park (dev)', type: 'Nội thất', customerId: byCode.KHDEV02.id, address: customers[1].address },
        ];
        const projectByCode = {};
        for (const p of projects) {
            projectByCode[p.code] = await prisma.project.upsert({ where: { code: p.code }, update: {}, create: p });
        }
        // Phiếu công việc có sẵn (chưa liên kết) để thử "Liên kết phiếu"
        await prisma.workOrder.upsert({
            where: { code: 'WODEV01' },
            update: {},
            create: { code: 'WODEV01', title: 'Kiểm tra hệ thống điện tầng 2', status: 'Chờ xử lý', priority: 'Trung bình', projectId: projectByCode.DADEV01.id },
        });

        console.log(`Đã seed ${USERS.length} tài khoản, ${customers.length} khách hàng, ${projects.length} dự án, 1 phiếu công việc.`);
        console.log(`Đăng nhập: ${USERS.map(u => u.email).join(', ')} — mật khẩu ${PASSWORD}`);
    } finally {
        await prisma.$disconnect();
    }
}

async function seedIssues(baseUrl) {
    const base = new URL(baseUrl);
    if (!['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('Từ chối: chỉ tạo dữ liệu qua dev server trên localhost.');
    console.log(`Target API: ${base.origin}`);

    const tokens = {};
    for (const u of USERS) {
        const res = await fetch(`${base.origin}/api/auth/mobile`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: u.email, password: PASSWORD }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(`Đăng nhập ${u.email} thất bại: ${json.error}`);
        tokens[u.key] = json.token;
        u.id = json.user?.id;
    }
    const call = async (who, method, path, body) => {
        const res = await fetch(`${base.origin}/api${path}`, {
            method,
            headers: { Authorization: `Bearer ${tokens[who]}`, 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${json.error || ''}`);
        return json;
    };
    const lookup = (type, q) => call('bgd', 'GET', `/customer-issues/lookups?type=${type}&search=${encodeURIComponent(q)}`).then(r => r.data[0]);

    const [p1, p2] = await Promise.all([lookup('projects', 'DADEV01'), lookup('projects', 'DADEV02')]);
    const c2 = await lookup('customers', 'KHDEV02');
    const id = (k) => USERS.find(u => u.key === k).id;
    const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

    const a = await call('xdStaff', 'POST', '/customer-issues', {
        projectId: p1.id, title: 'Cánh tủ bếp trên bị lệch', area: 'Bếp / Tủ bếp trên', category: 'FURNITURE',
        description: 'Khách báo 2 cánh tủ bếp trên lệch khoảng 5mm, đóng không khít.', priority: 'MEDIUM', source: 'ZALO',
        reporterName: 'Chị Hoa', reporterPhone: '0901000001',
    });
    const b = await call('bgd', 'POST', '/customer-issues', {
        projectId: p1.id, title: 'Thấm trần phòng ngủ 2 sau mưa', area: 'Tầng 3 / Phòng ngủ 2', category: 'WATERPROOFING',
        description: 'Vệt ố khoảng 40x60cm ở góc trần, xuất hiện sau trận mưa lớn.', priority: 'URGENT', source: 'PHONE',
        assigneeId: id('xdMgr'), collaboratorIds: [id('xdStaff')],
    });
    const c = await call('kd', 'POST', '/customer-issues', {
        customerId: c2.id, title: 'Chưa nhận hồ sơ bảo hành thiết bị', category: 'PAYMENT_DOCUMENT',
        description: 'Khách cần bản cứng phiếu bảo hành bếp từ và máy hút mùi.', priority: 'LOW', source: 'EMAIL',
    });
    const d = await call('bgd', 'POST', '/customer-issues', {
        projectId: p2.id, title: 'Ổ cắm phòng khách không có điện', area: 'Phòng khách', category: 'ELECTRICAL',
        description: 'Hai ổ cắm cạnh kệ TV không có điện.', priority: 'HIGH', source: 'SITE',
        reportedAt: daysAgo(6), dueDate: daysAgo(2), assigneeId: id('xdStaff'),
    });
    const e = await call('bgd', 'POST', '/customer-issues', {
        projectId: p2.id, title: 'Sơn tường hành lang bong tróc', area: 'Hành lang', category: 'CONSTRUCTION_QUALITY',
        description: 'Sơn bong tại 3 điểm gần chân tường.', priority: 'MEDIUM', source: 'MEETING',
        reportedAt: daysAgo(10), assigneeId: id('xuong'),
    });

    // b: đang xử lý, có phiếu công việc chưa xong -> cột "Chờ phối hợp"
    await call('xdMgr', 'POST', `/customer-issues/${b.id}/work-orders`, { mode: 'create', title: 'Chống thấm lại sân thượng khu phòng ngủ 2' });
    await call('xdStaff', 'POST', `/customer-issues/${b.id}/logs`, { message: 'Đã hẹn khách 9h sáng mai khảo sát sân thượng.' });
    // d: bắt đầu xử lý (quá hạn)
    await call('xdStaff', 'POST', `/customer-issues/${d.id}/transition`, { toStatus: 'IN_PROGRESS' });
    // e: xử lý xong -> chờ xác nhận -> hoàn thành
    await call('xuong', 'POST', `/customer-issues/${e.id}/transition`, { toStatus: 'IN_PROGRESS' });
    await call('xuong', 'POST', `/customer-issues/${e.id}/transition`, { toStatus: 'WAITING_CONFIRMATION', resolution: 'Đã cạo lớp sơn bong, bả và sơn lại 3 điểm.' });
    await call('bgd', 'POST', `/customer-issues/${e.id}/transition`, { toStatus: 'DONE' });

    console.log(`Đã tạo qua API: ${[a, b, c, d, e].map(x => x.code).join(', ')}`);
}

const i = process.argv.indexOf('--issues');
(i > -1 ? seedIssues(process.argv[i + 1] || 'http://localhost:3360') : seedBase()).catch((err) => {
    console.error(err.message);
    process.exit(1);
});
