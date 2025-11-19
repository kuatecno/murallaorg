import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { authenticate } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL('/plannings?error=google_auth_denied', request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/plannings?error=google_auth_failed', request.url)
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Log granted scopes for debugging
    console.log('Granted scopes:', tokens.scope);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    oauth2Client.setCredentials(tokens);
    const { data: userInfo } = await oauth2.userinfo.get();

    // Get current user from authentication
    const auth = await authenticate(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.redirect(
        new URL('/login?error=auth_required', request.url)
      );
    }

    // Update user's Google tokens in database
    const updateData: any = {
      googleAccessToken: tokens.access_token,
      googleTokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      googleEmail: userInfo.email,
      googleTasksEnabled: true,
    };

    // Only update refresh token if one was provided
    if (tokens.refresh_token) {
      updateData.googleRefreshToken = tokens.refresh_token;
    }

    await prisma.staff.update({
      where: { id: auth.userId },
      data: updateData,
    });

    return NextResponse.redirect(
      new URL('/plannings?success=google_connected', request.url)
    );

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/plannings?error=google_auth_failed', request.url)
    );
  }
}
