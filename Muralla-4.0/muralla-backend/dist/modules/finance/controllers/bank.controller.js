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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../auth/jwt-auth.guard");
const roles_guard_1 = require("../../../common/roles.guard");
const roles_decorator_1 = require("../../../common/roles.decorator");
let BankController = class BankController {
    constructor() {
        // Mock data based on legacy bank-routes.js
        this.bankTransactions = [
            {
                id: '1',
                date: new Date('2024-01-15T10:30:00Z'),
                description: 'Venta de café - Juan Pérez',
                amount: 15000,
                category: 'Ventas',
                type: 'income',
                status: 'completed',
                payment_method: 'Mercado Pago',
                reference: 'MP-2024-001',
                category_icon: 'shopping-cart',
                customer_name: 'Juan Pérez',
                items: ['Café Americano', 'Croissant']
            },
            {
                id: '2',
                date: new Date('2024-01-15T14:20:00Z'),
                description: 'Compra de insumos - Proveedor Café',
                amount: -85000,
                category: 'Compras',
                type: 'expense',
                status: 'completed',
                payment_method: 'Transferencia Bancaria',
                reference: 'TR-2024-002',
                category_icon: 'shopping-bag',
                supplier_name: 'Proveedor Café S.A.',
                items: ['Café grano 5kg', 'Leche 10L', 'Azúcar 5kg']
            },
            {
                id: '3',
                date: new Date('2024-01-16T09:15:00Z'),
                description: 'Pago de nómina - María González',
                amount: -450000,
                category: 'Nómina',
                type: 'expense',
                status: 'completed',
                payment_method: 'Transferencia Bancaria',
                reference: 'TR-2024-003',
                category_icon: 'users',
                employee_name: 'María González'
            },
            {
                id: '4',
                date: new Date('2024-01-16T16:45:00Z'),
                description: 'Venta de evento - Corporación XYZ',
                amount: 250000,
                category: 'Ventas',
                type: 'income',
                status: 'completed',
                payment_method: 'Mercado Pago',
                reference: 'MP-2024-004',
                category_icon: 'shopping-cart',
                customer_name: 'Corporación XYZ'
            }
        ];
        this.currentBalance = 1250000;
    }
    async getTransactions(startDate, endDate, type, category, limit = '50', offset = '0') {
        try {
            let filteredTransactions = [...this.bankTransactions];
            // Apply filters
            if (startDate) {
                filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= new Date(startDate));
            }
            if (endDate) {
                filteredTransactions = filteredTransactions.filter(t => new Date(t.date) <= new Date(endDate));
            }
            if (type) {
                filteredTransactions = filteredTransactions.filter(t => t.type === type);
            }
            if (category) {
                filteredTransactions = filteredTransactions.filter(t => t.category === category);
            }
            // Calculate summary data
            const now = new Date();
            const monthlyIncome = filteredTransactions
                .filter(t => t.amount > 0 && new Date(t.date).getMonth() === now.getMonth())
                .reduce((sum, t) => sum + t.amount, 0);
            const monthlyExpenses = Math.abs(filteredTransactions
                .filter(t => t.amount < 0 && new Date(t.date).getMonth() === now.getMonth())
                .reduce((sum, t) => sum + t.amount, 0));
            const paginatedTransactions = filteredTransactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
            return {
                success: true,
                transactions: paginatedTransactions,
                currentBalance: this.currentBalance,
                monthlyIncome,
                monthlyExpenses,
                totalCount: filteredTransactions.length,
                summary: {
                    totalIncome: filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
                    totalExpenses: Math.abs(filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
                    transactionCount: filteredTransactions.length
                }
            };
        }
        catch (error) {
            console.error('Error fetching transactions:', error);
            throw new Error('Error al obtener transacciones');
        }
    }
    async getBalance() {
        try {
            return {
                success: true,
                balance: this.currentBalance,
                lastUpdated: new Date().toISOString()
            };
        }
        catch (error) {
            throw new Error('Error al obtener balance');
        }
    }
    async createTransaction(transactionData) {
        try {
            const { description, amount, category, type, payment_method, reference, customer_name, supplier_name } = transactionData;
            // Validate required fields
            if (!description || !amount || !category || !type) {
                throw new Error('Faltan campos requeridos');
            }
            const newTransaction = {
                id: (this.bankTransactions.length + 1).toString(),
                date: new Date(),
                description,
                amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
                category,
                type,
                status: 'completed',
                payment_method,
                reference: reference || `${type.toUpperCase()}-${Date.now()}`,
                customer_name,
                supplier_name
            };
            this.bankTransactions.unshift(newTransaction);
            this.currentBalance += newTransaction.amount;
            return { success: true, transaction: newTransaction };
        }
        catch (error) {
            console.error('Error creating transaction:', error);
            throw new Error('Error al crear transacción');
        }
    }
    async getSummary(period = 'monthly') {
        try {
            let filteredTransactions = [...this.bankTransactions];
            const now = new Date();
            if (period === 'daily') {
                filteredTransactions = filteredTransactions.filter(t => new Date(t.date).toDateString() === now.toDateString());
            }
            else if (period === 'weekly') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= weekAgo);
            }
            else if (period === 'monthly') {
                filteredTransactions = filteredTransactions.filter(t => new Date(t.date).getMonth() === now.getMonth() &&
                    new Date(t.date).getFullYear() === now.getFullYear());
            }
            const summary = {
                totalIncome: filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
                totalExpenses: Math.abs(filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
                transactionCount: filteredTransactions.length,
                averageTransaction: filteredTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / filteredTransactions.length || 0,
                categories: this.getCategorySummary(filteredTransactions),
                dailyTotals: this.getDailyTotals(filteredTransactions),
                topTransactions: filteredTransactions.slice(0, 5)
            };
            return { success: true, summary };
        }
        catch (error) {
            console.error('Error fetching summary:', error);
            throw new Error('Error al obtener resumen');
        }
    }
    async getCategories() {
        try {
            const categories = [
                { id: 'ventas', name: 'Ventas', icon: 'shopping-cart', color: 'green' },
                { id: 'compras', name: 'Compras', icon: 'shopping-bag', color: 'red' },
                { id: 'nomina', name: 'Nómina', icon: 'users', color: 'blue' },
                { id: 'servicios', name: 'Servicios', icon: 'cogs', color: 'yellow' },
                { id: 'transferencias', name: 'Transferencias', icon: 'exchange-alt', color: 'purple' },
                { id: 'comisiones', name: 'Comisiones', icon: 'percentage', color: 'gray' }
            ];
            return { success: true, categories };
        }
        catch (error) {
            throw new Error('Error al obtener categorías');
        }
    }
    // Mercado Pago webhook endpoint
    async handleMercadoPagoWebhook(webhookData) {
        var _a;
        try {
            const { type, data } = webhookData;
            if (type === 'payment') {
                // In a real implementation, you would verify the payment with Mercado Pago API
                // For now, we'll simulate a successful payment
                const transaction = {
                    id: data.id || Date.now().toString(),
                    date: new Date(),
                    description: 'Pago Mercado Pago',
                    amount: data.transaction_amount || 0,
                    category: 'Ventas',
                    type: 'income',
                    status: 'completed',
                    payment_method: 'Mercado Pago',
                    reference: ((_a = data.id) === null || _a === void 0 ? void 0 : _a.toString()) || `MP-${Date.now()}`
                };
                this.bankTransactions.unshift(transaction);
                this.currentBalance += transaction.amount;
                // In a real implementation, you would emit real-time updates via WebSocket
                console.log('New Mercado Pago transaction:', transaction);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Webhook error:', error);
            throw new Error('Webhook error');
        }
    }
    // Helper methods
    getCategorySummary(transactions) {
        const categories = {};
        transactions.forEach(transaction => {
            const category = transaction.category || 'Otros';
            if (!categories[category]) {
                categories[category] = { total: 0, count: 0 };
            }
            categories[category].total += Math.abs(transaction.amount);
            categories[category].count += 1;
        });
        return categories;
    }
    getDailyTotals(transactions) {
        const dailyTotals = {};
        transactions.forEach(transaction => {
            const date = new Date(transaction.date).toISOString().split('T')[0];
            if (!dailyTotals[date]) {
                dailyTotals[date] = { income: 0, expenses: 0 };
            }
            if (transaction.amount > 0) {
                dailyTotals[date].income += transaction.amount;
            }
            else {
                dailyTotals[date].expenses += Math.abs(transaction.amount);
            }
        });
        return dailyTotals;
    }
};
exports.BankController = BankController;
__decorate([
    (0, common_1.Get)('transactions'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'employee'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Query)('type')),
    __param(3, (0, common_1.Query)('category')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], BankController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('balance'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'employee'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BankController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('transaction'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BankController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'employee'),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BankController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'employee'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BankController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Post)('mercadopago/webhook'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BankController.prototype, "handleMercadoPagoWebhook", null);
exports.BankController = BankController = __decorate([
    (0, common_1.Controller)('api/bank'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)
], BankController);
