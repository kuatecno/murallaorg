/**
 * POST /api/auth/logout
 * Clears the authentication cookie
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clears the authentication cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({
      message: 'Logged out successfully'
    });

    // Clear the authentication cookie
    response.cookies.delete('auth-token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
