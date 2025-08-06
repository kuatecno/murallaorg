import { Module } from '@nestjs/common';
import { PtoService } from './pto.service';
import { PtoController } from './pto.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PtoController],
  providers: [PtoService, PrismaService],
})
export class PtoModule {}
