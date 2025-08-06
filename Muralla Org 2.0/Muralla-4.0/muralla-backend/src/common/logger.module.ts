import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV === 'development' ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            singleLine: true,
            translateTime: 'SYS:standard',
          },
        } : undefined,
        level: process.env.LOG_LEVEL || 'info',
        serializers: {
          req: (req) => ({
            id: req.id,
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            headers: {
              host: req.headers.host,
              'user-agent': req.headers['user-agent'],
              'content-type': req.headers['content-type'],
            },
            remoteAddress: req.remoteAddress,
            remotePort: req.remotePort,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
            headers: {
              'content-type': res.headers['content-type'],
              'content-length': res.headers['content-length'],
            },
          }),
          err: (err) => ({
            type: err.type,
            message: err.message,
            stack: err.stack,
          }),
        },
        genReqId: (req) => {
          // Generate trace ID for request correlation
          return req.headers['x-trace-id'] || 
                 req.headers['x-request-id'] || 
                 `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        },
        customProps: (req, res) => ({
          traceId: req.id,
          userId: (req as any).user?.id,
          userRole: (req as any).user?.role?.name,
          tenant: req.headers['x-tenant-id'],
        }),
        customLogLevel: (req, res, err) => {
          if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
          } else if (res.statusCode >= 500 || err) {
            return 'error';
          } else if (res.statusCode >= 300 && res.statusCode < 400) {
            return 'silent';
          }
          return 'info';
        },
        customSuccessMessage: (req, res) => {
          if (res.statusCode === 404) {
            return 'Resource not found';
          }
          return `${req.method} ${req.url}`;
        },
        customErrorMessage: (req, res, err) => {
          return `${req.method} ${req.url} - ${err.message}`;
        },
      },
    }),
  ],
  exports: [LoggerModule],
})
export class CustomLoggerModule {}
