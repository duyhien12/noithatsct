import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const stage = searchParams.get('stage') || '';

    const where = { branch: 'LC', deletedAt: null };
    if (search) where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { code: { contains: search, mode: 'insensitive' } },
    ];
    if (stage) where.pipelineStage = stage;

    const customers = await prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
            id: true, code: true, name: true, phone: true, email: true,
            pipelineStage: true, source: true, salesPerson: true,
            estimatedValue: true, nextFollowUp: true, createdAt: true,
            notes: true, address: true, gender: true, type: true,
        },
    });
    return Response.json({ customers });
});

export const POST = withAuth(async (request, ctx, session) => {
    try {
        const body = await request.json();
        const {
            name, phone,
            email = '', address = '', source = '', salesPerson = '',
            pipelineStage = 'Tư vấn', estimatedValue = 0,
            notes = '', nextFollowUp = null, gender = 'Nam', type = 'Cá nhân',
        } = body;

        if (!name?.trim()) return Response.json({ error: 'Tên khách hàng bắt buộc' }, { status: 400 });
        if (!phone?.trim()) return Response.json({ error: 'Số điện thoại bắt buộc' }, { status: 400 });

        const count = await prisma.customer.count({ where: { branch: 'LC' } });
        const code = `LC.${String(count + 1).padStart(3, '0')}`;

        const existing = await prisma.customer.findUnique({ where: { code } });
        const finalCode = existing ? `LC.${String(count + 10).padStart(3, '0')}-${Date.now().toString(36)}` : code;

        const customer = await prisma.customer.create({
            data: {
                code: finalCode, name: name.trim(), phone: phone.trim(),
                email, address, source, salesPerson, pipelineStage,
                estimatedValue: parseFloat(estimatedValue) || 0,
                notes, branch: 'LC', gender, type,
                nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
                status: 'Khách hàng',
                createdByRole: session?.user?.role || '',
            },
        });
        return Response.json(customer, { status: 201 });
    } catch (err) {
        console.error('[laocai/customers POST]', err);
        return Response.json({ error: 'Lỗi tạo khách hàng' }, { status: 500 });
    }
});
