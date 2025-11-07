/**
 * GET /api/auth/me
 * Returns current authenticated user info from JWT cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      // Return 200 with authenticated: false to avoid 401 errors in console
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    // Verify and decode token
    const jwtPayload = verifyToken(token);

    if (!jwtPayload) {
      // Return 200 with authenticated: false for invalid/expired tokens
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
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
      // Return 200 with authenticated: false for inactive users
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
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
