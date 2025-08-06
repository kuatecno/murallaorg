import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { BankController } from '../modules/finance/controllers/bank.controller';
import { PayrollController } from '../modules/finance/controllers/payroll.controller';
import { StaffFinanceController } from '../modules/finance/controllers/staff-finance.controller';
import { MercadoPagoService } from './mercado-pago.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [FinanceController, BankController, PayrollController, StaffFinanceController],
  providers: [
    FinanceService,
    MercadoPagoService,
    PrismaService,
    AuditService,
  ],
  exports: [FinanceService, MercadoPagoService],
})
export class FinanceModule {}
