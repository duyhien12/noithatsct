import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const customer = await prisma.customer.findFirst({ where: { id, branch: 'LC', deletedAt: null } });
    if (!customer) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });

    try {
        const { nextFollowUp, pipelineStage, notes } = await request.json();
        const data = {};
        if (nextFollowUp !== undefined) data.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : null;
        if (pipelineStage) data.pipelineStage = pipelineStage;
        if (notes !== undefined) data.notes = notes;
        const updated = await prisma.customer.update({ where: { id }, data });
        return Response.json(updated);
    } catch (err) {
        console.error('[laocai/followup PUT]', err);
        return Response.json({ error: 'Lỗi cập nhật' }, { status: 500 });
    }
});
