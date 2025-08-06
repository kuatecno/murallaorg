import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// import { AuditOperation } from '@prisma/client';

export enum AuditOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAuditTrail(params: {
    tableName: string;
    recordId: string;
    operation: AuditOperation;
    beforeData?: any;
    afterData?: any;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const {
      tableName,
      recordId,
      operation,
      beforeData,
      afterData,
      userId,
      ipAddress,
      userAgent,
    } = params;

    return (this.prisma as any).auditTrail.create({
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

  async getAuditHistory(tableName: string, recordId: string) {
    return (this.prisma as any).auditTrail.findMany({
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

  async getAuditHistoryByUser(userId: string, limit = 50) {
    return (this.prisma as any).auditTrail.findMany({
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
    return (this.prisma as any).auditTrail.findMany({
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
  createDiff(before: any, after: any) {
    const changes: Record<string, { from: any; to: any }> = {};
    
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
}
