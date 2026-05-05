/**
 * Notification helpers — gửi Zalo cho các sự kiện trong hệ thống
 */
import prisma from './prisma';
import { sendZaloMessage } from './zalo';

/**
 * Lấy zaloUserId của một user theo email
 */
async function getZaloId(email) {
    if (!email) return null;
    const user = await prisma.user.findUnique({
        where: { email },
        select: { zaloUserId: true },
    });
    return user?.zaloUserId || null;
}

/**
 * Lấy zaloUserId của tất cả quản lý (ban_gd) có liên kết Zalo
 */
async function getManagerZaloIds() {
    const managers = await prisma.user.findMany({
        where: {
            active: true,
            role: { in: ['ban_gd', 'giam_doc', 'pho_gd'] },
            zaloUserId: { not: '' },
        },
        select: { zaloUserId: true },
    });
    return managers.map(m => m.zaloUserId).filter(Boolean);
}

/**
 * 1. Thông báo giao công việc mới
 * assignee là chuỗi tên, có thể nhiều người cách nhau dấu phẩy
 * @returns {{ success: boolean, sent?: number, failed?: number, error?: string, skipped?: string }}
 */
export async function notifyWorkOrderAssigned(workOrder) {
    const assigneeNames = (workOrder.assignee || '').split(',').map(n => n.trim()).filter(Boolean);
    if (assigneeNames.length === 0) return { success: false, skipped: 'Phiếu chưa có người thực hiện' };

    const users = await prisma.user.findMany({
        where: { name: { in: assigneeNames }, active: true, zaloUserId: { not: '' } },
        select: { name: true, zaloUserId: true },
    });
    const zaloIds = users.map(u => u.zaloUserId).filter(Boolean);
    if (zaloIds.length === 0) return { success: false, skipped: `Người thực hiện chưa có Zalo User ID (tìm: ${assigneeNames.join(', ')})` };

    const due = workOrder.dueDate
        ? new Date(workOrder.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Chưa xác định';

    const projectName = workOrder.project?.name || workOrder.projectId || '';
    const appUrl = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
    const text =
        `🏠 Nội Thất SCT — Công việc mới\n` +
        `📋 [${workOrder.code}] ${workOrder.title}\n` +
        `${projectName ? `📁 Dự án: ${projectName}\n` : ''}` +
        `⚡ Ưu tiên: ${workOrder.priority || 'Bình thường'}\n` +
        `📅 Hạn chót: ${due}`;

    const results = await Promise.allSettled(zaloIds.map(id => sendZaloMessage(id, text)));
    let sent = 0, failed = 0;
    results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value?.success) sent++;
        else { failed++; console.error(`[notify] workOrderAssigned thất bại [${zaloIds[i]}]:`, r.reason || r.value?.error); }
    });
    if (sent > 0) return { success: true, sent, failed };
    return { success: false, error: `Gửi thất bại (${failed} người)` };
}

/**
 * 2. Thông báo đề xuất / kiến nghị được duyệt hoặc từ chối
 * @returns {{ success: boolean, error?: string, skipped?: string }}
 */
export async function notifyProposalReviewed(proposal) {
    const zaloId = await getZaloId(proposal.submittedBy);
    if (!zaloId) return { success: false, skipped: 'Người gửi đề xuất chưa có Zalo User ID' };

    const icon = proposal.status === 'Đã duyệt' ? '✅' : proposal.status === 'Từ chối' ? '❌' : '🔄';
    const text =
        `${icon} ${proposal.type || 'Đề xuất'} của bạn đã được phản hồi\n` +
        `📝 "${proposal.title}"\n` +
        `Trạng thái: ${proposal.status}\n` +
        (proposal.response ? `💬 Phản hồi: ${proposal.response}` : '') +
        (proposal.respondedBy ? `\n— ${proposal.respondedBy}` : '');

    const result = await sendZaloMessage(zaloId, text);
    if (!result.success) console.error('[notify] proposalReviewed thất bại:', result.error);
    return result;
}

/**
 * 3. Thông báo giao công việc xưởng cho thợ
 * Ưu tiên WorkshopWorker.zaloUserId, fallback tìm theo tên trong bảng User
 * @param {object} task - { title, deadline, priority, project, workers: [{worker: {name, zaloUserId}}] }
 */
export async function notifyWorkshopTaskAssigned(task) {
    const workers = task.workers || [];
    if (workers.length === 0) return { sent: 0, failed: 0, skipped: 'Không có thợ nào được giao' };

    const due = task.deadline
        ? new Date(task.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : 'Chưa xác định';

    const projectName = task.project?.name || '';
    const text =
        `🪚 Nội Thất SCT — Công việc xưởng mới\n` +
        `📋 ${task.title}\n` +
        `${projectName ? `📁 Dự án: ${projectName}\n` : ''}` +
        `⚡ Ưu tiên: ${task.priority || 'Trung bình'}\n` +
        `📅 Hạn hoàn thành: ${due}`;

    let sent = 0, failed = 0, skipped = 0;
    for (const { worker } of workers) {
        if (!worker) { skipped++; continue; }

        // Ưu tiên zaloUserId trong WorkshopWorker, fallback tìm theo tên trong User
        let zaloId = worker.zaloUserId || '';
        if (!zaloId && worker.name) {
            const userMatch = await prisma.user.findFirst({
                where: { name: worker.name, active: true, zaloUserId: { not: '' } },
                select: { zaloUserId: true },
            });
            zaloId = userMatch?.zaloUserId || '';
        }

        if (!zaloId) {
            console.warn(`[notify] workshopTask: thợ "${worker.name}" chưa có Zalo User ID`);
            skipped++;
            continue;
        }

        const result = await sendZaloMessage(zaloId, text);
        if (result.success) sent++;
        else { failed++; console.error(`[notify] workshopTask thất bại [${worker.name}]:`, result.error); }
    }
    return { sent, failed, skipped };
}

/**
 * 4. Thông báo tiến độ dự án được cập nhật (gửi cho quản lý)
 * @returns {{ sent: number, failed: number, skipped?: string }}
 */
export async function notifyProgressUpdated({ taskName, projectCode, projectName, progressFrom, progressTo, updatedBy }) {
    const zaloIds = await getManagerZaloIds();
    if (zaloIds.length === 0) return { sent: 0, failed: 0, skipped: 'Không có quản lý nào có Zalo User ID' };

    const isComplete = progressTo === 100;
    const text =
        `${isComplete ? '🎉' : '📊'} Cập nhật tiến độ — ${projectCode || projectName}\n` +
        `🔧 Hạng mục: ${taskName}\n` +
        `📈 Tiến độ: ${progressFrom}% → ${progressTo}%${isComplete ? ' (Hoàn thành!)' : ''}\n` +
        `👤 Cập nhật bởi: ${updatedBy}`;

    const results = await Promise.allSettled(zaloIds.map(id => sendZaloMessage(id, text)));
    let sent = 0, failed = 0;
    results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value?.success) {
            sent++;
        } else {
            failed++;
            console.error(`[notify] progressUpdated thất bại [${zaloIds[i]}]:`, r.reason || r.value?.error);
        }
    });
    return { sent, failed };
}
