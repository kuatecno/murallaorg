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
exports.PayrollController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../auth/jwt-auth.guard");
const roles_guard_1 = require("../../../common/roles.guard");
const roles_decorator_1 = require("../../../common/roles.decorator");
let PayrollController = class PayrollController {
    constructor() {
        // Mock data for development
        this.payrollRuns = [
            {
                id: 'pr_001',
                runDate: '2025-01-31T10:00:00Z',
                payPeriodStart: '2025-01-01T00:00:00Z',
                payPeriodEnd: '2025-01-31T23:59:59Z',
                status: 'PROCESSED',
                totalGrossPay: 850000,
                totalDeductions: 170000,
                totalNetPay: 680000,
                notes: 'January 2025 payroll run',
                approvedBy: 'admin',
                approvedAt: '2025-01-30T14:00:00Z',
                processedBy: 'admin',
                processedAt: '2025-01-31T10:00:00Z',
                entries: [
                    {
                        id: 'pe_001',
                        employeeId: 'emp_001',
                        employeeName: 'María García',
                        baseSalary: 350000,
                        hoursWorked: 160,
                        grossPay: 350000,
                        taxDeductions: 70000,
                        socialSecurity: 35000,
                        netPay: 245000,
                    },
                    {
                        id: 'pe_002',
                        employeeId: 'emp_002',
                        employeeName: 'Carlos López',
                        baseSalary: 280000,
                        hoursWorked: 160,
                        bonusAmount: 50000,
                        grossPay: 330000,
                        taxDeductions: 66000,
                        socialSecurity: 33000,
                        netPay: 231000,
                    }
                ]
            }
        ];
    }
    async getPayrollRuns(status, limit = '20', offset = '0') {
        try {
            let filteredRuns = [...this.payrollRuns];
            if (status) {
                filteredRuns = filteredRuns.filter(run => run.status === status);
            }
            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset);
            const paginatedRuns = filteredRuns.slice(offsetNum, offsetNum + limitNum);
            return {
                success: true,
                payrollRuns: paginatedRuns,
                totalCount: filteredRuns.length,
                summary: {
                    totalRuns: this.payrollRuns.length,
                    pendingApproval: this.payrollRuns.filter(r => r.status === 'PENDING_APPROVAL').length,
                    processed: this.payrollRuns.filter(r => r.status === 'PROCESSED').length
                }
            };
        }
        catch (error) {
            console.error('Error fetching payroll runs:', error);
            return { success: false, error: 'Error al obtener nóminas' };
        }
    }
    async getPayrollRun(id) {
        try {
            const payrollRun = this.payrollRuns.find(run => run.id === id);
            if (!payrollRun) {
                return { success: false, error: 'Nómina no encontrada' };
            }
            return { success: true, payrollRun };
        }
        catch (error) {
            console.error('Error fetching payroll run:', error);
            return { success: false, error: 'Error al obtener nómina' };
        }
    }
    async createPayrollRun(payrollData) {
        try {
            const newPayrollRun = {
                id: `pr_${Date.now()}`,
                runDate: new Date().toISOString(),
                payPeriodStart: payrollData.payPeriodStart,
                payPeriodEnd: payrollData.payPeriodEnd,
                status: 'DRAFT',
                totalGrossPay: 850000,
                totalDeductions: 170000,
                totalNetPay: 680000,
                notes: payrollData.notes,
                entries: [
                    {
                        id: `pe_${Date.now()}`,
                        employeeId: 'emp_001',
                        employeeName: 'María García',
                        baseSalary: 350000,
                        hoursWorked: 160,
                        grossPay: 350000,
                        taxDeductions: 70000,
                        socialSecurity: 35000,
                        netPay: 245000,
                    }
                ]
            };
            this.payrollRuns.unshift(newPayrollRun);
            return {
                success: true,
                payrollRun: newPayrollRun,
                message: 'Nómina creada exitosamente'
            };
        }
        catch (error) {
            console.error('Error creating payroll run:', error);
            return { success: false, error: 'Error al crear nómina' };
        }
    }
    async approvePayrollRun(id) {
        try {
            const payrollRun = this.payrollRuns.find(run => run.id === id);
            if (!payrollRun) {
                return { success: false, error: 'Nómina no encontrada' };
            }
            payrollRun.status = 'APPROVED';
            payrollRun.approvedBy = 'admin';
            payrollRun.approvedAt = new Date().toISOString();
            return {
                success: true,
                payrollRun,
                message: 'Nómina aprobada exitosamente'
            };
        }
        catch (error) {
            console.error('Error approving payroll run:', error);
            return { success: false, error: 'Error al aprobar nómina' };
        }
    }
    async processPayrollRun(id) {
        try {
            const payrollRun = this.payrollRuns.find(run => run.id === id);
            if (!payrollRun) {
                return { success: false, error: 'Nómina no encontrada' };
            }
            if (payrollRun.status !== 'APPROVED') {
                return { success: false, error: 'Nómina debe estar aprobada para procesar' };
            }
            payrollRun.status = 'PROCESSED';
            payrollRun.processedBy = 'admin';
            payrollRun.processedAt = new Date().toISOString();
            return {
                success: true,
                payrollRun,
                message: 'Nómina procesada exitosamente'
            };
        }
        catch (error) {
            console.error('Error processing payroll run:', error);
            return { success: false, error: 'Error al procesar nómina' };
        }
    }
    async getPayrollSummary() {
        try {
            const totalEmployees = 3;
            const currentMonthPayroll = this.payrollRuns
                .filter(r => r.status === 'PROCESSED' && new Date(r.runDate).getMonth() === new Date().getMonth())
                .reduce((sum, r) => sum + r.totalNetPay, 0);
            const yearToDatePayroll = this.payrollRuns
                .filter(r => r.status === 'PROCESSED' && new Date(r.runDate).getFullYear() === new Date().getFullYear())
                .reduce((sum, r) => sum + r.totalNetPay, 0);
            return {
                success: true,
                summary: {
                    totalEmployees,
                    totalGrossPay: 850000,
                    totalNetPay: 680000,
                    averageSalary: 680000 / totalEmployees,
                    monthlyPayrollCost: currentMonthPayroll,
                    yearToDatePayroll,
                    upcomingPayrollDate: '2025-02-28',
                    pendingApprovals: this.payrollRuns.filter(r => r.status === 'PENDING_APPROVAL').length
                }
            };
        }
        catch (error) {
            console.error('Error fetching payroll summary:', error);
            return { success: false, error: 'Error al obtener resumen de nómina' };
        }
    }
};
exports.PayrollController = PayrollController;
__decorate([
    (0, common_1.Get)('runs'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getPayrollRuns", null);
__decorate([
    (0, common_1.Get)('runs/:id'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getPayrollRun", null);
__decorate([
    (0, common_1.Post)('runs'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "createPayrollRun", null);
__decorate([
    (0, common_1.Patch)('runs/:id/approve'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "approvePayrollRun", null);
__decorate([
    (0, common_1.Patch)('runs/:id/process'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "processPayrollRun", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)('admin', 'finance_manager', 'hr_manager', 'employee'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PayrollController.prototype, "getPayrollSummary", null);
exports.PayrollController = PayrollController = __decorate([
    (0, common_1.Controller)('api/payroll'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard)
], PayrollController);
