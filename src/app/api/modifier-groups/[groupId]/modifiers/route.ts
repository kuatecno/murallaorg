/**
 * Modifiers API
 * POST /api/modifier-groups/[groupId]/modifiers - Add a modifier to a group
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateApiKey } from '@/lib/auth';

/**
 * POST /api/modifier-groups/[groupId]/modifiers
 * Add a modifier to a group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const auth = await validateApiKey(request);
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const tenantId = auth.tenantId!;
    const { groupId } = await params;

    const body = await request.json();
    const { name, type, priceAdjustment, sortOrder } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Modifier name is required' },
        { status: 400 }
      );
    }

    // Check if group exists and belongs to this tenant
    const existingGroup = await prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        tenantId,
      },
    });

    if (!existingGroup) {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      );
    }

    const modifier = await prisma.productModifier.create({
      data: {
        modifierGroupId: groupId,
        name,
        type: type || 'ADD',
        priceAdjustment: priceAdjustment || 0,
        sortOrder: sortOrder || 0,
        tenantId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: modifier,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating modifier:', error);
    return NextResponse.json(
      { error: 'Failed to create modifier', details: error.message },
      { status: 500 }
    );
  }
}
