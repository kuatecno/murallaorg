/**
 * Auto-Sync API (for 24h background jobs)
 * POST /api/sync/auto - Automated sync endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verify request is from a trusted source (optional auth header)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET || 'default-cron-secret';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Auto-sync triggered at:', new Date().toISOString());

    // Call the OpenFactura sync endpoint internally
    const baseUrl = request.nextUrl.origin;
    const syncResponse = await fetch(`${baseUrl}/api/sync/openfactura`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const syncResult = await syncResponse.json();

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResult.error || 'Unknown error'}`);
    }

    console.log('Auto-sync completed:', syncResult);

    return NextResponse.json({
      success: true,
      message: 'Auto-sync completed successfully',
      trigger: 'auto',
      timestamp: new Date().toISOString(),
      result: syncResult
    });

  } catch (error) {
    console.error('Auto-sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Auto-sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        trigger: 'auto',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    message: 'Auto-sync endpoint is healthy',
    timestamp: new Date().toISOString()
  });
}