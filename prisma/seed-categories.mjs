/**
 * Seed ProductCategory from existing Product.category strings.
 * Run: node prisma/seed-categories.mjs
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // Get all distinct categories from products
    const products = await prisma.product.findMany({
        select: { id: true, category: true },
        where: { deletedAt: null },
    });

    const categoryNames = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    console.log(`Found ${categoryNames.length} distinct categories from ${products.length} products`);

    for (const name of categoryNames) {
        // Check if category already exists
        const existing = await prisma.productCategory.findFirst({ where: { name } });
        if (existing) {
            console.log(`  ✓ "${name}" already exists (${existing.id})`);
            // Update products that have this category string but no categoryId
            await prisma.product.updateMany({
                where: { category: name, categoryId: null },
                data: { categoryId: existing.id },
            });
            continue;
        }

        // Create category
        const cat = await prisma.productCategory.create({
            data: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') },
        });
        console.log(`  + Created "${name}" (${cat.id})`);

        // Link products
        const result = await prisma.product.updateMany({
            where: { category: name, categoryId: null },
            data: { categoryId: cat.id },
        });
        console.log(`    Linked ${result.count} products`);
    }

    console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
