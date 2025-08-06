import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/audit.service';

@Module({
  controllers: [KnowledgeController],
  providers: [KnowledgeService, PrismaService, AuditService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
