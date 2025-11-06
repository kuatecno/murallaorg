/**
 * POST /api/auth/logout
 * Clears the authentication cookie
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Clear the authentication cookie
    await clearAuthCookie();

    return NextResponse.json({
      message: 'Logged out successfully',
    });

  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
