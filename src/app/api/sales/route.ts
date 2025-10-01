import { NextRequest, NextResponse } from 'next/server';
import { salesService } from './sales.service';

/**
 * GET /api/sales
 * List sales with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const filters = {
      customerId: searchParams.get('customerId') || undefined,
      status: searchParams.get('status') || undefined,
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
    };

    const sales = await salesService.listSales(tenantId, filters);

    return NextResponse.json(sales);
  } catch (error: any) {
    console.error('Error fetching sales:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/sales
 * Create a new sale
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const userId = request.headers.get('x-user-id');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();

    const sale = await salesService.processSale({
      ...body,
      tenantId,
      createdById: userId || undefined,
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error: any) {
    console.error('Error processing sale:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
