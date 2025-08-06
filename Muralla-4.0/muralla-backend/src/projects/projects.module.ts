import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectsResolver } from './projects.resolver';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ProjectsController],
  providers: [
    ProjectsService,
    PrismaService,
    ProjectsResolver,
  ],
})
export class ProjectsModule {}
