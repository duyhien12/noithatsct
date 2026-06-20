const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Chỉ xóa các khách hàng tôi vừa tạo (KH125-KH190)
    const targets = await prisma.customer.findMany({
        where: { createdByRole: 'thiet_ke' },
        select: { id: true, code: true, _count: { select: { projects: true } } },
    });

    // Lọc ra những customer không có project liên kết
    const noProjects = targets.filter(c => c._count.projects === 0);
    const hasProjects = targets.filter(c => c._count.projects > 0);

    if (hasProjects.length > 0) {
        console.log('Các KH có project (bỏ qua):', hasProjects.map(c => c.code).join(', '));
    }

    const ids = noProjects.map(c => c.id);
    console.log('Sẽ xóa', ids.length, 'khách hàng không có project');

    // Xóa comments trước
    const c1 = await prisma.customerComment.deleteMany({ where: { customerId: { in: ids } } });
    console.log('Xóa', c1.count, 'comments');

    // Xóa customers
    const deleted = await prisma.customer.deleteMany({ where: { id: { in: ids } } });
    console.log('Đã xóa', deleted.count, 'khách hàng');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
