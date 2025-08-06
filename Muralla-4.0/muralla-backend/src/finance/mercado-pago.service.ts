import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, PaymentMethod, TransactionStatus } from '@prisma/client';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig;

  constructor(private prisma: PrismaService) {
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN || 'TEST_ACCESS_TOKEN',
      options: { timeout: 5000, idempotencyKey: 'mp-key-' + Date.now() },
    });
  }

  async handleWebhook(body: any): Promise<void> {
    try {
      const { type, data } = body;

      if (type === 'payment') {
        const payment = await new Payment(this.client).get({ id: data.id });
        
        if (payment.status === 'approved') {
          await this.createTransactionFromPayment(payment);
        }
      }
    } catch (error) {
      this.logger.error('Error handling Mercado Pago webhook:', error);
      throw error;
    }
  }

  private async createTransactionFromPayment(payment: any): Promise<void> {
    try {
      // Find or create default bank account
      let account = await this.prisma.bankAccount.findFirst({
        where: { name: 'Mercado Pago Account', isActive: true },
      });

      if (!account) {
        account = await this.prisma.bankAccount.create({
          data: {
            name: 'Mercado Pago Account',
            accountType: 'mercado_pago',
            currency: 'ARS',
            isActive: true,
          },
        });
      }

      // Find or create sales category
      let category = await this.prisma.transactionCategory.findFirst({
        where: { name: 'Ventas' },
      });

      if (!category) {
        category = await this.prisma.transactionCategory.create({
          data: {
            name: 'Ventas',
            icon: 'shopping-cart',
            color: '#10b981',
            description: 'Ingresos por ventas de productos y servicios',
          },
        });
      }

      // Create transaction
      const transaction = await this.prisma.transaction.create({
        data: {
          description: payment.description || 'Pago Mercado Pago',
          amount: payment.transaction_amount,
          type: TransactionType.INCOME,
          status: TransactionStatus.COMPLETED,
          paymentMethod: PaymentMethod.MERCADO_PAGO,
          reference: payment.id.toString(),
          externalId: payment.id.toString(),
          mpPaymentId: payment.id.toString(),
          mpStatus: payment.status,
          mpPaymentType: payment.payment_type_id,
          accountId: account.id,
          categoryId: category.id,
          customerName: payment.payer?.first_name 
            ? `${payment.payer.first_name} ${payment.payer.last_name || ''}`.trim()
            : null,
        },
      });

      // Update account balance
      await this.prisma.bankAccount.update({
        where: { id: account.id },
        data: {
          currentBalance: {
            increment: payment.transaction_amount,
          },
        },
      });

      this.logger.log(`Created transaction ${transaction.id} from Mercado Pago payment ${payment.id}`);
    } catch (error) {
      this.logger.error('Error creating transaction from payment:', error);
      throw error;
    }
  }

  async createPreference(data: {
    title: string;
    quantity: number;
    unit_price: number;
    currency_id?: string;
    external_reference?: string;
  }): Promise<any> {
    try {
      const preference = new Preference(this.client);
      
      const preferenceData = {
        items: [
          {
            id: 'item-' + Date.now(),
            title: data.title,
            quantity: data.quantity,
            unit_price: data.unit_price,
            currency_id: data.currency_id || 'ARS',
          },
        ],
        external_reference: data.external_reference,
        notification_url: `${process.env.BACKEND_URL}/api/finance/mercadopago/webhook`,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/finance/payment/success`,
          failure: `${process.env.FRONTEND_URL}/finance/payment/failure`,
          pending: `${process.env.FRONTEND_URL}/finance/payment/pending`,
        },
        auto_return: 'approved',
      };

      const result = await preference.create({ body: preferenceData });
      return result;
    } catch (error) {
      this.logger.error('Error creating Mercado Pago preference:', error);
      throw error;
    }
  }

  async getPayment(paymentId: string): Promise<any> {
    try {
      const payment = await new Payment(this.client).get({ id: paymentId });
      return payment;
    } catch (error) {
      this.logger.error(`Error fetching payment ${paymentId}:`, error);
      throw error;
    }
  }
}
