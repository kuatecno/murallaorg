import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getGoogleChatService } from '@/lib/googleChatService';

// PUT /api/chat/spaces/[id] - Update space
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { displayName } = body;

    if (!displayName) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    const chatService = getGoogleChatService();
    const space = await chatService.updateSpace(id, displayName, auth.userId);

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
    console.error('Error updating space:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/spaces/[id] - Delete space
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    if (!auth.success || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const chatService = getGoogleChatService();
    
    await chatService.deleteSpace(id);

    return NextResponse.json({
      success: true,
      message: 'Space deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting space:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

