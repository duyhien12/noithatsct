import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const assetType = searchParams.get('assetType') || '';
    const status = searchParams.get('status') || '';

    const where = {};
    if (assetType) where.assetType = assetType;
    if (status) where.status = status;

    const assets = await prisma.fixedAsset.findMany({
        where,
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(assets);
});

export const POST = withAuth(async (req, _, session) => {
    const body = await req.json();
    const { name, assetType, origin, startUseDate, originalCost, depreciationRate, wearRate, notes } = body;

    if (!name) return NextResponse.json({ error: 'Tên tài sản không được trống' }, { status: 400 });

    const last = await prisma.fixedAsset.findFirst({ orderBy: { createdAt: 'desc' } });
    const num = last ? parseInt(last.code.replace('TSCD-', ''), 10) + 1 : 1;
    const code = `TSCD-${String(num).padStart(3, '0')}`;

    const asset = await prisma.fixedAsset.create({
        data: {
            code,
            name,
            assetType: assetType || 'Máy móc - Thiết bị',
            origin: origin || '',
            startUseDate: startUseDate ? new Date(startUseDate) : null,
            originalCost: parseFloat(originalCost) || 0,
            depreciationRate: parseFloat(depreciationRate) || 0,
            wearRate: parseFloat(wearRate) || 0,
            notes: notes || '',
            createdBy: session?.user?.name || '',
        },
    });

    return NextResponse.json(asset, { status: 201 });
});

export const PUT = withAuth(async (req) => {
    const body = await req.json();
    const { id, accumulatedDepreciation, disposalDate, disposalReason, status, ...rest } = body;

    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    const data = { ...rest };
    if (accumulatedDepreciation !== undefined) data.accumulatedDepreciation = parseFloat(accumulatedDepreciation) || 0;
    if (disposalDate !== undefined) data.disposalDate = disposalDate ? new Date(disposalDate) : null;
    if (disposalReason !== undefined) data.disposalReason = disposalReason;
    if (status !== undefined) data.status = status;
    if (rest.startUseDate !== undefined) data.startUseDate = rest.startUseDate ? new Date(rest.startUseDate) : null;
    if (rest.originalCost !== undefined) data.originalCost = parseFloat(rest.originalCost) || 0;
    if (rest.depreciationRate !== undefined) data.depreciationRate = parseFloat(rest.depreciationRate) || 0;
    if (rest.wearRate !== undefined) data.wearRate = parseFloat(rest.wearRate) || 0;

    const asset = await prisma.fixedAsset.update({ where: { id }, data });
    return NextResponse.json(asset);
});

export const DELETE = withAuth(async (req) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });
    await prisma.fixedAsset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
});
