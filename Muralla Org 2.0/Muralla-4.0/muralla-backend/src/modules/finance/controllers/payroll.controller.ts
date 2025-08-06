import { Controller, Get, Post, Body, Query, Param, UseGuards, Patch } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RolesGuard } from '../../../common/roles.guard';
import { Roles } from '../../../common/roles.decorator';

// Types for Payroll API
interface PayrollRunRequest {
  payPeriodStart: string;
  payPeriodEnd: string;
  notes?: string;
  employeeIds?: string[];
}

interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  hoursWorked?: number;
  overtimeHours?: number;
  bonusAmount?: number;
  allowances?: number;
  grossPay: number;
  taxDeductions: number;
  socialSecurity: number;
  otherDeductions?: number;
  netPay: number;
  notes?: string;
}

interface PayrollRun {
  id: string;
  runDate: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSED' | 'CANCELLED';
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  processedBy?: string;
  processedAt?: string;
  entries: PayrollEntry[];
}

@Controller('api/payroll')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayrollController {
  // Mock data for development
  private payrollRuns: PayrollRun[] = [
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

  @Get('runs')
  @Roles('admin', 'finance_manager', 'hr_manager')
  async getPayrollRuns(
    @Query('status') status?: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0'
  ) {
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
    } catch (error) {
      console.error('Error fetching payroll runs:', error);
      return { success: false, error: 'Error al obtener nóminas' };
    }
  }

  @Get('runs/:id')
  @Roles('admin', 'finance_manager', 'hr_manager')
  async getPayrollRun(@Param('id') id: string) {
    try {
      const payrollRun = this.payrollRuns.find(run => run.id === id);
      
      if (!payrollRun) {
        return { success: false, error: 'Nómina no encontrada' };
      }

      return { success: true, payrollRun };
    } catch (error) {
      console.error('Error fetching payroll run:', error);
      return { success: false, error: 'Error al obtener nómina' };
    }
  }

  @Post('runs')
  @Roles('admin', 'finance_manager', 'hr_manager')
  async createPayrollRun(@Body() payrollData: PayrollRunRequest) {
    try {
      const newPayrollRun: PayrollRun = {
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
    } catch (error) {
      console.error('Error creating payroll run:', error);
      return { success: false, error: 'Error al crear nómina' };
    }
  }

  @Patch('runs/:id/approve')
  @Roles('admin', 'finance_manager')
  async approvePayrollRun(@Param('id') id: string) {
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
    } catch (error) {
      console.error('Error approving payroll run:', error);
      return { success: false, error: 'Error al aprobar nómina' };
    }
  }

  @Patch('runs/:id/process')
  @Roles('admin', 'finance_manager')
  async processPayrollRun(@Param('id') id: string) {
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
    } catch (error) {
      console.error('Error processing payroll run:', error);
      return { success: false, error: 'Error al procesar nómina' };
    }
  }

  @Get('summary')
  @Roles('admin', 'finance_manager', 'hr_manager', 'employee')
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
    } catch (error) {
      console.error('Error fetching payroll summary:', error);
      return { success: false, error: 'Error al obtener resumen de nómina' };
    }
  }
}
