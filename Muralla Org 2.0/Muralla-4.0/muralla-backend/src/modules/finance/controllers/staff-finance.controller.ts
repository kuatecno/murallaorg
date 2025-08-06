import { Controller, Get, Post, Body, Query, Param, UseGuards, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/roles.guard';
import { Roles } from '../../../common/roles.decorator';

// Types for Staff Finance API
interface SalaryAdjustment {
  id: string;
  employeeId: string;
  employeeName: string;
  adjustmentType: 'SALARY_INCREASE' | 'SALARY_DECREASE' | 'BONUS' | 'ALLOWANCE_CHANGE' | 'PROMOTION' | 'DEMOTION' | 'ANNUAL_REVIEW';
  previousAmount: number;
  newAmount: number;
  effectiveDate: string;
  reason: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
}

interface EmployeeExpense {
  id: string;
  employeeId: string;
  employeeName: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REIMBURSED' | 'CANCELLED';
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reimbursedAt?: string;
  receiptUrl?: string;
  notes?: string;
}

interface StaffFinanceSummary {
  totalEmployees: number;
  totalMonthlySalaries: number;
  totalYearToDateSalaries: number;
  averageSalary: number;
  pendingExpenses: number;
  totalPendingExpenseAmount: number;
  recentSalaryAdjustments: number;
  payrollVsRevenue: {
    payrollPercentage: number;
    revenueAmount: number;
    payrollAmount: number;
  };
  upcomingPayments: {
    nextPayrollDate: string;
    nextPayrollAmount: number;
    pendingExpenseReimbursements: number;
  };
}

@Controller('api/staff-finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffFinanceController {
  // Mock data for development
  private salaryAdjustments: SalaryAdjustment[] = [
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

  private employeeExpenses: EmployeeExpense[] = [
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

  @Get('summary')
  @Roles('admin', 'finance_manager', 'hr_manager')
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
    } catch (error) {
      console.error('Error fetching staff finance summary:', error);
      return { success: false, error: 'Error al obtener resumen financiero del personal' };
    }
  }

  @Get('salary-adjustments')
  @Roles('admin', 'finance_manager', 'hr_manager')
  async getSalaryAdjustments(
    @Query('employeeId') employeeId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0'
  ) {
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
          recentIncreases: this.salaryAdjustments.filter(sa => 
            sa.adjustmentType === 'SALARY_INCREASE' && 
            new Date(sa.effectiveDate) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
          ).length,
          totalBonusesPaid: this.salaryAdjustments
            .filter(sa => sa.adjustmentType === 'BONUS')
            .reduce((sum, sa) => sum + (sa.newAmount - sa.previousAmount), 0)
        }
      };
    } catch (error) {
      console.error('Error fetching salary adjustments:', error);
      return { success: false, error: 'Error al obtener ajustes salariales' };
    }
  }

  @Post('salary-adjustments')
  @Roles('admin', 'finance_manager', 'hr_manager')
  async createSalaryAdjustment(@Body() adjustmentData: Partial<SalaryAdjustment>) {
    try {
      const newAdjustment: SalaryAdjustment = {
        id: `sa_${Date.now()}`,
        employeeId: adjustmentData.employeeId!,
        employeeName: adjustmentData.employeeName!,
        adjustmentType: adjustmentData.adjustmentType!,
        previousAmount: adjustmentData.previousAmount!,
        newAmount: adjustmentData.newAmount!,
        effectiveDate: adjustmentData.effectiveDate!,
        reason: adjustmentData.reason!,
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
    } catch (error) {
      console.error('Error creating salary adjustment:', error);
      return { success: false, error: 'Error al crear ajuste salarial' };
    }
  }

  @Get('expenses')
  @Roles('admin', 'finance_manager', 'hr_manager', 'employee')
  async getEmployeeExpenses(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0'
  ) {
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
              new Date(e.reimbursedAt!).getMonth() === new Date().getMonth())
            .reduce((sum, e) => sum + e.amount, 0)
        }
      };
    } catch (error) {
      console.error('Error fetching employee expenses:', error);
      return { success: false, error: 'Error al obtener gastos de empleados' };
    }
  }

  @Post('expenses')
  @Roles('admin', 'finance_manager', 'hr_manager', 'employee')
  async createEmployeeExpense(@Body() expenseData: Partial<EmployeeExpense>) {
    try {
      const newExpense: EmployeeExpense = {
        id: `ee_${Date.now()}`,
        employeeId: expenseData.employeeId!,
        employeeName: expenseData.employeeName!,
        description: expenseData.description!,
        amount: expenseData.amount!,
        category: expenseData.category!,
        expenseDate: expenseData.expenseDate!,
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
    } catch (error) {
      console.error('Error creating employee expense:', error);
      return { success: false, error: 'Error al crear gasto' };
    }
  }

  @Patch('expenses/:id/approve')
  @Roles('admin', 'finance_manager', 'hr_manager')
  async approveExpense(@Param('id') id: string) {
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
    } catch (error) {
      console.error('Error approving expense:', error);
      return { success: false, error: 'Error al aprobar gasto' };
    }
  }

  @Patch('expenses/:id/reimburse')
  @Roles('admin', 'finance_manager')
  async reimburseExpense(@Param('id') id: string) {
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
    } catch (error) {
      console.error('Error reimbursing expense:', error);
      return { success: false, error: 'Error al reembolsar gasto' };
    }
  }

  @Get('categories')
  @Roles('admin', 'finance_manager', 'hr_manager', 'employee')
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
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      return { success: false, error: 'Error al obtener categorías de gastos' };
    }
  }
}
