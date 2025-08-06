import { Injectable } from '@nestjs/common';
import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly databaseConnections: Gauge<string>;
  private readonly queueJobs: Counter<string>;
  private readonly authAttempts: Counter<string>;

  constructor() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register });

    // HTTP request metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'user_role'],
      registers: [register],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers: [register],
    });

    // Connection metrics
    this.activeConnections = new Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
      registers: [register],
    });

    this.databaseConnections = new Gauge({
      name: 'database_connections_active',
      help: 'Number of active database connections',
      registers: [register],
    });

    // Queue metrics
    this.queueJobs = new Counter({
      name: 'queue_jobs_total',
      help: 'Total number of queue jobs processed',
      labelNames: ['queue_name', 'status'],
      registers: [register],
    });

    // Authentication metrics
    this.authAttempts = new Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['method', 'status'],
      registers: [register],
    });
  }

  // HTTP request tracking
  incrementHttpRequests(method: string, route: string, statusCode: number, userRole?: string) {
    this.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
      user_role: userRole || 'anonymous',
    });
  }

  recordHttpRequestDuration(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration);
  }

  // WebSocket connection tracking
  incrementActiveConnections() {
    this.activeConnections.inc();
  }

  decrementActiveConnections() {
    this.activeConnections.dec();
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  // Database connection tracking
  setDatabaseConnections(count: number) {
    this.databaseConnections.set(count);
  }

  // Queue job tracking
  incrementQueueJob(queueName: string, status: 'completed' | 'failed' | 'active') {
    this.queueJobs.inc({ queue_name: queueName, status });
  }

  // Authentication tracking
  incrementAuthAttempt(method: 'login' | 'register' | 'refresh', status: 'success' | 'failure') {
    this.authAttempts.inc({ method, status });
  }

  // Custom business metrics
  private readonly userActions = new Counter({
    name: 'user_actions_total',
    help: 'Total number of user actions',
    labelNames: ['action', 'user_role', 'resource'],
    registers: [register],
  });

  private readonly apiErrors = new Counter({
    name: 'api_errors_total',
    help: 'Total number of API errors',
    labelNames: ['endpoint', 'error_type', 'status_code'],
    registers: [register],
  });

  incrementUserAction(action: string, userRole: string, resource: string) {
    this.userActions.inc({ action, user_role: userRole, resource });
  }

  incrementApiError(endpoint: string, errorType: string, statusCode: number) {
    this.apiErrors.inc({
      endpoint,
      error_type: errorType,
      status_code: statusCode.toString(),
    });
  }

  // Get metrics for Prometheus scraping
  getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Clear all metrics (useful for testing)
  clearMetrics() {
    register.clear();
  }
}
