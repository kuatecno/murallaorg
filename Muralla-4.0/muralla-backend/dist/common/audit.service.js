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
exports.AuditService = exports.AuditOperation = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
// import { AuditOperation } from '@prisma/client';
var AuditOperation;
(function (AuditOperation) {
    AuditOperation["CREATE"] = "CREATE";
    AuditOperation["UPDATE"] = "UPDATE";
    AuditOperation["DELETE"] = "DELETE";
    AuditOperation["RESTORE"] = "RESTORE";
})(AuditOperation || (exports.AuditOperation = AuditOperation = {}));
let AuditService = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async logAuditTrail(params) {
        const { tableName, recordId, operation, beforeData, afterData, userId, ipAddress, userAgent, } = params;
        return this.prisma.auditTrail.create({
            data: {
                tableName,
                recordId,
                operation,
                beforeData: beforeData ? JSON.parse(JSON.stringify(beforeData)) : null,
                afterData: afterData ? JSON.parse(JSON.stringify(afterData)) : null,
                userId,
                ipAddress,
                userAgent,
            },
        });
    }
    async getAuditHistory(tableName, recordId) {
        return this.prisma.auditTrail.findMany({
            where: {
                tableName,
                recordId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
        });
    }
    async getAuditHistoryByUser(userId, limit = 50) {
        return this.prisma.auditTrail.findMany({
            where: {
                userId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: limit,
        });
    }
    async getRecentAuditActivity(limit = 100) {
        return this.prisma.auditTrail.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                timestamp: 'desc',
            },
            take: limit,
        });
    }
    // Helper method to compare objects and create diff
    createDiff(before, after) {
        const changes = {};
        // Check for changed/added fields
        for (const key in after) {
            if (before[key] !== after[key]) {
                changes[key] = {
                    from: before[key],
                    to: after[key],
                };
            }
        }
        // Check for removed fields
        for (const key in before) {
            if (!(key in after)) {
                changes[key] = {
                    from: before[key],
                    to: undefined,
                };
            }
        }
        return changes;
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
