import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePtoRequestDto } from './dto/create-pto-request.dto';
import { UpdatePtoStatusDto } from './dto/update-pto-status.dto';
import { PTOStatus } from '@prisma/client';

@Injectable()
export class PtoService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalances(employeeId?: string) {
    if (employeeId) {
      return this.prisma.pTOBalance.findMany({ where: { employeeId } });
    }
    return this.prisma.pTOBalance.findMany();
  }

  async createRequest(employeeId: string, dto: CreatePtoRequestDto) {
    const { startDate, endDate, totalDays, reason } = dto;
    return this.prisma.pTORequest.create({
      data: {
        employeeId,
        startDate,
        endDate,
        totalDays,
        reason,
        status: PTOStatus.PENDING,
        submittedAt: new Date(),
      },
    });
  }

  async listRequests(filters: { employeeId?: string; status?: PTOStatus }) {
    return this.prisma.pTORequest.findMany({ where: { ...filters } });
  }

  async updateStatus(id: string, dto: UpdatePtoStatusDto, approverId: string) {
    const req = await this.prisma.pTORequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('PTO request not found');

    return this.prisma.pTORequest.update({
      where: { id },
      data: {
        status: dto.status,
        approvedBy: dto.status === PTOStatus.APPROVED ? approverId : undefined,
        approvedAt: dto.status === PTOStatus.APPROVED ? new Date() : undefined,
        rejectedAt: dto.status === PTOStatus.REJECTED ? new Date() : undefined,
        cancelledAt: dto.status === PTOStatus.CANCELLED ? new Date() : undefined,
      },
    });
  }
}
