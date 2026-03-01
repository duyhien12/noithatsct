import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { NextResponse } from 'next/server';
import { documentCreateSchema } from '@/lib/validations/document';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const projectId = searchParams.get('projectId');
    const customerId = searchParams.get('customerId');
    const folderId = searchParams.get('folderId');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const space = searchParams.get('space') || '';

    const where = {
        parentDocumentId: null, // Only show latest (root) documents
    };
    if (projectId) where.projectId = projectId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (space) where.space = space;

    // folderId=null means unsorted, folderId=<id> means specific folder
    if (folderId === 'null' || folderId === 'unsorted') {
        where.folderId = null;
    } else if (folderId) {
        where.folderId = folderId;
    }

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { fileName: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [docs, total] = await Promise.all([
        prisma.projectDocument.findMany({
            where,
            include: {
                project: { select: { name: true, code: true } },
                customer: { select: { name: true, code: true } },
                folder: { select: { name: true } },
                _count: { select: { versions: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        }),
        prisma.projectDocument.count({ where }),
    ]);

    return NextResponse.json(paginatedResponse(docs, total, { page, limit }));
});

export const POST = withAuth(async (request, context, session) => {
    const body = await request.json();
    const data = documentCreateSchema.parse(body);

    // Auto-fill uploadedBy from session
    if (session?.user?.name) {
        data.uploadedBy = session.user.name;
    }

    // If this is a new version of an existing document
    if (data.parentDocumentId) {
        const parent = await prisma.projectDocument.findUnique({
            where: { id: data.parentDocumentId },
        });
        if (parent) {
            const rootId = parent.parentDocumentId || parent.id;
            // Find max version in the chain
            const maxVersion = await prisma.projectDocument.aggregate({
                where: { OR: [{ id: rootId }, { parentDocumentId: rootId }] },
                _max: { version: true },
            });
            data.version = (maxVersion._max.version || 1) + 1;
            data.parentDocumentId = rootId; // Always point to root
            // Inherit folder from parent if not specified
            if (!data.folderId) data.folderId = parent.folderId;
        }
    }

    const doc = await prisma.projectDocument.create({ data });
    return NextResponse.json(doc, { status: 201 });
});
