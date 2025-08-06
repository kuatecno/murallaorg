import { Body, Controller, Get, Patch, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { PtoService } from './pto.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { CreatePtoRequestDto } from './dto/create-pto-request.dto';
import { UpdatePtoStatusDto } from './dto/update-pto-status.dto';
import { PTOStatus } from '@prisma/client';

@Controller('pto')
export class PtoController {
  constructor(private readonly ptoService: PtoService) {}

  // PTO Balances
  @UseGuards(JwtAuthGuard)
  @Get('balances')
  getBalances(@Query('employeeId') employeeId?: string) {
    return this.ptoService.getBalances(employeeId);
  }

  // Submit PTO Request (employee)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employee')
  @Post('requests')
  createRequest(@Body() dto: CreatePtoRequestDto, @Request() req: any) {
    return this.ptoService.createRequest(req.user.id, dto);
  }

  // List PTO Requests (employees see own, managers see all)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('employee', 'hr_manager', 'manager', 'admin')
  @Get('requests')
  listRequests(
    @Query('employeeId') employeeId: string | undefined,
    @Query('status') status: PTOStatus | undefined,
    @Request() req: any,
  ) {
    // Employees can only view their own requests unless they have higher role
    if (req.user.role === 'employee') {
      employeeId = req.user.id;
    }
    return this.ptoService.listRequests({ employeeId, status });
  }

  // Approve/Reject/Cancel PTO (managers)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hr_manager', 'manager', 'admin')
  @Patch('requests/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePtoStatusDto,
    @Request() req: any,
  ) {
    return this.ptoService.updateStatus(id, dto, req.user.id);
  }
}
