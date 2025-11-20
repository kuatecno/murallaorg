import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getGoogleChatService } from '@/lib/googleChatService';

// GET /api/chat/spaces - List spaces
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
      spaces: spaces.map(space => ({
        id: space.name.replace('spaces/', ''),
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
        details: error.response?.data || 'No details', // Expose Google API details
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

// POST /api/chat/spaces - Create a new space
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName } = body;

    if (!displayName) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    const chatService = getGoogleChatService();
    const space = await chatService.createSpace(displayName, auth.userId);

    return NextResponse.json({
      success: true,
      space: {
        id: space.name.replace('spaces/', ''),
        name: space.name,
        displayName: space.displayName,
        type: space.spaceType,
      }
    });
  } catch (error: any) {
    console.error('Error creating space:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        details: error.response?.data || 'No details', // Expose Google API details
        stack: error.stack
      },
      { status: 500 }
    );
  }
}

