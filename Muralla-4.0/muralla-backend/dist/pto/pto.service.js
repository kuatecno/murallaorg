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
exports.PtoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let PtoService = class PtoService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getBalances(employeeId) {
        if (employeeId) {
            return this.prisma.pTOBalance.findMany({ where: { employeeId } });
        }
        return this.prisma.pTOBalance.findMany();
    }
    async createRequest(employeeId, dto) {
        const { startDate, endDate, totalDays, reason } = dto;
        return this.prisma.pTORequest.create({
            data: {
                employeeId,
                startDate,
                endDate,
                totalDays,
                reason,
                status: client_1.PTOStatus.PENDING,
                submittedAt: new Date(),
            },
        });
    }
    async listRequests(filters) {
        return this.prisma.pTORequest.findMany({ where: { ...filters } });
    }
    async updateStatus(id, dto, approverId) {
        const req = await this.prisma.pTORequest.findUnique({ where: { id } });
        if (!req)
            throw new common_1.NotFoundException('PTO request not found');
        return this.prisma.pTORequest.update({
            where: { id },
            data: {
                status: dto.status,
                approvedBy: dto.status === client_1.PTOStatus.APPROVED ? approverId : undefined,
                approvedAt: dto.status === client_1.PTOStatus.APPROVED ? new Date() : undefined,
                rejectedAt: dto.status === client_1.PTOStatus.REJECTED ? new Date() : undefined,
                cancelledAt: dto.status === client_1.PTOStatus.CANCELLED ? new Date() : undefined,
            },
        });
    }
};
exports.PtoService = PtoService;
exports.PtoService = PtoService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PtoService);
