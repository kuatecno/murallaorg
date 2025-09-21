/**
 * Invoices API Routes
 * GET /api/invoices - List invoices with pagination, search, and filtering
 * POST /api/invoices - Create new invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma, TaxDocumentType, TaxDocumentStatus } from '@prisma/client';

interface InvoiceParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaxDocumentStatus;
  type?: TaxDocumentType;
  customerId?: string;
  sortBy?: 'folio' | 'totalAmount' | 'issuedAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}

/**
 * GET /api/invoices
 * List invoices with pagination and filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get tenant from query parameter or use first available tenant
    // TODO: Replace with authenticated user's tenant when auth is implemented
    let tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst({
        where: { isActive: true },
        select: { id: true, name: true, slug: true }
      });

      if (!firstTenant) {
        return NextResponse.json(
          { error: 'No active tenant found. Please contact administrator.' },
          { status: 404 }
        );
      }

      tenantId = firstTenant.id;
    }

    const params: InvoiceParams = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as TaxDocumentStatus) || undefined,
      type: (searchParams.get('type') as TaxDocumentType) || undefined,
      customerId: searchParams.get('customerId') || undefined,
      sortBy: (searchParams.get('sortBy') as InvoiceParams['sortBy']) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as InvoiceParams['sortOrder']) || 'desc',
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const offset = (params.page! - 1) * params.limit!;

    // Build where clause
    const where: Prisma.TaxDocumentWhereInput = {
      tenantId,
    };

    // Add status filter
    if (params.status) {
      where.status = params.status;
    }

    // Add type filter
    if (params.type) {
      where.type = params.type;
    }

    // Add customer filter
    if (params.customerId) {
      where.transaction = {
        customerId: params.customerId
      };
    }

    // Add search filter
    if (params.search) {
      where.OR = [
        { folio: { contains: params.search, mode: 'insensitive' } },
        { emitterName: { contains: params.search, mode: 'insensitive' } },
        { receiverName: { contains: params.search, mode: 'insensitive' } },
        { receiverRUT: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Add date range filter
    if (params.dateFrom || params.dateTo) {
      where.issuedAt = {};
      if (params.dateFrom) {
        where.issuedAt.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        where.issuedAt.lte = new Date(params.dateTo);
      }
    }

    // Build order by clause
    const orderBy: Prisma.TaxDocumentOrderByWithRelationInput = {};
    switch (params.sortBy) {
      case 'folio':
        orderBy.folio = params.sortOrder;
        break;
      case 'totalAmount':
        orderBy.totalAmount = params.sortOrder;
        break;
      case 'issuedAt':
        orderBy.issuedAt = params.sortOrder;
        break;
      case 'createdAt':
        orderBy.createdAt = params.sortOrder;
        break;
      default:
        orderBy.createdAt = 'desc';
    }

    // Execute queries
    const [invoices, totalCount] = await Promise.all([
      prisma.taxDocument.findMany({
        where,
        orderBy,
        skip: offset,
        take: params.limit,
        include: {
          transaction: {
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  rut: true,
                  phone: true,
                }
              }
            }
          },
          items: true,
        },
      }),
      prisma.taxDocument.count({ where }),
    ]);

    // Transform data for response
    const transformedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      type: invoice.type,
      folio: invoice.folio,
      documentCode: invoice.documentCode,
      emitterRUT: invoice.emitterRUT,
      emitterName: invoice.emitterName,
      receiverRUT: invoice.receiverRUT,
      receiverName: invoice.receiverName,
      netAmount: invoice.netAmount ? Number(invoice.netAmount) : null,
      taxAmount: invoice.taxAmount ? Number(invoice.taxAmount) : null,
      totalAmount: invoice.totalAmount ? Number(invoice.totalAmount) : null,
      currency: invoice.currency,
      issuedAt: invoice.issuedAt,
      status: invoice.status,
      pdfUrl: invoice.pdfUrl,
      xmlUrl: invoice.xmlUrl,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      customer: invoice.transaction?.customer || null,
      itemCount: invoice.items.length,
      items: invoice.items.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    }));

    const totalPages = Math.ceil(totalCount / params.limit!);
    const hasNextPage = params.page! < totalPages;
    const hasPrevPage = params.page! > 1;

    return NextResponse.json({
      data: transformedInvoices,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search: params.search,
        status: params.status,
        type: params.type,
        customerId: params.customerId,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      },
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices
 * Create new invoice
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let tenantId = body.tenantId;

    if (!tenantId) {
      const firstTenant = await prisma.tenant.findFirst({
        where: { isActive: true },
        select: { id: true, name: true, slug: true }
      });

      if (!firstTenant) {
        return NextResponse.json(
          { error: 'No active tenant found. Please contact administrator.' },
          { status: 404 }
        );
      }

      tenantId = firstTenant.id;
    }

    // Validate required fields
    const requiredFields = ['type', 'receiverRUT', 'receiverName', 'items'];
    const missingFields = requiredFields.filter(field => !body[field]);

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          details: missingFields.map(field => `${field} is required`)
        },
        { status: 400 }
      );
    }

    // Validate items
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of body.items) {
      if (!item.productName || !item.quantity || !item.unitPrice) {
        return NextResponse.json(
          { error: 'Each item must have productName, quantity, and unitPrice' },
          { status: 400 }
        );
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Item quantity must be a positive number' },
          { status: 400 }
        );
      }
      if (typeof item.unitPrice !== 'number' || item.unitPrice <= 0) {
        return NextResponse.json(
          { error: 'Item unit price must be a positive number' },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    const items = body.items.map((item: any) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: new Prisma.Decimal(item.unitPrice),
      totalPrice: new Prisma.Decimal(item.quantity * item.unitPrice),
    }));

    const netAmount = items.reduce((sum: Prisma.Decimal, item: any) => sum.plus(item.totalPrice), new Prisma.Decimal(0));
    const taxRate = 0.19; // Chilean IVA
    const taxAmount = netAmount.times(taxRate);
    const totalAmount = netAmount.plus(taxAmount);

    // Get tenant info for emitter data
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, rut: true }
    });

    // Create transaction first (optional, for linking)
    let transactionId = null;
    if (body.createTransaction) {
      const transaction = await prisma.transaction.create({
        data: {
          type: 'SALE',
          status: 'COMPLETED',
          subtotal: netAmount,
          tax: taxAmount,
          discount: new Prisma.Decimal(0),
          total: totalAmount,
          paymentStatus: 'PENDING',
          tenantId,
          customerId: body.customerId || null,
        }
      });
      transactionId = transaction.id;
    }

    // Create the invoice (tax document)
    const newInvoice = await prisma.taxDocument.create({
      data: {
        type: body.type,
        transactionId,
        emitterRUT: tenant?.rut || body.emitterRUT,
        emitterName: tenant?.name || body.emitterName,
        receiverRUT: body.receiverRUT,
        receiverName: body.receiverName,
        netAmount,
        taxAmount,
        totalAmount,
        currency: body.currency || 'CLP',
        status: 'DRAFT',
        tenantId,
        items: {
          create: items.map((item: any) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          }))
        }
      },
      include: {
        items: true,
        transaction: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
                rut: true,
              }
            }
          }
        }
      },
    });

    // Transform response
    const transformedInvoice = {
      id: newInvoice.id,
      type: newInvoice.type,
      folio: newInvoice.folio,
      documentCode: newInvoice.documentCode,
      emitterRUT: newInvoice.emitterRUT,
      emitterName: newInvoice.emitterName,
      receiverRUT: newInvoice.receiverRUT,
      receiverName: newInvoice.receiverName,
      netAmount: Number(newInvoice.netAmount),
      taxAmount: Number(newInvoice.taxAmount),
      totalAmount: Number(newInvoice.totalAmount),
      currency: newInvoice.currency,
      issuedAt: newInvoice.issuedAt,
      status: newInvoice.status,
      createdAt: newInvoice.createdAt,
      updatedAt: newInvoice.updatedAt,
      customer: newInvoice.transaction?.customer || null,
      items: newInvoice.items.map(item => ({
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
      })),
    };

    return NextResponse.json(
      {
        message: 'Invoice created successfully',
        data: transformedInvoice
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating invoice:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}