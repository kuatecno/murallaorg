import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, PrismaHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memoryHealth: MemoryHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      () => this.memoryHealth.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memoryHealth.checkRSS('memory_rss', 150 * 1024 * 1024),
    ]);
  }

  @Public()
  @Get('readyz')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
      async () => {
        // Check if we can perform basic database operations
        try {
          await this.prisma.user.count();
          return { database_operations: { status: 'up' } };
        } catch (error) {
          throw new Error('Database operations failed');
        }
      },
    ]);
  }

  @Public()
  @Get('healthz')
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.memoryHealth.checkHeap('memory_heap', 200 * 1024 * 1024),
      () => this.memoryHealth.checkRSS('memory_rss', 200 * 1024 * 1024),
      async () => {
        // Basic application health check
        return { application: { status: 'up', timestamp: new Date().toISOString() } };
      },
    ]);
  }
}
