/**
 * Migration script to move tags from products to variants
 * This script will:
 * 1. Add tags field to all existing variants based on their parent product tags
 * 2. Preserve existing data structure
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateTags() {
  console.log('Starting tag migration from products to variants...');

  try {
    // Get all products with tags and their variants
    const productsWithTags = await prisma.product.findMany({
      where: {
        tags: {
          not: {
            equals: []
          }
        }
      },
      include: {
        variants: true
      }
    });

    console.log(`Found ${productsWithTags.length} products with tags`);

    let totalVariantsUpdated = 0;

    for (const product of productsWithTags) {
      console.log(`Processing product: ${product.name} with tags: ${product.tags}`);
      
      if (product.variants.length > 0) {
        // Update all variants of this product with the product's tags
        for (const variant of product.variants) {
          await prisma.productVariant.update({
            where: { id: variant.id },
            data: {
              tags: product.tags as string[]
            }
          });
          totalVariantsUpdated++;
          console.log(`  Updated variant: ${variant.name} with tags: ${product.tags}`);
        }
      } else {
        console.log(`  Product has no variants, skipping...`);
      }
    }

    console.log(`Migration completed! Updated ${totalVariantsUpdated} variants with tags.`);

    // Optional: Show summary of products that still have tags at product level
    const productsStillWithTags = await prisma.product.count({
      where: {
        tags: {
          not: {
            equals: []
          }
        }
      }
    });

    console.log(`${productsStillWithTags} products still have tags at product level (will be handled by UI changes)`);

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateTags()
  .then(() => {
    console.log('Tag migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Tag migration failed:', error);
    process.exit(1);
  });
