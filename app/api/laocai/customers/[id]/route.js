import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const customer = await prisma.customer.findFirst({ where: { id, branch: 'LC', deletedAt: null } });
    if (!customer) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });
    return Response.json(customer);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const customer = await prisma.customer.findFirst({ where: { id, branch: 'LC', deletedAt: null } });
    if (!customer) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });

    try {
        const body = await request.json();
        const allowed = ['name','phone','email','address','source','salesPerson','pipelineStage','estimatedValue','notes','nextFollowUp','gender','type'];
        const data = {};
        for (const k of allowed) {
            if (k in body) {
                if (k === 'nextFollowUp') data[k] = body[k] ? new Date(body[k]) : null;
                else if (k === 'estimatedValue') data[k] = parseFloat(body[k]) || 0;
                else data[k] = body[k];
            }
        }
        const updated = await prisma.customer.update({ where: { id }, data });
        return Response.json(updated);
    } catch (err) {
        console.error('[laocai/customers PUT]', err);
        return Response.json({ error: 'Lỗi cập nhật' }, { status: 500 });
    }
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const customer = await prisma.customer.findFirst({ where: { id, branch: 'LC', deletedAt: null } });
    if (!customer) return Response.json({ error: 'Không tìm thấy' }, { status: 404 });
    await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    return Response.json({ ok: true });
});
