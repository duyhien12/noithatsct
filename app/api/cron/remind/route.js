import prisma from '@/lib/prisma';
import { sendZaloMessage } from '@/lib/zalo';
import { NextResponse } from 'next/server';

// Bảo vệ endpoint này bằng CRON_SECRET
function checkSecret(request) {
    const secret = request.headers.get('x-cron-secret');
    return secret === process.env.CRON_SECRET;
}

/**
 * GET /api/cron/remind
 * Gọi mỗi sáng để gửi nhắc nhở đến nhân viên qua Zalo
 * Header: x-cron-secret: <CRON_SECRET>
 */
export async function GET(request) {
    if (!checkSecret(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    // Lấy tất cả nhân viên có Zalo ID
    const users = await prisma.user.findMany({
        where: { active: true, zaloUserId: { not: '' } },
        select: { id: true, name: true, email: true, zaloUserId: true },
    });

    if (users.length === 0) {
        return NextResponse.json({ message: 'Không có nhân viên nào đã liên kết Zalo', sent: 0 });
    }

    const userMap = new Map(users.map(u => [u.email, u]));
    const results = [];

    for (const user of users) {
        const messages = [];

        // ── Công việc (WorkOrder) đến hạn hôm nay hoặc ngày mai
        const workOrders = await prisma.workOrder.findMany({
            where: {
                assignee: user.email,
                deletedAt: null,
                status: { notIn: ['Hoàn thành', 'Đã huỷ'] },
                dueDate: { gte: today, lt: dayAfter },
            },
            select: { code: true, title: true, dueDate: true, status: true, priority: true },
        });

        if (workOrders.length > 0) {
            const lines = workOrders.map(wo => {
                const isToday = wo.dueDate >= today && wo.dueDate < tomorrow;
                const label = isToday ? '⚠️ HÔM NAY' : '📅 NGÀY MAI';
                return `  ${label} - [${wo.code}] ${wo.title} (${wo.priority})`;
            });
            messages.push(`📋 *Công việc sắp đến hạn:*\n${lines.join('\n')}`);
        }

        // ── Tiến độ dự án chưa cập nhật quá 3 ngày
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const staleTasks = await prisma.scheduleTask.findMany({
            where: {
                assignee: user.email,
                status: { notIn: ['Hoàn thành', 'Xác nhận hoàn thành'] },
                progress: { lt: 100 },
                updatedAt: { lt: threeDaysAgo },
                isLocked: false,
            },
            include: { project: { select: { code: true, name: true } } },
            take: 5,
        });

        if (staleTasks.length > 0) {
            const lines = staleTasks.map(t =>
                `  🔧 ${t.project?.code || ''} - ${t.name} (${t.progress}%)`
            );
            messages.push(`⏰ *Tiến độ chưa cập nhật (>3 ngày):*\n${lines.join('\n')}`);
        }

        // ── Phiếu đề xuất / kiến nghị chưa được phản hồi (dành cho người tạo)
        const pendingProposals = await prisma.proposal.findMany({
            where: {
                createdBy: user.name,
                status: 'Chờ phản hồi',
                createdAt: { lt: threeDaysAgo },
            },
            select: { title: true, createdAt: true },
            take: 3,
        });

        if (pendingProposals.length > 0) {
            const lines = pendingProposals.map(p => `  📝 ${p.title}`);
            messages.push(`💬 *Đề xuất chưa được phản hồi:*\n${lines.join('\n')}`);
        }

        if (messages.length === 0) continue;

        const dateStr = today.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
        const fullMessage = `🏠 *Nhắc nhở từ Nội Thất SCT*\n📆 ${dateStr}\nXin chào ${user.name}!\n\n${messages.join('\n\n')}`;

        const result = await sendZaloMessage(user.zaloUserId, fullMessage);
        results.push({ user: user.name, ...result });
    }

    return NextResponse.json({
        message: 'Đã gửi nhắc nhở',
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        details: results,
    });
}
