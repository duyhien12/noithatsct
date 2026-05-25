import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  try {
    // Check soft-deleted projects
    const deleted = await prisma.project.findMany({
      where: { deletedAt: { not: null } },
      select: { code: true, name: true, status: true, deletedAt: true, createdByRole: true },
      orderBy: { deletedAt: 'desc' }
    });
    
    console.log(`=== ${deleted.length} SOFT-DELETED PROJECTS ===`);
    deleted.forEach(p => console.log(`  ${p.code} | ${p.name} | role: ${p.createdByRole} | deleted: ${p.deletedAt?.toISOString()}`));
    
    // Check active projects  
    const active = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { code: true, name: true, status: true, createdByRole: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n=== ${active.length} ACTIVE PROJECTS ===`);
    active.forEach(p => console.log(`  ${p.code} | ${p.name} | status: ${p.status} | role: ${p.createdByRole}`));

    // Check soft-deleted customers
    const deletedCust = await prisma.customer.count({ where: { deletedAt: { not: null } } });
    const activeCust = await prisma.customer.count({ where: { deletedAt: null } });
    console.log(`\nCustomers: ${activeCust} active, ${deletedCust} soft-deleted`);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
