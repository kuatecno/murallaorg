import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getGoogleChatService } from '@/lib/googleChatService';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chatService = getGoogleChatService();
    const spaces = await chatService.listSpacesForUser(auth.userId);

    return NextResponse.json({
      success: true,
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
        error: error.message,
        hint: 'You may need to disconnect and reconnect your Google account to grant Chat permissions.'
      },
      { status: 500 }
    );
  }
}

