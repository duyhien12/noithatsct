import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const STEP_FIELDS = {
    stepCNC: { at: 'stepCNCAt', by: 'stepCNCBy' },
    stepColdProcess: { at: 'stepColdProcessAt', by: 'stepColdProcessBy' },
    stepWorkshopAssembly: { at: 'stepWorkshopAssemblyAt', by: 'stepWorkshopAssemblyBy' },
    stepTransport: { at: 'stepTransportAt', by: 'stepTransportBy' },
    stepSiteInstall: { at: 'stepSiteInstallAt', by: 'stepSiteInstallBy' },
};

export const PATCH = withAuth(async (req, { params }, session) => {
    const { itemId } = await params;
    const body = await req.json();

    const updateData = {};

    for (const [step, meta] of Object.entries(STEP_FIELDS)) {
        if (step in body) {
            updateData[step] = body[step];
            updateData[meta.at] = body[step] ? new Date() : null;
            updateData[meta.by] = body[step] ? (session?.user?.name || '') : '';
        }
    }

    if (body.name !== undefined) updateData.name = body.name;
    if (body.quantity !== undefined) updateData.quantity = body.quantity;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const item = await prisma.productionItem.update({
        where: { id: itemId },
        data: updateData
    });
    return NextResponse.json(item);
});

export const DELETE = withAuth(async (req, { params }) => {
    const { itemId } = await params;
    await prisma.productionItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
});
