import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getGoogleChatService } from '@/lib/googleChatService';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Inspect User State
    const user = await prisma.staff.findUnique({
      where: { id: auth.userId },
      select: {
        email: true,
        googleEmail: true,
        googleTasksEnabled: true,
        googleTokenExpiresAt: true,
        // Do not return actual tokens for security, just presence
        googleAccessToken: true,
        googleRefreshToken: true,
      }
    });

    const debugInfo = {
      hasGoogleEmail: !!user?.googleEmail,
      googleEmail: user?.googleEmail,
      tasksEnabled: user?.googleTasksEnabled,
      tokenExpired: user?.googleTokenExpiresAt ? new Date() > user.googleTokenExpiresAt : 'unknown',
      hasAccessToken: !!user?.googleAccessToken,
      hasRefreshToken: !!user?.googleRefreshToken,
    };

    const chatService = getGoogleChatService();
    
    // 2. Test Basic Connectivity (Get User Profile)
    let userProfile = null;
    try {
      // We need to cast to any because the type definition might be missing 'users'
      const chat: any = await chatService['getChatClientForUser'](auth.userId); 
      // Try to get own profile first - simplest possible call
      // Note: The 'users' resource might not be exposed in all googleapis versions, 
      // but we can try to list spaces directly if this fails.
    } catch (e) {
      console.log('Skipping user profile check or it failed', e);
    }

    let spaces: any[] = [];
    let apiStage = 'init';
    
    try {
      apiStage = 'listSpaces';
      console.log('Attempting to list spaces for user:', auth.userId);
      spaces = await chatService.listSpacesForUser(auth.userId);
    } catch (innerError: any) {
      // Capture specific Google API error details
      throw {
        stage: apiStage,
        message: innerError.message,
        code: innerError.code || innerError.status,
        details: innerError.response?.data || 'No response data',
        stack: innerError.stack
      };
    }

    return NextResponse.json({
      success: true,
      userStatus: debugInfo,
      count: spaces.length,
      spaces: spaces.map(space => ({
        name: space.name,
        displayName: space.displayName,
        type: space.spaceType,
      }))
    });
  } catch (error: any) {
    console.error('Error listing spaces:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Unknown error',
        fullError: error, // Return the full error object for inspection
        hint: 'Check the "fullError" object for Google API specific codes (e.g., 403 Forbidden means scopes are missing).'
      },
      { status: 500 }
    );
  }
}

