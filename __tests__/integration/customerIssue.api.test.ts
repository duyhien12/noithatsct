// @vitest-environment node
/**
 * Test tích hợp API Đồng hành 360 trên DATABASE DEV RIÊNG.
 * Chỉ chạy khi đặt DH360_TEST_DATABASE_URL; tự dừng nếu không phải localhost:5432/noithatsct_donghanh360_dev.
 *   $env:DH360_TEST_DATABASE_URL='postgresql://postgres@localhost:5432/noithatsct_donghanh360_dev?schema=public'
 *   npx vitest run __tests__/integration
 * Gọi thẳng route handler (không qua next dev) bằng Bearer token ký bằng secret riêng của test.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// @ts-expect-error -- dự án không cài @types/jsonwebtoken (lib/apiHandler.js cũng dùng không có kiểu)
import jwt from 'jsonwebtoken';
import { rm } from 'fs/promises';
import path from 'path';

const DB_URL = process.env.DH360_TEST_DATABASE_URL || '';
const DEV_DB = { host: 'localhost', port: '5432', database: 'noithatsct_donghanh360_dev' };

function assertDevUrl(url: string) {
    const u = new URL(url.replace(/^postgres(ql)?:/, 'http:'));
    const target = { host: u.hostname, port: u.port || '5432', database: u.pathname.replace(/^\//, '') };
    if (target.host !== DEV_DB.host || target.port !== DEV_DB.port || target.database !== DEV_DB.database) {
        throw new Error(`DỪNG: test chỉ chạy trên DB dev, nhận được ${target.host}:${target.port}/${target.database}`);
    }
}

const SECRET = 'dh360-integration-test-secret';
const RUN = Date.now().toString(36);
const BASE = 'http://localhost/api';

let prisma: any;
let R: Record<string, any> = {};
const uploadedFiles: string[] = [];

type User = { id: string; email: string; name: string; role: string };
const users: Record<string, User> = {};
const ids: Record<string, string> = {};

function token(u?: User) {
    return u ? jwt.sign({ id: u.id, email: u.email, name: u.name, role: u.role }, SECRET) : '';
}

async function call(handler: Function, opts: { method?: string; path: string; user?: User; body?: any; params?: any; raw?: BodyInit; headers?: Record<string, string> }) {
    const headers: Record<string, string> = { ...(opts.headers || {}) };
    if (opts.user) headers.authorization = `Bearer ${token(opts.user)}`;
    let body: BodyInit | undefined = opts.raw;
    if (opts.body !== undefined) { headers['content-type'] = 'application/json'; body = JSON.stringify(opts.body); }
    const req = new Request(`${BASE}${opts.path}`, { method: opts.method || 'GET', headers, body });
    const res = await handler(req, { params: Promise.resolve(opts.params || {}) });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
}

const logsOf = (issueId: string) => prisma.customerIssueLog.findMany({ where: { issueId }, orderBy: { createdAt: 'asc' } });

describe.skipIf(!DB_URL)('Đồng hành 360 — API trên DB dev', () => {
    beforeAll(async () => {
        assertDevUrl(DB_URL);
        process.env.DATABASE_URL = DB_URL;
        process.env.NEXTAUTH_SECRET = SECRET;
        // Không cho upload/Zalo đi ra ngoài trong lúc test. Đặt chuỗi rỗng (không xoá) TRƯỚC khi import:
        // Prisma Client tự nạp .env bằng dotenv, dotenv không ghi đè biến đã tồn tại.
        const OUTBOUND = ['UPLOAD_FORWARD_URL', 'UPLOAD_SERVICE_KEY', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'ZALO_OA_ACCESS_TOKEN', 'ZALO_OA_REFRESH_TOKEN', 'ZALO_APP_SECRET', 'NEXT_PUBLIC_BASE_URL'];
        for (const k of OUTBOUND) process.env[k] = '';

        prisma = (await import('@/lib/prisma')).default;
        const leaked = OUTBOUND.filter(k => process.env[k]);
        if (leaked.length) throw new Error(`DỪNG: biến gửi ra ngoài bị nạp lại: ${leaked.join(', ')}`);
        const [db] = await prisma.$queryRawUnsafe('SELECT current_database() AS db, inet_server_port() AS port');
        if (db.db !== DEV_DB.database || String(db.port) !== DEV_DB.port) throw new Error(`DỪNG: đang kết nối ${db.db}:${db.port}`);

        R = {
            list: await import('@/app/api/customer-issues/route'),
            stats: await import('@/app/api/customer-issues/stats/route'),
            one: await import('@/app/api/customer-issues/[id]/route'),
            assign: await import('@/app/api/customer-issues/[id]/assign/route'),
            transition: await import('@/app/api/customer-issues/[id]/transition/route'),
            collab: await import('@/app/api/customer-issues/[id]/collaborators/route'),
            files: await import('@/app/api/customer-issues/[id]/attachments/route'),
            file: await import('@/app/api/customer-issues/[id]/attachments/[attachmentId]/route'),
            logs: await import('@/app/api/customer-issues/[id]/logs/route'),
            wo: await import('@/app/api/customer-issues/[id]/work-orders/route'),
            woOne: await import('@/app/api/work-orders/[id]/route'),
            upload: await import('@/app/api/upload/route'),
        };

        const mk = async (key: string, role: string, department = '') => {
            const u = await prisma.user.create({
                data: { email: `${key}-${RUN}@dh360.test`, name: `${key} ${RUN}`, password: 'x', role, department },
            });
            users[key] = { id: u.id, email: u.email, name: u.name, role };
        };
        await mk('boss', 'ban_gd');
        await mk('xdStaff', 'xay_dung', 'Nhân viên');
        await mk('xdMgr', 'xay_dung', 'Trưởng phòng');
        await mk('kd', 'kinh_doanh', 'Nhân viên');
        await mk('mkt', 'marketing');
        await mk('worker', 'xuong', 'Thợ chính');

        const cA = await prisma.customer.create({ data: { code: `KHT${RUN}A`, name: 'Khách A', phone: '0900000001' } });
        const cB = await prisma.customer.create({ data: { code: `KHT${RUN}B`, name: 'Khách B', phone: '0900000002' } });
        const pA = await prisma.project.create({ data: { code: `DAT${RUN}A`, name: 'Dự án A', type: 'Nội thất', customerId: cA.id } });
        const pB = await prisma.project.create({ data: { code: `DAT${RUN}B`, name: 'Dự án B', type: 'Nội thất', customerId: cB.id } });
        const woA = await prisma.workOrder.create({ data: { code: `WOT${RUN}A`, title: 'Phiếu có sẵn A', projectId: pA.id } });
        const woB = await prisma.workOrder.create({ data: { code: `WOT${RUN}B`, title: 'Phiếu có sẵn B', projectId: pB.id } });
        Object.assign(ids, { cA: cA.id, cB: cB.id, pA: pA.id, pB: pB.id, woA: woA.id, woB: woB.id });
    }, 60_000);

    afterAll(async () => {
        for (const f of uploadedFiles) await rm(f, { force: true });
        await prisma?.$disconnect();
    });

    const issueBody = (extra = {}) => ({ title: 'Cánh tủ bếp lệch', category: 'FURNITURE', description: 'Cánh tủ trên lệch 5mm', area: 'Bếp / Tủ trên', ...extra });

    describe('xác thực, phân quyền, validate', () => {
        it('401 khi không đăng nhập', async () => {
            const r = await call(R.list.GET, { path: '/customer-issues' });
            expect(r.status).toBe(401);
        });
        it('403 khi phòng ban không có quyền ghi nhận', async () => {
            const r = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.mkt, body: issueBody({ customerId: ids.cA }) });
            expect(r.status).toBe(403);
        });
        it('400 kèm chi tiết khi thiếu dữ liệu / dùng nhãn tiếng Việt', async () => {
            const r1 = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.xdStaff, body: { customerId: ids.cA, category: 'FURNITURE' } });
            expect(r1.status).toBe(400);
            expect(r1.json.details.map((d: any) => d.path)).toEqual(expect.arrayContaining(['title', 'description']));
            const r2 = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.xdStaff, body: issueBody({ customerId: ids.cA, priority: 'Cao' }) });
            expect(r2.status).toBe(400);
            const r3 = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.xdStaff, raw: '{bad json', headers: { 'content-type': 'application/json' } });
            expect(r3.status).toBe(400);
        });
        it('400 khi dự án không thuộc khách hàng', async () => {
            const r = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.kd, body: issueBody({ customerId: ids.cA, projectId: ids.pB }) });
            expect(r.status).toBe(400);
            expect(r.json.error).toMatch(/không thuộc khách hàng/);
        });
        it('403 khi nhân viên tự phân công lúc tạo', async () => {
            const r = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.xdStaff, body: issueBody({ projectId: ids.pA, assigneeId: users.worker.id }) });
            expect(r.status).toBe(403);
        });
    });

    describe('tạo / sửa / xoá mềm', () => {
        it('tạo từ dự án: tự lấy khách hàng, sinh mã, hạn mặc định, ghi nhật ký', async () => {
            const r = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.xdStaff, body: issueBody({ projectId: ids.pA }) });
            expect(r.status).toBe(201);
            expect(r.json).toMatchObject({ customerId: ids.cA, projectId: ids.pA, status: 'NEW', priority: 'MEDIUM', createdById: users.xdStaff.id });
            expect(r.json.code).toMatch(/^DH\d{4,}$/);
            const days = (new Date(r.json.dueDate).getTime() - new Date(r.json.reportedAt).getTime()) / 86_400_000;
            expect(days).toBeCloseTo(7, 5);
            ids.i1 = r.json.id;
            expect((await logsOf(ids.i1)).map((l: any) => l.action)).toEqual(['CREATED']);
        });
        it('Ban GĐ tạo kèm phân công + phối hợp, gửi thông báo trong app', async () => {
            const r = await call(R.list.POST, {
                method: 'POST', path: '/customer-issues', user: users.boss,
                body: issueBody({ customerId: ids.cA, title: 'Thấm trần WC', category: 'WATERPROOFING', priority: 'URGENT', assigneeId: users.worker.id, collaboratorIds: [users.xdStaff.id, users.worker.id] }),
            });
            expect(r.status).toBe(201);
            ids.i2 = r.json.id;
            expect(r.json.assigneeName).toBe(users.worker.name);
            const collabs = await prisma.customerIssueCollaborator.findMany({ where: { issueId: ids.i2 } });
            expect(collabs.map((c: any) => c.userId)).toEqual([users.xdStaff.id]); // người phụ trách bị loại khỏi phối hợp
            const notes = await prisma.notification.count({ where: { userId: { in: [users.worker.id, users.xdStaff.id] }, type: 'customer_issue' } });
            expect(notes).toBe(2);
        });
        it('chi tiết trả quyền và bước chuyển hợp lệ theo người xem', async () => {
            const r = await call(R.one.GET, { path: `/customer-issues/${ids.i1}`, user: users.xdStaff, params: { id: ids.i1 } });
            expect(r.status).toBe(200);
            expect(r.json.customer.id).toBe(ids.cA);
            expect(r.json.permissions.delete).toBe(false);
            expect(r.json.allowedTransitions).toEqual(['IN_PROGRESS']);
        });
        it('sửa: ghi nhật ký thay đổi; không đổi gì thì không ghi; không cho đổi trạng thái qua PATCH', async () => {
            const r = await call(R.one.PATCH, { method: 'PATCH', path: `/customer-issues/${ids.i1}`, user: users.xdStaff, params: { id: ids.i1 }, body: { title: 'Cánh tủ bếp lệch 5mm', area: 'Bếp' } });
            expect(r.status).toBe(200);
            expect(r.json.title).toBe('Cánh tủ bếp lệch 5mm');
            const same = await call(R.one.PATCH, { method: 'PATCH', path: `/customer-issues/${ids.i1}`, user: users.xdStaff, params: { id: ids.i1 }, body: { area: 'Bếp' } });
            expect(same.status).toBe(200);
            const logs = await logsOf(ids.i1);
            expect(logs.filter((l: any) => l.action === 'UPDATED')).toHaveLength(1);
            expect(JSON.parse(logs.at(-1).meta).changes.area).toEqual({ from: 'Bếp / Tủ trên', to: 'Bếp' });
            const bad = await call(R.one.PATCH, { method: 'PATCH', path: `/customer-issues/${ids.i1}`, user: users.xdStaff, params: { id: ids.i1 }, body: { status: 'DONE' } });
            expect(bad.status).toBe(400);
        });
        it('phân quyền sửa: KD nhân viên bị chặn; thợ xưởng chỉ sửa được vấn đề mình phụ trách', async () => {
            expect((await call(R.one.PATCH, { method: 'PATCH', path: `/customer-issues/${ids.i1}`, user: users.kd, params: { id: ids.i1 }, body: { area: 'X' } })).status).toBe(403);
            expect((await call(R.one.PATCH, { method: 'PATCH', path: `/customer-issues/${ids.i2}`, user: users.worker, params: { id: ids.i2 }, body: { area: 'WC tầng 2' } })).status).toBe(200);
            expect((await call(R.one.PATCH, { method: 'PATCH', path: `/customer-issues/${ids.i1}`, user: users.worker, params: { id: ids.i1 }, body: { area: 'X' } })).status).toBe(403);
            expect((await call(R.one.GET, { path: `/customer-issues/${ids.i1}`, user: users.mkt, params: { id: ids.i1 } })).status).toBe(404);
        });
        it('xoá mềm: chỉ Ban GĐ; ẩn khỏi danh sách/chi tiết, giữ bản ghi + nhật ký', async () => {
            const tmp = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.kd, body: issueBody({ customerId: ids.cB, title: 'Tạo nhầm' }) });
            expect(tmp.status).toBe(201);
            const id = tmp.json.id;
            expect((await call(R.one.DELETE, { method: 'DELETE', path: `/customer-issues/${id}`, user: users.xdMgr, params: { id } })).status).toBe(403);
            expect((await call(R.one.DELETE, { method: 'DELETE', path: `/customer-issues/${id}`, user: users.boss, params: { id } })).status).toBe(200);
            expect((await call(R.one.GET, { path: `/customer-issues/${id}`, user: users.boss, params: { id } })).status).toBe(404);
            const list = await call(R.list.GET, { path: `/customer-issues?customerId=${ids.cB}`, user: users.boss });
            expect(list.json.data.map((i: any) => i.id)).not.toContain(id);
            const row = await prisma.customerIssue.findFirst({ where: { id, deletedAt: { not: null } } });
            expect(row).not.toBeNull();
            expect((await logsOf(id)).map((l: any) => l.action)).toEqual(['CREATED', 'DELETED']);
        });
    });

    describe('kéo thả Kanban (chuyển trạng thái)', () => {
        const move = (id: string, user: User, body: any) => call(R.transition.POST, { method: 'POST', path: `/customer-issues/${id}/transition`, user, params: { id }, body });

        it('đi hết quy trình với kiểm tra điều kiện và quyền', async () => {
            expect((await move(ids.i1, users.xdStaff, { toStatus: 'DONE' })).status).toBe(400);
            expect((await move(ids.i1, users.xdStaff, { toStatus: 'IN_PROGRESS' })).status).toBe(200);
            const noRes = await move(ids.i1, users.xdStaff, { toStatus: 'WAITING_CONFIRMATION' });
            expect(noRes.status).toBe(400);
            expect(noRes.json.error).toMatch(/kết quả xử lý/);
            const ok = await move(ids.i1, users.xdStaff, { toStatus: 'WAITING_CONFIRMATION', resolution: 'Đã chỉnh bản lề' });
            expect(ok.status).toBe(200);
            expect(ok.json.resolvedAt).toBeTruthy();
            expect((await move(ids.i1, users.xdStaff, { toStatus: 'DONE' })).status).toBe(403);
            const done = await move(ids.i1, users.xdMgr, { toStatus: 'DONE' });
            expect(done.status).toBe(200);
            expect(done.json).toMatchObject({ status: 'DONE', confirmedById: users.xdMgr.id });
            expect((await move(ids.i1, users.xdMgr, { toStatus: 'IN_PROGRESS' })).status).toBe(400); // mở lại cần lý do
            const steps = (await logsOf(ids.i1)).filter((l: any) => l.action === 'STATUS_CHANGED').map((l: any) => `${l.fromStatus}>${l.toStatus}`);
            expect(steps).toEqual(['NEW>IN_PROGRESS', 'IN_PROGRESS>WAITING_CONFIRMATION', 'WAITING_CONFIRMATION>DONE']);
        });
        it('hai người kéo cùng lúc: chỉ một lần thành công', async () => {
            const r = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.xdStaff, body: issueBody({ projectId: ids.pA, title: 'Đèn hắt chập chờn', category: 'ELECTRICAL' }) });
            const id = r.json.id;
            const results = await Promise.all([
                move(id, users.xdStaff, { toStatus: 'IN_PROGRESS' }),
                move(id, users.xdMgr, { toStatus: 'IN_PROGRESS' }),
            ]);
            expect(results.filter(x => x.status === 200)).toHaveLength(1);
            expect(results.find(x => x.status !== 200)!.status).toBeOneOf([400, 409]);
            const changes = (await logsOf(id)).filter((l: any) => l.action === 'STATUS_CHANGED');
            expect(changes).toHaveLength(1);
        });
        it('Kanban trả đúng 4 cột chính', async () => {
            const r = await call(R.list.GET, { path: `/customer-issues?view=kanban&customerId=${ids.cA}`, user: users.boss });
            expect(r.status).toBe(200);
            expect(r.json.columns.map((c: any) => c.key)).toEqual(['NEW', 'IN_PROGRESS', 'COORDINATION', 'CLOSING']);
            expect(r.json.columns.find((c: any) => c.key === 'CLOSING').items.map((i: any) => i.id)).toContain(ids.i1);
        });
    });

    describe('phân công và người phối hợp', () => {
        it('phân công / thêm / bỏ phối hợp theo quyền', async () => {
            expect((await call(R.assign.POST, { method: 'POST', path: '/x', user: users.xdStaff, params: { id: ids.i2 }, body: { assigneeId: users.xdStaff.id } })).status).toBe(403);
            const a = await call(R.assign.POST, { method: 'POST', path: '/x', user: users.xdMgr, params: { id: ids.i2 }, body: { assigneeId: users.xdStaff.id } });
            expect(a.status).toBe(200);
            expect(a.json.assigneeId).toBe(users.xdStaff.id);
            // xdStaff đang là phối hợp -> bị chuyển khỏi danh sách phối hợp
            expect(await prisma.customerIssueCollaborator.count({ where: { issueId: ids.i2, userId: users.xdStaff.id } })).toBe(0);

            const add = (user: User, userId: string) => call(R.collab.POST, { method: 'POST', path: '/x', user, params: { id: ids.i2 }, body: { userId } });
            expect((await add(users.xdMgr, users.kd.id)).status).toBe(201);
            expect((await add(users.xdMgr, users.kd.id)).status).toBe(409);
            expect((await add(users.xdMgr, users.xdStaff.id)).status).toBe(400);
            expect((await add(users.xdMgr, 'khong-ton-tai')).status).toBe(400);
            const del = (user: User, userId: string) => call(R.collab.DELETE, { method: 'DELETE', path: `/x?userId=${userId}`, user, params: { id: ids.i2 } });
            expect((await del(users.xdStaff, users.kd.id)).status).toBe(403);
            expect((await del(users.xdMgr, users.kd.id)).status).toBe(200);
            expect((await del(users.xdMgr, users.kd.id)).status).toBe(404);
            const actions = (await logsOf(ids.i2)).map((l: any) => l.action);
            expect(actions).toEqual(expect.arrayContaining(['ASSIGNED', 'COLLABORATOR_ADDED', 'COLLABORATOR_REMOVED']));
        });
    });

    describe('upload và quản lý tệp', () => {
        it('upload qua /api/upload rồi đăng ký ảnh trước/sau, gỡ theo quyền', async () => {
            const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
            const fd = new FormData();
            fd.append('type', 'proofs');
            fd.append('file', new Blob([png], { type: 'image/png' }), 'truoc.png');
            const req = new Request(`${BASE}/upload`, { method: 'POST', headers: { authorization: `Bearer ${token(users.xdStaff)}` }, body: fd });
            const up = await R.upload.POST(req, { params: Promise.resolve({}) });
            const upJson = await up.json();
            expect(up.status).toBe(200);
            expect(upJson.url).toMatch(/^\/uploads\/proofs\/[\w-]+\.png$/);
            uploadedFiles.push(path.join(process.cwd(), 'public', upJson.url));

            const post = (user: User, body: any) => call(R.files.POST, { method: 'POST', path: '/x', user, params: { id: ids.i2 }, body });
            expect((await post(users.xdStaff, { category: 'PHOTO', url: upJson.url })).status).toBe(400);
            expect((await post(users.xdStaff, { category: 'BEFORE', url: 'javascript:alert(1)' })).status).toBe(400);
            expect((await post(users.mkt, { category: 'BEFORE', url: upJson.url })).status).toBe(404);
            // Mục ảnh chỉ nhận ảnh; mục tài liệu chặn định dạng lạ
            const pdf = await post(users.xdStaff, { category: 'AFTER', url: '/uploads/proofs/x.pdf', fileName: 'bien-ban.pdf', mimeType: 'application/pdf' });
            expect(pdf.status).toBe(400);
            expect(pdf.json.error).toMatch(/chỉ nhận tệp ảnh/);
            expect((await post(users.xdStaff, { category: 'DOCUMENT', url: '/uploads/proofs/x.exe', fileName: 'x.exe' })).status).toBe(400);
            const ok = await post(users.xdStaff, { category: 'BEFORE', url: upJson.url, fileName: 'truoc.png', mimeType: 'image/png' });
            expect(ok.status).toBe(201);
            const after = await post(users.xdStaff, { category: 'AFTER', url: upJson.url, fileName: 'sau.png' });
            expect(after.status).toBe(201);

            const before = await call(R.files.GET, { path: '/x?category=BEFORE', user: users.kd, params: { id: ids.i2 } });
            expect(before.json.data).toHaveLength(1);

            const delOf = (user: User, attachmentId: string) => call(R.file.DELETE, { method: 'DELETE', path: '/x', user, params: { id: ids.i2, attachmentId } });
            expect((await delOf(users.kd, ok.json.id)).status).toBe(403); // KD có quyền tệp nhưng không phải người upload
            expect((await delOf(users.xdStaff, ok.json.id)).status).toBe(200);
            expect((await delOf(users.xdStaff, ok.json.id)).status).toBe(404);
            const rest = await call(R.files.GET, { path: '/x', user: users.boss, params: { id: ids.i2 } });
            expect(rest.json.data.map((a: any) => a.category)).toEqual(['AFTER']);
            const actions = (await logsOf(ids.i2)).map((l: any) => l.action);
            expect(actions.filter((a: string) => a === 'FILE_ADDED')).toHaveLength(2);
            expect(actions).toContain('FILE_REMOVED');
        });
    });

    describe('nhật ký hoạt động', () => {
        it('thêm ghi chú theo quyền; không có API sửa/xoá nhật ký', async () => {
            const note = await call(R.logs.POST, { method: 'POST', path: '/x', user: users.worker, params: { id: ids.i2 }, body: { message: 'Đã hẹn khách 9h sáng mai' } });
            expect(note.status).toBe(201);
            expect(note.json).toMatchObject({ action: 'NOTE', actorId: users.worker.id });
            expect((await call(R.logs.POST, { method: 'POST', path: '/x', user: users.worker, params: { id: ids.i2 }, body: { message: '' } })).status).toBe(400);
            const list = await call(R.logs.GET, { path: '/x', user: users.kd, params: { id: ids.i2 } });
            expect(list.json.data[0].action).toBe('NOTE');
            expect(Object.keys(R.logs).filter(k => ['PUT', 'PATCH', 'DELETE'].includes(k))).toEqual([]);
        });
    });

    describe('liên kết Phiếu công việc', () => {
        it('tạo + liên kết phiếu, hoàn thành phiếu -> Chờ xác nhận; phiếu thường không bị ảnh hưởng', async () => {
            const noProject = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.xdStaff, body: issueBody({ customerId: ids.cA, title: 'Chưa gắn dự án' }) });
            expect((await call(R.wo.POST, { method: 'POST', path: '/x', user: users.xdStaff, params: { id: noProject.json.id }, body: { mode: 'create', title: 'Sửa' } })).status).toBe(400);

            const issue = await call(R.list.POST, { method: 'POST', path: '/customer-issues', user: users.xdStaff, body: issueBody({ projectId: ids.pA, title: 'Ron cửa kính hở', priority: 'HIGH' }) });
            const id = issue.json.id;
            const created = await call(R.wo.POST, { method: 'POST', path: '/x', user: users.xdStaff, params: { id }, body: { mode: 'create', title: 'Thay ron cửa kính' } });
            expect(created.status).toBe(201);
            expect(created.json).toMatchObject({ projectId: ids.pA, customerIssueId: id, priority: 'Cao', status: 'Chờ xử lý' });
            expect((await prisma.customerIssue.findFirst({ where: { id } })).status).toBe('IN_PROGRESS');

            // Còn phiếu đang mở -> nằm ở cột "Chờ phối hợp", không ở "Đang xử lý"
            const board = await call(R.list.GET, { path: `/customer-issues?view=kanban&projectId=${ids.pA}`, user: users.boss });
            const col = (b: any, key: string) => b.json.columns.find((c: any) => c.key === key).items;
            expect(col(board, 'COORDINATION').find((i: any) => i.id === id)?.openWorkOrderCount).toBe(1);
            expect(col(board, 'IN_PROGRESS').map((i: any) => i.id)).not.toContain(id);

            expect((await call(R.wo.POST, { method: 'POST', path: '/x', user: users.xdStaff, params: { id }, body: { mode: 'link', workOrderId: ids.woB } })).status).toBe(400);
            expect((await call(R.wo.POST, { method: 'POST', path: '/x', user: users.xdStaff, params: { id }, body: { mode: 'link', workOrderId: ids.woA } })).status).toBe(200);
            expect((await call(R.wo.POST, { method: 'POST', path: '/x', user: users.xdStaff, params: { id }, body: { mode: 'link', workOrderId: ids.woA } })).status).toBe(409);
            expect((await call(R.wo.POST, { method: 'POST', path: '/x', user: users.kd, params: { id }, body: { mode: 'link', workOrderId: ids.woA } })).status).toBe(403);

            const putWo = (woId: string, body: any) => call(R.woOne.PUT, { method: 'PUT', path: `/work-orders/${woId}`, user: users.xdStaff, params: { id: woId }, body });
            // Phiếu 1 xong: vấn đề vẫn Đang xử lý vì phiếu 2 chưa xong, kết quả phiếu được nối vào
            expect((await putWo(created.json.id, { status: 'Hoàn thành' })).status).toBe(200);
            let row = await prisma.customerIssue.findFirst({ where: { id } });
            expect(row.status).toBe('IN_PROGRESS');
            expect(row.resolution).toBe(`${created.json.code}: Thay ron cửa kính`);
            // Phiếu 2 xong: đủ điều kiện -> Chờ xác nhận
            expect((await putWo(ids.woA, { status: 'Hoàn thành' })).status).toBe(200);
            row = await prisma.customerIssue.findFirst({ where: { id } });
            expect(row.status).toBe('WAITING_CONFIRMATION');
            expect(row.resolution.split('\n')).toHaveLength(2);
            const after = await call(R.list.GET, { path: `/customer-issues?view=kanban&projectId=${ids.pA}`, user: users.boss });
            expect(col(after, 'CLOSING').map((i: any) => i.id)).toContain(id);
            const actions = (await logsOf(id)).map((l: any) => l.action);
            expect(actions.filter((a: string) => a === 'WORK_ORDER_COMPLETED')).toHaveLength(2);
            expect(actions.at(-1)).toBe('STATUS_CHANGED');

            // Phiếu thường (không liên kết): vẫn cập nhật bình thường, không sinh nhật ký Đồng hành 360
            const before = await prisma.customerIssueLog.count();
            const plain = await putWo(ids.woB, { status: 'Hoàn thành' });
            expect(plain.status).toBe(200);
            expect(plain.json.completedAt).toBeTruthy();
            expect(await prisma.customerIssueLog.count()).toBe(before);
        });
    });

    describe('danh sách, bộ lọc và KPI', () => {
        it('lọc theo khách hàng / dự án / trạng thái / từ khoá, có phân trang', async () => {
            const byCustomer = await call(R.list.GET, { path: `/customer-issues?customerId=${ids.cA}&limit=2`, user: users.kd });
            expect(byCustomer.status).toBe(200);
            expect(byCustomer.json.pagination).toMatchObject({ limit: 2, page: 1 });
            expect(byCustomer.json.data.length).toBeLessThanOrEqual(2);
            expect(byCustomer.json.pagination.total).toBeGreaterThanOrEqual(4);
            expect(byCustomer.json.data.every((i: any) => i.customerId === ids.cA)).toBe(true);

            const byProject = await call(R.list.GET, { path: `/customer-issues?projectId=${ids.pA}&status=DONE,WAITING_CONFIRMATION`, user: users.boss });
            expect(byProject.json.data.every((i: any) => i.projectId === ids.pA && ['DONE', 'WAITING_CONFIRMATION'].includes(i.status))).toBe(true);

            const search = await call(R.list.GET, { path: `/customer-issues?customerId=${ids.cA}&search=${encodeURIComponent('thấm trần')}`, user: users.boss });
            expect(search.json.data.map((i: any) => i.id)).toEqual([ids.i2]);

            const overdue = await call(R.list.GET, { path: `/customer-issues?customerId=${ids.cA}&due=overdue`, user: users.boss });
            expect(overdue.status).toBe(200);
            expect(overdue.json.data.every((i: any) => new Date(i.dueDate) < new Date() && i.status !== 'DONE')).toBe(true);
            const week = await call(R.list.GET, { path: `/customer-issues?customerId=${ids.cA}&due=week`, user: users.boss });
            expect(week.json.data.length).toBeGreaterThan(0);
            expect(week.json.data.every((i: any) => new Date(i.dueDate) >= new Date(Date.now() - 60_000))).toBe(true);

            const hidden = await call(R.list.GET, { path: `/customer-issues?customerId=${ids.cA}`, user: users.mkt });
            expect(hidden.json.data).toEqual([]);
        });
        it('KPI theo khách hàng', async () => {
            const r = await call(R.stats.GET, { path: `/customer-issues/stats?customerId=${ids.cA}`, user: users.boss });
            expect(r.status).toBe(200);
            expect(r.json.byStatus.DONE).toBe(1);
            expect(r.json.total).toBe(Object.values(r.json.byStatus).reduce((a: any, b: any) => a + b, 0));
            expect(r.json.urgentOpen).toBe(1);
            expect(r.json.doneThisMonth).toBe(1);
            expect(r.json.avgResolutionHours).not.toBeNull();
        });
    });
});
