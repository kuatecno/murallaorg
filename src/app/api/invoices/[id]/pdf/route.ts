/**
 * Invoice PDF Generation API
 * GET /api/invoices/[id]/pdf - Generate and return PDF for invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/invoices/[id]/pdf
 * Generate PDF for invoice
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch invoice with all related data
    const invoice = await prisma.taxDocument.findUnique({
      where: { id },
      include: {
        items: true,
        transaction: {
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                email: true,
                rut: true,
                phone: true,
                address: true,
              }
            }
          }
        },
        tenant: {
          select: {
            id: true,
            name: true,
            rut: true,
            address: true,
            phone: true,
            email: true,
          }
        }
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Only allow PDF generation for issued invoices
    if (invoice.status !== 'ISSUED') {
      return NextResponse.json(
        { error: 'PDF can only be generated for issued invoices' },
        { status: 400 }
      );
    }

    // TODO: Implement actual PDF generation using a library like @react-pdf/renderer or puppeteer
    // For now, we'll return a simple HTML representation that can be converted to PDF

    const htmlContent = generateInvoiceHTML(invoice);

    // Return HTML for now (can be converted to PDF on client side or with additional library)
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${invoice.folio || invoice.id}.html"`,
      },
    });

    // TODO: When PDF library is added, replace above with:
    // const pdfBuffer = await generateInvoicePDF(invoice);
    // return new NextResponse(pdfBuffer, {
    //   headers: {
    //     'Content-Type': 'application/pdf',
    //     'Content-Disposition': `inline; filename="invoice-${invoice.folio || invoice.id}.pdf"`,
    //   },
    // });

  } catch (error) {
    console.error('Error generating invoice PDF:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    );
  }
}

/**
 * Generate HTML content for invoice
 * TODO: Replace with proper PDF generation library
 */
function generateInvoiceHTML(invoice: any): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: invoice.currency || 'CLP'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  };

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${invoice.type} ${invoice.folio}</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                color: #333;
            }
            .header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                border-bottom: 2px solid #eee;
                padding-bottom: 20px;
            }
            .company-info {
                flex: 1;
            }
            .document-info {
                text-align: right;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            .document-type {
                font-size: 24px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 5px;
            }
            .document-number {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
            }
            .customer-info {
                margin: 30px 0;
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
            }
            .customer-info h3 {
                margin-top: 0;
                color: #1f2937;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 30px 0;
            }
            th, td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            th {
                background-color: #f8f9fa;
                font-weight: bold;
            }
            .text-right {
                text-align: right;
            }
            .totals {
                margin-top: 30px;
                text-align: right;
            }
            .totals table {
                width: 300px;
                margin-left: auto;
            }
            .totals .total-row {
                font-weight: bold;
                font-size: 18px;
                border-top: 2px solid #333;
            }
            .footer {
                margin-top: 50px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                text-align: center;
                color: #666;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company-info">
                <h2>${invoice.tenant?.name || invoice.emitterName}</h2>
                <p><strong>RUT:</strong> ${invoice.tenant?.rut || invoice.emitterRUT}</p>
                ${invoice.tenant?.address ? `<p><strong>Dirección:</strong> ${invoice.tenant.address}</p>` : ''}
                ${invoice.tenant?.phone ? `<p><strong>Teléfono:</strong> ${invoice.tenant.phone}</p>` : ''}
                ${invoice.tenant?.email ? `<p><strong>Email:</strong> ${invoice.tenant.email}</p>` : ''}
            </div>
            <div class="document-info">
                <div class="document-type">${invoice.type}</div>
                <div class="document-number">N° ${invoice.folio}</div>
                <p><strong>Fecha:</strong> ${formatDate(invoice.issuedAt)}</p>
                <p><strong>Código:</strong> ${invoice.documentCode}</p>
            </div>
        </div>

        <div class="customer-info">
            <h3>Información del Cliente</h3>
            <p><strong>Nombre:</strong> ${invoice.receiverName}</p>
            <p><strong>RUT:</strong> ${invoice.receiverRUT}</p>
            ${invoice.transaction?.contact?.email ? `<p><strong>Email:</strong> ${invoice.transaction.contact.email}</p>` : ''}
            ${invoice.transaction?.contact?.phone ? `<p><strong>Teléfono:</strong> ${invoice.transaction.contact.phone}</p>` : ''}
            ${invoice.transaction?.contact?.address ? `<p><strong>Dirección:</strong> ${invoice.transaction.contact.address}</p>` : ''}
        </div>

        <table>
            <thead>
                <tr>
                    <th>Producto/Servicio</th>
                    <th class="text-right">Cantidad</th>
                    <th class="text-right">Precio Unitario</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${invoice.items.map((item: any) => `
                    <tr>
                        <td>${item.productName}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">${formatCurrency(Number(item.unitPrice))}</td>
                        <td class="text-right">${formatCurrency(Number(item.totalPrice))}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <table>
                <tr>
                    <td><strong>Subtotal:</strong></td>
                    <td class="text-right">${formatCurrency(Number(invoice.netAmount))}</td>
                </tr>
                <tr>
                    <td><strong>IVA (19%):</strong></td>
                    <td class="text-right">${formatCurrency(Number(invoice.taxAmount))}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>TOTAL:</strong></td>
                    <td class="text-right">${formatCurrency(Number(invoice.totalAmount))}</td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>Documento generado electrónicamente - ${formatDate(new Date())}</p>
            <p>Sistema Muralla 5.0</p>
        </div>
    </body>
    </html>
  `;
}