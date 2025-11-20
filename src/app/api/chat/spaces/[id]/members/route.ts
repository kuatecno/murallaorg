import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth';
import { getGoogleChatService } from '@/lib/googleChatService';

// GET /api/chat/spaces/[id]/members - List members
export async function GET(
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
    const members = await chatService.listMembers(id, auth.userId);

    return NextResponse.json({
      success: true,
      members: members.map(m => ({
        name: m.name,
        state: m.state,
        role: m.role,
        member: {
          name: m.member?.name,
          displayName: m.member?.displayName,
          avatarUrl: m.member?.avatarUrl,
          email: m.member?.email, // Email might not be visible for external users depending on privacy
          type: m.member?.type,
        }
      }))
    });
  } catch (error: any) {
    console.error('Error listing members:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// POST /api/chat/spaces/[id]/members - Add member
export async function POST(
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
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const chatService = getGoogleChatService();
    await chatService.addMember(id, email, auth.userId);

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully'
    });
  } catch (error: any) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

