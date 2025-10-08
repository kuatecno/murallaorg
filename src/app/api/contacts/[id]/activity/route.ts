/**
 * Contact Activity API
 * GET /api/contacts/[id]/activity - Get all activity for a contact
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/contacts/[id]/activity
 * Fetch all activity (transactions, purchase orders, etc.) for a contact
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type'); // 'sales' | 'purchases' | 'all'

    // Verify contact exists
    const contact = await prisma.contact.findFirst({
      where: {
        id: params.id,
        tenantId,
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const activity: any[] = [];

    // Fetch sales transactions if customer
    if ((!type || type === 'sales' || type === 'all') &&
        ['CUSTOMER'].includes(contact.contactType)) {
      const transactions = await prisma.transaction.findMany({
        where: {
          contactId: params.id,
          tenantId,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      activity.push(
        ...transactions.map((t) => ({
          id: t.id,
          type: 'sale',
          date: t.createdAt,
          description: `Sale - ${t.items.length} item(s)`,
          amount: t.total.toNumber(),
          status: t.status,
          paymentStatus: t.paymentStatus,
          items: t.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            totalPrice: item.totalPrice.toNumber(),
          })),
          createdBy: t.createdBy
            ? `${t.createdBy.firstName} ${t.createdBy.lastName}`
            : 'System',
        }))
      );
    }

    // Fetch purchase orders if supplier
    if ((!type || type === 'purchases' || type === 'all') &&
        ['SUPPLIER'].includes(contact.contactType)) {
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
          supplierId: params.id,
          tenantId,
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      activity.push(
        ...purchaseOrders.map((po) => ({
          id: po.id,
          type: 'purchase',
          date: po.createdAt,
          description: `Purchase Order ${po.orderNumber} - ${po.items.length} item(s)`,
          amount: po.total.toNumber(),
          status: po.status,
          orderNumber: po.orderNumber,
          expectedDate: po.expectedDate,
          receivedDate: po.receivedDate,
          items: po.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            totalPrice: item.totalPrice.toNumber(),
          })),
        }))
      );
    }

    // Sort all activity by date (most recent first)
    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Limit to requested number
    const limitedActivity = activity.slice(0, limit);

    // Calculate summary stats
    const summary = {
      totalActivities: activity.length,
      totalSales: activity.filter((a) => a.type === 'sale').length,
      totalPurchases: activity.filter((a) => a.type === 'purchase').length,
      totalAmount: activity.reduce((sum, a) => sum + a.amount, 0),
      lastActivityDate: activity.length > 0 ? activity[0].date : null,
    };

    return NextResponse.json({
      contact: {
        id: contact.id,
        name: contact.name,
        code: contact.code,
        contactType: contact.contactType,
      },
      activity: limitedActivity,
      summary,
    });
  } catch (error) {
    console.error('Error fetching contact activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact activity' },
      { status: 500 }
    );
  }
}
