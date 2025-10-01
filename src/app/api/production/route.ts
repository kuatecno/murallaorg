import { NextRequest, NextResponse } from 'next/server';
import { productionService } from './production.service';

/**
 * GET /api/production
 * List production batches with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const filters = {
      status: searchParams.get('status') || undefined,
      productId: searchParams.get('productId') || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    };

    const batches = await productionService.listBatches(tenantId, filters);

    return NextResponse.json(batches);
  } catch (error: any) {
    console.error('Error fetching production batches:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/production
 * Create a new production batch
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const userId = request.headers.get('x-user-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();

    const batch = await productionService.createBatch({
      ...body,
      tenantId,
      createdById: userId || undefined,
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error: any) {
    console.error('Error creating production batch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
