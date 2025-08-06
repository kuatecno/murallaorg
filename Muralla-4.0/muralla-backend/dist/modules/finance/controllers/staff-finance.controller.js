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
exports.StaffFinanceController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../auth/jwt-auth.guard");
const roles_guard_1 = require("../../../common/roles.guard");
const roles_decorator_1 = require("../../../common/roles.decorator");
let StaffFinanceController = class StaffFinanceController {
    constructor() {
        // Mock data for development
        this.salaryAdjustments = [
            {
                id: 'sa_001',
                employeeId: 'emp_001',
                employeeName: 'María García',
                adjustmentType: 'SALARY_INCREASE',
                previousAmount: 320000,
                newAmount: 350000,
                effectiveDate: '2025-01-01T00:00:00Z',
                reason: 'Annual performance review - exceeds expectations',
                notes: 'Promoted to Senior Developer',
                approvedBy: 'admin',
                approvedAt: '2024-12-15T10:00:00Z'
            },
            {
                id: 'sa_002',
                employeeId: 'emp_002',
                employeeName: 'Carlos López',
                adjustmentType: 'BONUS',
                previousAmount: 280000,
                newAmount: 330000,
                effectiveDate: '2025-02-01T00:00:00Z',
                reason: 'Q4 performance bonus',
                notes: 'Exceptional project delivery',
                approvedBy: 'admin',
                approvedAt: '2025-01-20T14:00:00Z'
            }
        ];
        this.employeeExpenses = [
            {
                id: 'ee_001',
                employeeId: 'emp_001',
                employeeName: 'María García',
                description: 'Client meeting lunch - Café Central',
                amount: 15000,
                category: 'Meals',
                expenseDate: '2025-02-01T12:00:00Z',
                status: 'APPROVED',
                submittedAt: '2025-02-01T18:00:00Z',
                reviewedBy: 'admin',
                reviewedAt: '2025-02-02T09:00:00Z',
                receiptUrl: '/uploads/receipts/receipt_001.pdf'
            },
            {
                id: 'ee_002',
                employeeId: 'emp_002',
                employeeName: 'Carlos López',
                description: 'Taxi to client office',
                amount: 8500,
                category: 'Travel',
                expenseDate: '2025-02-02T14:30:00Z',
                status: 'PENDING',
                submittedAt: '2025-02-02T17:00:00Z',
                receiptUrl: '/uploads/receipts/receipt_002.jpg'
            },
            {
                id: 'ee_003',
                employeeId: 'emp_003',
                employeeName: 'Ana Rodríguez',
                description: 'Office supplies - notebooks and pens',
                amount: 12000,
                category: 'Office Supplies',
                expenseDate: '2025-02-01T10:00:00Z',
                status: 'REIMBURSED',
                submittedAt: '2025-02-01T16:00:00Z',
                reviewedBy: 'admin',
                reviewedAt: '2025-02-02T08:00:00Z',
                reimbursedAt: '2025-02-03T11:00:00Z'
            }
        ];
    }
    async getStaffFinanceSummary() {
        try {
            const totalEmployees = 3;
            const totalMonthlySalaries = 820000; // Sum of current salaries
            const totalYearToDateSalaries = 1640000; // 2 months processed
            const averageSalary = totalMonthlySalaries / totalEmployees;
            const pendingExpenses = this.employeeExpenses.filter(e => e.status === 'PENDING').length;
            const totalPendingExpenseAmount = this.employeeExpenses
                .filter(e => e.status === 'PENDING')
                .reduce((sum, e) => sum + e.amount, 0);
            const recentSalaryAdjustments = this.salaryAdjustments
                .filter(sa => new Date(sa.effectiveDate) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
                .length;
            // Mock revenue data for payroll vs revenue calculation
            const mockMonthlyRevenue = 2500000;
            const payrollPercentage = (totalMonthlySalaries / mockMonthlyRevenue) * 100;
            return {
                success: true,
                summary: {
                    totalEmployees,
                    totalMonthlySalaries,
                    totalYearToDateSalaries,
                    averageSalary,
                    pendingExpenses,
                    totalPendingExpenseAmount,
                    recentSalaryAdjustments,
                    payrollVsRevenue: {
                        payrollPercentage: Math.round(payrollPercentage * 100) / 100,
                        revenueAmount: mockMonthlyRevenue,
                        payrollAmount: totalMonthlySalaries
                    },
                    upcomingPayments: {
                        nextPayrollDate: '2025-02-28',
                        nextPayrollAmount: totalMonthlySalaries,
                        pendingExpenseReimbursements: totalPendingExpenseAmount
                    }
                }
            };
        }
        catch (error) {
            console.error('Error fetching staff finance summary:', error);
            return { success: false, error: 'Error al obtener resumen financiero del personal' };
        }
    }
    async getSalaryAdjustments(employeeId, type, startDate, endDate, limit = '20', offset = '0') {
        try {
            let filteredAdjustments = [...this.salaryAdjustments];
            // Apply filters
            if (employeeId) {
                filteredAdjustments = filteredAdjustments.filter(sa => sa.employeeId === employeeId);
            }
            if (type) {
                filteredAdjustments = filteredAdjustments.filter(sa => sa.adjustmentType === type);
            }
            if (startDate) {
                const start = new Date(startDate);
                filteredAdjustments = filteredAdjustments.filter(sa => new Date(sa.effectiveDate) >= start);
            }
            if (endDate) {
                const end = new Date(endDate);
                filteredAdjustments = filteredAdjustments.filter(sa => new Date(sa.effectiveDate) <= end);
            }
            // Apply pagination
            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset);
            const paginatedAdjustments = filteredAdjustments.slice(offsetNum, offsetNum + limitNum);
            return {
                success: true,
                salaryAdjustments: paginatedAdjustments,
                totalCount: filteredAdjustments.length,
                summary: {
                    totalAdjustments: this.salaryAdjustments.length,
                    recentIncreases: this.salaryAdjustments.filter(sa => sa.adjustmentType === 'SALARY_INCREASE' &&
                        new Date(sa.effectiveDate) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)).length,
                    totalBonusesPaid: this.salaryAdjustments
                        .filter(sa => sa.adjustmentType === 'BONUS')
                        .reduce((sum, sa) => sum + (sa.newAmount - sa.previousAmount), 0)
                }
            };
        }
        catch (error) {
            console.error('Error fetching salary adjustments:', error);
            return { success: false, error: 'Error al obtener ajustes salariales' };
        }
    }
    async createSalaryAdjustment(adjustmentData) {
        try {
            const newAdjustment = {
                id: `sa_${Date.now()}`,
                employeeId: adjustmentData.employeeId,
                employeeName: adjustmentData.employeeName,
                adjustmentType: adjustmentData.adjustmentType,
                previousAmount: adjustmentData.previousAmount,
                newAmount: adjustmentData.newAmount,
                effectiveDate: adjustmentData.effectiveDate,
                reason: adjustmentData.reason,
                notes: adjustmentData.notes,
                approvedBy: 'admin', // In real implementation, get from JWT token
                approvedAt: new Date().toISOString()
            };
            this.salaryAdjustments.unshift(newAdjustment);
            return {
                success: true,
                salaryAdjustment: newAdjustment,
                message: 'Ajuste salarial creado exitosamente'
            };
        }
        catch (error) {
            console.error('Error creating salary adjustment:', error);
            return { success: false, error: 'Error al crear ajuste salarial' };
        }
    }
    async getEmployeeExpenses(employeeId, status, category, startDate, endDate, limit = '20', offset = '0') {
        try {
            let filteredExpenses = [...this.employeeExpenses];
            // Apply filters
            if (employeeId) {
                filteredExpenses = filteredExpenses.filter(e => e.employeeId === employeeId);
            }
            if (status) {
                filteredExpenses = filteredExpenses.filter(e => e.status === status);
            }
            if (category) {
                filteredExpenses = filteredExpenses.filter(e => e.category === category);
            }
            if (startDate) {
                const start = new Date(startDate);
                filteredExpenses = filteredExpenses.filter(e => new Date(e.expenseDate) >= start);
            }
            if (endDate) {
                const end = new Date(endDate);
                filteredExpenses = filteredExpenses.filter(e => new Date(e.expenseDate) <= end);
            }
            // Apply pagination
            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset);
            const paginatedExpenses = filteredExpenses.slice(offsetNum, offsetNum + limitNum);
            return {
                success: true,
                expenses: paginatedExpenses,
                totalCount: filteredExpenses.length,
                summary: {
                    totalExpenses: this.employeeExpenses.length,
                    pendingReview: this.employeeExpenses.filter(e => e.status === 'PENDING').length,
                    totalPendingAmount: this.employeeExpenses
                        .filter(e => e.status === 'PENDING')
                        .reduce((sum, e) => sum + e.amount, 0),
                    totalReimbursedThisMonth: this.employeeExpenses
                        .filter(e => e.status === 'REIMBURSED' &&
                        new Date(e.reimbursedAt).getMonth() === new Date().getMonth())
                        .reduce((sum, e) => sum + e.amount, 0)
                }
            };
        }
        catch (error) {
            console.error('Error fetching employee expenses:', error);
            return { success: false, error: 'Error al obtener gastos de empleados' };
        }
    }
    async createEmployeeExpense(expenseData) {
        try {
            const newExpense = {
                id: `ee_${Date.now()}`,
                employeeId: expenseData.employeeId,
                employeeName: expenseData.employeeName,
                description: expenseData.description,
                amount: expenseData.amount,
                category: expenseData.category,
                expenseDate: expenseData.expenseDate,
                status: 'PENDING',
                submittedAt: new Date().toISOString(),
                receiptUrl: expenseData.receiptUrl,
                notes: expenseData.notes
            };
            this.employeeExpenses.unshift(newExpense);
            return {
                success: true,
                expense: newExpense,
                message: 'Gasto creado exitosamente'
            };
        }
        catch (error) {
            console.error('Error creating employee expense:', error);
            return { success: false, error: 'Error al crear gasto' };
        }
    }
    async approveExpense(id) {
        try {
            const expense = this.employeeExpenses.find(e => e.id === id);
            if (!expense) {
                return { success: false, error: 'Gasto no encontrado' };
            }
            if (expense.status !== 'PENDING') {
                return { success: false, error: 'Gasto no puede ser aprobado en su estado actual' };
            }
            expense.status = 'APPROVED';
            expense.reviewedBy = 'admin'; // In real implementation, get from JWT token
            expense.reviewedAt = new Date().toISOString();
            return {
                success: true,
                expense,
                message: 'Gasto aprobado exitosamente'
            };
        }
        catch (error) {
            console.error('Error approving expense:', error);
            return { success: false, error: 'Error al aprobar gasto' };
        }
    }
    async reimburseExpense(id) {
        try {
            const expense = this.employeeExpenses.find(e => e.id === id);
            if (!expense) {
                return { success: false, error: 'Gasto no encontrado' };
            }
            if (expense.status !== 'APPROVED') {
                return { success: false, error: 'Gasto debe estar aprobado para reembolsar' };
            }
            expense.status = 'REIMBURSED';
            expense.reimbursedAt = new Date().toISOString();
            return {
                success: true,
                expense,
                message: 'Gasto reembolsado exitosamente'
            };
        }
        catch (error) {
            console.error('Error reimbursing expense:', error);
            return { success: false, error: 'Error al reembolsar gasto' };
        }
    }
    async getExpenseCategories() {
        try {
            const categories = [
                { id: 'travel', name: 'Travel', icon: '🚗', description: 'Transportation and travel expenses' },
                { id: 'meals', name: 'Meals', icon: '🍽️', description: 'Business meals and entertainment' },
                { id: 'office_supplies', name: 'Office Supplies', icon: '📝', description: 'Office materials and supplies' },
                { id: 'software', name: 'Software', icon: '💻', description: 'Software licenses and subscriptions' },
                { id: 'training', name: 'Training', icon: '📚', description: 'Professional development and training' },
                { id: 'equipment', name: 'Equipment', icon: '🖥️', description: 'Hardware and equipment purchases' },
                { id: 'other', name: 'Other', icon: '📋', description: 'Other business expenses' }
            ];
            return {
                success: true,
                categories
            };
        }
        catch (error) {
            console.error('Error fetching expense categories:', error);
            return { success: false, error: 'Error al obtener categorías de gastos' };
        }
    }
};
exports.StaffFinanceController = StaffFinanceController;
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StaffFinanceController.prototype, "getStaffFinanceSummary", null);
__decorate([
    (0, common_1.Get)('salary-adjustments'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], StaffFinanceController.prototype, "getSalaryAdjustments", null);
__decorate([
    (0, common_1.Post)('salary-adjustments'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StaffFinanceController.prototype, "createSalaryAdjustment", null);
__decorate([
    (0, common_1.Get)('expenses'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager', 'employee'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], StaffFinanceController.prototype, "getEmployeeExpenses", null);
__decorate([
    (0, common_1.Post)('expenses'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager', 'employee'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StaffFinanceController.prototype, "createEmployeeExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/approve'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StaffFinanceController.prototype, "approveExpense", null);
__decorate([
    (0, common_1.Patch)('expenses/:id/reimburse'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StaffFinanceController.prototype, "reimburseExpense", null);
__decorate([
    (0, common_1.Get)('categories'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager', 'employee'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StaffFinanceController.prototype, "getExpenseCategories", null);
exports.StaffFinanceController = StaffFinanceController = __decorate([
    (0, common_1.Controller)('api/staff-finance'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)
], StaffFinanceController);
