import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.TaskCreateInput) {
    return this.prisma.task.create({ data, include: { project: true, assignee: true } });
  }

  async findAll() {
    return this.prisma.task.findMany({ include: { project: true, assignee: true } });
  }

  async findOne(id: string) {
    return this.prisma.task.findUnique({ 
      where: { id }, 
      include: { project: true, assignee: true } 
    });
  }

  async findByProject(projectId: string) {
    return this.prisma.task.findMany({ 
      where: { projectId }, 
      include: { project: true, assignee: true } 
    });
  }

  async findByAssignee(assigneeId: string) {
    return this.prisma.task.findMany({ 
      where: { assigneeId }, 
      include: { project: true, assignee: true } 
    });
  }

  async update(id: string, data: Prisma.TaskUpdateInput) {
    return this.prisma.task.update({ 
      where: { id }, 
      data, 
      include: { project: true, assignee: true } 
    });
  }

  async remove(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}
