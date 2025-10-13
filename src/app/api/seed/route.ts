/**
 * Database Seed API
 * POST /api/seed - Run database seed (one-time setup)
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Simple security check - require a secret key
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.SEED_SECRET || 'your-secret-key-here';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting database seed...');

    const { stdout, stderr } = await execAsync('npx tsx prisma/seed.ts', {
      cwd: process.cwd(),
      env: { ...process.env },
    });

    console.log('Seed stdout:', stdout);
    if (stderr) console.error('Seed stderr:', stderr);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      output: stdout,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to run database seed',
    note: 'Requires Authorization header with Bearer token',
  });
}
