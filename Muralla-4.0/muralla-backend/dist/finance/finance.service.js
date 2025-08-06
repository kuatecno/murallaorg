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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../common/audit.service");
const client_1 = require("@prisma/client");
let FinanceService = class FinanceService {
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    // Bank Account Management
    async createBankAccount(data, userId) {
        const account = await this.prisma.bankAccount.create({
            data: { ...data, createdBy: userId },
            include: { transactions: true },
        });
        if (userId) {
            await this.auditService.logAuditTrail({
                tableName: 'bank_accounts',
                recordId: account.id,
                operation: audit_service_1.AuditOperation.CREATE,
                afterData: account,
                userId,
            });
        }
        return account;
    }
    async findAllBankAccounts() {
        return this.prisma.bankAccount.findMany({
            where: { isDeleted: false },
            include: {
                transactions: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                },
                _count: { select: { transactions: true } },
            },
        });
    }
    async findBankAccount(id) {
        const account = await this.prisma.bankAccount.findUnique({
            where: { id, isDeleted: false },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    include: { category: true, creator: true },
                },
                balanceHistory: {
                    orderBy: { balanceDate: 'desc' },
                    take: 30,
                },
            },
        });
        if (!account) {
            throw new common_1.NotFoundException(`Bank account ${id} not found`);
        }
        return account;
    }
    // Transaction Management
    async createTransaction(data, userId) {
        const transaction = await this.prisma.transaction.create({
            data: { ...data },
            include: {
                account: true,
                category: true,
                creator: true,
            },
        });
        // Update account balance
        await this.updateAccountBalance(transaction.accountId, transaction.amount);
        if (userId) {
            await this.auditService.logAuditTrail({
                tableName: 'transactions',
                recordId: transaction.id,
                operation: audit_service_1.AuditOperation.CREATE,
                afterData: transaction,
                userId,
            });
        }
        return transaction;
    }
    async findTransactions(filters = {}) {
        const { limit = 50, offset = 0, ...where } = filters;
        const whereClause = {
            isDeleted: false,
            ...where,
        };
        if (filters.startDate || filters.endDate) {
            whereClause.createdAt = {};
            if (filters.startDate)
                whereClause.createdAt.gte = filters.startDate;
            if (filters.endDate)
                whereClause.createdAt.lte = filters.endDate;
        }
        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where: whereClause,
                include: {
                    account: true,
                    category: true,
                    creator: true,
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.transaction.count({ where: whereClause }),
        ]);
        return { transactions, total };
    }
    async findTransaction(id) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id, isDeleted: false },
            include: {
                account: true,
                category: true,
                creator: true,
            },
        });
        if (!transaction) {
            throw new common_1.NotFoundException(`Transaction ${id} not found`);
        }
        return transaction;
    }
    async updateTransaction(id, data, userId) {
        const existing = await this.findTransaction(id);
        const transaction = await this.prisma.transaction.update({
            where: { id },
            data,
            include: {
                account: true,
                category: true,
                creator: true,
            },
        });
        // Update account balance if amount changed
        if (data.amount && data.amount !== existing.amount) {
            const difference = data.amount - existing.amount;
            await this.updateAccountBalance(transaction.accountId, difference);
        }
        if (userId) {
            await this.auditService.logAuditTrail({
                tableName: 'transactions',
                recordId: transaction.id,
                operation: audit_service_1.AuditOperation.UPDATE,
                beforeData: existing,
                afterData: transaction,
                userId,
            });
        }
        return transaction;
    }
    async deleteTransaction(id, userId) {
        const existing = await this.findTransaction(id);
        const transaction = await this.prisma.transaction.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: userId,
            },
        });
        // Reverse the balance change
        await this.updateAccountBalance(existing.accountId, -existing.amount);
        if (userId) {
            await this.auditService.logAuditTrail({
                tableName: 'transactions',
                recordId: transaction.id,
                operation: audit_service_1.AuditOperation.DELETE,
                beforeData: existing,
                userId,
            });
        }
        return transaction;
    }
    // Category Management
    async createTransactionCategory(data, userId) {
        const category = await this.prisma.transactionCategory.create({
            data: { ...data, createdBy: userId },
            include: { _count: { select: { transactions: true } } },
        });
        if (userId) {
            await this.auditService.logAuditTrail({
                tableName: 'transaction_categories',
                recordId: category.id,
                operation: audit_service_1.AuditOperation.CREATE,
                afterData: category,
                userId,
            });
        }
        return category;
    }
    async findTransactionCategories() {
        return this.prisma.transactionCategory.findMany({
            where: { isDeleted: false },
            include: { _count: { select: { transactions: true } } },
            orderBy: { name: 'asc' },
        });
    }
    // Financial Analytics
    async getFinancialSummary(filters = {}) {
        const whereClause = {
            isDeleted: false,
            status: client_1.TransactionStatus.COMPLETED,
            ...filters,
        };
        if (filters.startDate || filters.endDate) {
            whereClause.createdAt = {};
            if (filters.startDate)
                whereClause.createdAt.gte = filters.startDate;
            if (filters.endDate)
                whereClause.createdAt.lte = filters.endDate;
        }
        const [income, expenses, transactionCount, categoryBreakdown] = await Promise.all([
            this.prisma.transaction.aggregate({
                where: { ...whereClause, type: client_1.TransactionType.INCOME },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.transaction.aggregate({
                where: { ...whereClause, type: client_1.TransactionType.EXPENSE },
                _sum: { amount: true },
                _count: true,
            }),
            this.prisma.transaction.count({ where: whereClause }),
            this.prisma.transaction.groupBy({
                by: ['categoryId'],
                where: whereClause,
                _sum: { amount: true },
                _count: true,
            }),
        ]);
        const totalIncome = income._sum.amount || 0;
        const totalExpenses = Math.abs(expenses._sum.amount || 0);
        return {
            totalIncome,
            totalExpenses,
            netProfit: totalIncome - totalExpenses,
            transactionCount,
            incomeTransactions: income._count,
            expenseTransactions: expenses._count,
            categoryBreakdown,
            averageTransaction: transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0,
        };
    }
    async getDailyTotals(filters = {}) {
        const whereClause = {
            isDeleted: false,
            status: client_1.TransactionStatus.COMPLETED,
            ...filters,
        };
        if (filters.startDate || filters.endDate) {
            whereClause.createdAt = {};
            if (filters.startDate)
                whereClause.createdAt.gte = filters.startDate;
            if (filters.endDate)
                whereClause.createdAt.lte = filters.endDate;
        }
        const transactions = await this.prisma.transaction.findMany({
            where: whereClause,
            select: {
                amount: true,
                type: true,
                createdAt: true,
            },
        });
        const dailyTotals = {};
        transactions.forEach(transaction => {
            const date = transaction.createdAt.toISOString().split('T')[0];
            if (!dailyTotals[date]) {
                dailyTotals[date] = { income: 0, expenses: 0 };
            }
            if (transaction.type === client_1.TransactionType.INCOME) {
                dailyTotals[date].income += transaction.amount;
            }
            else {
                dailyTotals[date].expenses += Math.abs(transaction.amount);
            }
        });
        return dailyTotals;
    }
    // Helper Methods
    async updateAccountBalance(accountId, amountChange) {
        await this.prisma.bankAccount.update({
            where: { id: accountId },
            data: {
                currentBalance: {
                    increment: amountChange,
                },
            },
        });
    }
    async seedDefaultData() {
        // Create default categories based on legacy data
        const defaultCategories = [
            { name: 'Ventas', icon: 'shopping-cart', color: '#10b981', description: 'Ingresos por ventas de productos y servicios' },
            { name: 'Compras', icon: 'shopping-bag', color: '#ef4444', description: 'Egresos por compras de insumos y materiales' },
            { name: 'Nómina', icon: 'users', color: '#3b82f6', description: 'Pagos de sueldos y beneficios al personal' },
            { name: 'Servicios', icon: 'cogs', color: '#f59e0b', description: 'Pagos por servicios públicos y mantenimiento' },
            { name: 'Transferencias', icon: 'exchange-alt', color: '#8b5cf6', description: 'Transferencias entre cuentas' },
            { name: 'Comisiones', icon: 'percentage', color: '#6b7280', description: 'Pagos por comisiones y tarifas bancarias' },
        ];
        for (const categoryData of defaultCategories) {
            await this.prisma.transactionCategory.upsert({
                where: { name: categoryData.name },
                update: {},
                create: categoryData,
            });
        }
        // Create default Mercado Pago account
        await this.prisma.bankAccount.upsert({
            where: { id: 'mercado-pago-default' },
            update: {},
            create: {
                id: 'mercado-pago-default',
                name: 'Mercado Pago Account',
                accountType: 'mercado_pago',
                currency: 'ARS',
                currentBalance: 0,
                isActive: true,
            },
        });
    }
};
exports.FinanceService = FinanceService;
exports.FinanceService = FinanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], FinanceService);
