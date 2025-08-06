"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MercadoPagoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MercadoPagoService = void 0;
const common_1 = require("@nestjs/common");
const mercadopago_1 = require("mercadopago");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let MercadoPagoService = MercadoPagoService_1 = class MercadoPagoService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(MercadoPagoService_1.name);
        this.client = new mercadopago_1.MercadoPagoConfig({
            accessToken: process.env.MP_ACCESS_TOKEN || 'TEST_ACCESS_TOKEN',
            options: { timeout: 5000, idempotencyKey: 'mp-key-' + Date.now() },
        });
    }
    async handleWebhook(body) {
        try {
            const { type, data } = body;
            if (type === 'payment') {
                const payment = await new mercadopago_1.Payment(this.client).get({ id: data.id });
                if (payment.status === 'approved') {
                    await this.createTransactionFromPayment(payment);
                }
            }
        }
        catch (error) {
            this.logger.error('Error handling Mercado Pago webhook:', error);
            throw error;
        }
    }
    async createTransactionFromPayment(payment) {
        var _a;
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
                    type: client_1.TransactionType.INCOME,
                    status: client_1.TransactionStatus.COMPLETED,
                    paymentMethod: client_1.PaymentMethod.MERCADO_PAGO,
                    reference: payment.id.toString(),
                    externalId: payment.id.toString(),
                    mpPaymentId: payment.id.toString(),
                    mpStatus: payment.status,
                    mpPaymentType: payment.payment_type_id,
                    accountId: account.id,
                    categoryId: category.id,
                    customerName: ((_a = payment.payer) === null || _a === void 0 ? void 0 : _a.first_name)
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
        }
        catch (error) {
            this.logger.error('Error creating transaction from payment:', error);
            throw error;
        }
    }
    async createPreference(data) {
        try {
            const preference = new mercadopago_1.Preference(this.client);
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
        }
        catch (error) {
            this.logger.error('Error creating Mercado Pago preference:', error);
            throw error;
        }
    }
    async getPayment(paymentId) {
        try {
            const payment = await new mercadopago_1.Payment(this.client).get({ id: paymentId });
            return payment;
        }
        catch (error) {
            this.logger.error(`Error fetching payment ${paymentId}:`, error);
            throw error;
        }
    }
};
exports.MercadoPagoService = MercadoPagoService;
exports.MercadoPagoService = MercadoPagoService = MercadoPagoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MercadoPagoService);
