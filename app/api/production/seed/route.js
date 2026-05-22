import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const SAMPLE_STRUCTURE = [
    {
        floor: 'Tầng 1',
        rooms: [
            { room: 'Phòng khách', items: ['Kệ TV', 'Tủ giày', 'Bàn trà', 'Kệ trang trí'] },
            { room: 'Bếp & Ăn', items: ['Tủ bếp dưới', 'Tủ bếp trên', 'Bàn ăn', 'Tủ rượu'] },
        ]
    },
    {
        floor: 'Tầng 2',
        rooms: [
            { room: 'Phòng ngủ master', items: ['Giường', 'Tủ quần áo', 'Táp đầu giường', 'Bàn trang điểm', 'Kệ sách'] },
            { room: 'Phòng ngủ 2', items: ['Giường', 'Tủ quần áo', 'Táp đầu giường', 'Bàn học'] },
        ]
    },
    {
        floor: 'Tầng 3',
        rooms: [
            { room: 'Phòng ngủ 3', items: ['Giường', 'Tủ quần áo', 'Kệ đầu giường'] },
            { room: 'Phòng làm việc', items: ['Bàn làm việc', 'Kệ tài liệu', 'Tủ hồ sơ'] },
        ]
    },
];

function randomStep() {
    // Random progress for demo
    const r = Math.random();
    if (r < 0.15) return { stepCNC: false, stepColdProcess: false, stepWorkshopAssembly: false, stepTransport: false, stepSiteInstall: false };
    if (r < 0.30) return { stepCNC: true, stepColdProcess: false, stepWorkshopAssembly: false, stepTransport: false, stepSiteInstall: false };
    if (r < 0.45) return { stepCNC: true, stepColdProcess: true, stepWorkshopAssembly: false, stepTransport: false, stepSiteInstall: false };
    if (r < 0.60) return { stepCNC: true, stepColdProcess: true, stepWorkshopAssembly: true, stepTransport: false, stepSiteInstall: false };
    if (r < 0.80) return { stepCNC: true, stepColdProcess: true, stepWorkshopAssembly: true, stepTransport: true, stepSiteInstall: false };
    return { stepCNC: true, stepColdProcess: true, stepWorkshopAssembly: true, stepTransport: true, stepSiteInstall: true };
}

export const POST = withAuth(async (req, ctx, session) => {
    // Find first available project not yet having a production order
    const projects = await prisma.project.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, code: true, name: true }
    });

    const existingOrders = await prisma.productionOrder.findMany({ select: { projectId: true } });
    const usedIds = new Set(existingOrders.map(o => o.projectId));
    const available = projects.filter(p => !usedIds.has(p.id));

    if (available.length === 0) {
        return NextResponse.json({ error: 'Tất cả dự án đã có đơn sản xuất hoặc không có dự án nào' }, { status: 400 });
    }

    const project = available[0];
    const order = await prisma.productionOrder.create({
        data: { projectId: project.id, notes: 'Đơn sản xuất mẫu (demo)', createdBy: session?.user?.name || 'Admin' }
    });

    for (let fi = 0; fi < SAMPLE_STRUCTURE.length; fi++) {
        const { floor: floorName, rooms } = SAMPLE_STRUCTURE[fi];
        const floor = await prisma.productionFloor.create({
            data: { orderId: order.id, name: floorName, sortOrder: fi }
        });
        for (let ri = 0; ri < rooms.length; ri++) {
            const { room: roomName, items } = rooms[ri];
            const room = await prisma.productionRoom.create({
                data: { floorId: floor.id, name: roomName, sortOrder: ri }
            });
            for (let ii = 0; ii < items.length; ii++) {
                const steps = randomStep();
                const now = new Date();
                await prisma.productionItem.create({
                    data: {
                        roomId: room.id, name: items[ii], quantity: 1, sortOrder: ii,
                        stepCNC: steps.stepCNC, stepCNCAt: steps.stepCNC ? now : null, stepCNCBy: steps.stepCNC ? 'Demo' : '',
                        stepColdProcess: steps.stepColdProcess, stepColdProcessAt: steps.stepColdProcess ? now : null, stepColdProcessBy: steps.stepColdProcess ? 'Demo' : '',
                        stepWorkshopAssembly: steps.stepWorkshopAssembly, stepWorkshopAssemblyAt: steps.stepWorkshopAssembly ? now : null, stepWorkshopAssemblyBy: steps.stepWorkshopAssembly ? 'Demo' : '',
                        stepTransport: steps.stepTransport, stepTransportAt: steps.stepTransport ? now : null, stepTransportBy: steps.stepTransport ? 'Demo' : '',
                        stepSiteInstall: steps.stepSiteInstall, stepSiteInstallAt: steps.stepSiteInstall ? now : null, stepSiteInstallBy: steps.stepSiteInstall ? 'Demo' : '',
                    }
                });
            }
        }
    }

    return NextResponse.json({ ok: true, orderId: order.id, projectName: project.name });
});
