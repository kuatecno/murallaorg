import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Require authentication (JWT or API key)
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json or csv

    // Get all products for the user's tenant
    const products = await prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
      },
      include: {
        variants: true,
        modifierGroups: {
          include: {
            modifiers: true,
          },
        },
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform products for export
    const exportData = products.map((product: any) => ({
      id: product.id,
      sku: product.sku,
      ean: product.ean,
      name: product.name,
      description: product.description,
      type: product.type,
      category: product.category,
      brand: product.brand,
      unitPrice: product.unitPrice,
      costPrice: product.costPrice,
      minStock: product.minStock,
      maxStock: product.maxStock,
      currentStock: product.currentStock,
      unit: product.unit,
      images: product.images,
      hasRecipe: product.hasRecipe,
      cafePrice: product.cafePrice,
      rappiPrice: product.rappiPrice,
      pedidosyaPrice: product.pedidosyaPrice,
      uberPrice: product.uberPrice,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      variants: product.variants?.map(variant => ({
        id: variant.id,
        name: variant.name,
        useCustomName: variant.useCustomName,
        price: variant.price,
        images: variant.images,
        isDefault: variant.isDefault,
        cafePrice: variant.cafePrice,
        rappiPrice: variant.rappiPrice,
        pedidosyaPrice: variant.pedidosyaPrice,
        uberPrice: variant.uberPrice,
      })) || [],
      modifierGroups: product.modifierGroups?.map(group => ({
        id: group.id,
        name: group.name,
        isRequired: group.isRequired,
        allowMultiple: group.allowMultiple,
        modifiers: group.modifiers?.map(modifier => ({
          id: modifier.id,
          name: modifier.name,
          price: modifier.price,
          cafePrice: modifier.cafePrice,
          rappiPrice: modifier.rappiPrice,
          pedidosyaPrice: modifier.pedidosyaPrice,
          uberPrice: modifier.uberPrice,
        })) || [],
      })) || [],
      recipe: product.recipe ? {
        id: product.recipe.id,
        instructions: product.recipe.instructions,
        preparationTime: product.recipe.preparationTime,
        servingSize: product.recipe.servingSize,
        ingredients: product.recipe.ingredients?.map(ing => ({
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredient.name,
          quantity: ing.quantity,
          unit: ing.unit,
        })) || [],
      } : null,
    }));

    if (format === 'csv') {
      // Generate CSV format
      const csvHeaders = [
        'ID', 'SKU', 'EAN', 'Name', 'Description', 'Type', 'Category', 'Brand',
        'Unit Price', 'Cost Price', 'Min Stock', 'Max Stock', 'Current Stock', 'Unit',
        'Images Count', 'Has Recipe', 'Cafe Price', 'Rappi Price', 'PedidosYa Price', 'Uber Price',
        'Variants Count', 'Modifier Groups Count', 'Is Active', 'Created At', 'Updated At'
      ];

      const csvRows = exportData.map(product => [
        product.id,
        product.sku,
        product.ean || '',
        `"${product.name}"`,
        `"${product.description || ''}"`,
        product.type,
        product.category || '',
        product.brand || '',
        product.unitPrice,
        product.costPrice || '',
        product.minStock,
        product.maxStock || '',
        product.currentStock,
        product.unit,
        product.images?.length || 0,
        product.hasRecipe,
        product.cafePrice || '',
        product.rappiPrice || '',
        product.pedidosyaPrice || '',
        product.uberPrice || '',
        product.variants?.length || 0,
        product.modifierGroups?.length || 0,
        product.isActive,
        product.createdAt,
        product.updatedAt,
      ]);

      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="products-backup-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // Return JSON format
      const jsonData = {
        exportDate: new Date().toISOString(),
        totalProducts: exportData.length,
        tenantId: user.tenantId,
        products: exportData,
      };

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="products-backup-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }
  } catch (error) {
    console.error('Export products error:', error);
    return NextResponse.json(
      { error: 'Failed to export products' },
      { status: 500 }
    );
  }
}
