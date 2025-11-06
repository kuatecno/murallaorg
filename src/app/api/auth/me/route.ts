/**
 * GET /api/auth/me
 * Returns current authenticated user info from JWT cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from JWT cookie
    const jwtPayload = await getAuthenticatedUser();

    if (!jwtPayload) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch full user details from database
    const user = await prisma.staff.findUnique({
      where: { id: jwtPayload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
      }
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user,
    });

  } catch (error) {
    console.error('Auth/me error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
