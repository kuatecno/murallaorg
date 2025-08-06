import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    const method = request.method;
    const route = request.route?.path || request.url;
    const userRole = request.user?.role?.name;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = response.statusCode;

          this.metricsService.incrementHttpRequests(method, route, statusCode, userRole);
          this.metricsService.recordHttpRequestDuration(method, route, statusCode, duration);

          // Track user actions for business metrics
          if (request.user && method !== 'GET') {
            const action = this.getActionFromMethod(method);
            const resource = this.getResourceFromRoute(route);
            this.metricsService.incrementUserAction(action, userRole, resource);
          }
        },
        error: (error) => {
          const duration = (Date.now() - startTime) / 1000;
          const statusCode = error.status || 500;

          this.metricsService.incrementHttpRequests(method, route, statusCode, userRole);
          this.metricsService.recordHttpRequestDuration(method, route, statusCode, duration);
          this.metricsService.incrementApiError(route, error.name || 'UnknownError', statusCode);
        },
      }),
    );
  }

  private getActionFromMethod(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      case 'GET':
        return 'read';
      default:
        return 'unknown';
    }
  }

  private getResourceFromRoute(route: string): string {
    // Extract resource name from route path
    const segments = route.split('/').filter(Boolean);
    if (segments.length > 0) {
      return segments[0]; // First segment is usually the resource
    }
    return 'unknown';
  }
}
