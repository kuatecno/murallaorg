/**
 * Modifier Group Management API
 * PUT /api/modifier-groups/[groupId] - Update a modifier group
 * DELETE /api/modifier-groups/[groupId] - Delete a modifier group
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * PUT /api/modifier-groups/[groupId]
 * Update a modifier group
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;
    const { groupId } = await params;

    const body = await request.json();
    const {
      name,
      description,
      isRequired,
      allowMultiple,
      minSelections,
      maxSelections,
      sortOrder,
      isActive,
    } = body;

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

    const modifierGroup = await prisma.modifierGroup.update({
      where: {
        id: groupId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isRequired !== undefined && { isRequired }),
        ...(allowMultiple !== undefined && { allowMultiple }),
        ...(minSelections !== undefined && { minSelections }),
        ...(maxSelections !== undefined && { maxSelections }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        modifiers: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: modifierGroup,
    });
  } catch (error: any) {
    console.error('Error updating modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to update modifier group', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/modifier-groups/[groupId]
 * Delete a modifier group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) {
      return authResult; // Return 401 error
    }
    const { tenantId } = authResult;
    const { groupId } = await params;

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

    await prisma.modifierGroup.delete({
      where: {
        id: groupId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Modifier group deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting modifier group:', error);
    return NextResponse.json(
      { error: 'Failed to delete modifier group', details: error.message },
      { status: 500 }
    );
  }
}
