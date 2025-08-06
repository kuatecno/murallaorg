"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomLoggerModule = void 0;
const common_1 = require("@nestjs/common");
const nestjs_pino_1 = require("nestjs-pino");
let CustomLoggerModule = class CustomLoggerModule {
};
exports.CustomLoggerModule = CustomLoggerModule;
exports.CustomLoggerModule = CustomLoggerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            nestjs_pino_1.LoggerModule.forRoot({
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
                    customProps: (req, res) => {
                        var _a, _b, _c;
                        return ({
                            traceId: req.id,
                            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
                            userRole: (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === null || _c === void 0 ? void 0 : _c.name,
                            tenant: req.headers['x-tenant-id'],
                        });
                    },
                    customLogLevel: (req, res, err) => {
                        if (res.statusCode >= 400 && res.statusCode < 500) {
                            return 'warn';
                        }
                        else if (res.statusCode >= 500 || err) {
                            return 'error';
                        }
                        else if (res.statusCode >= 300 && res.statusCode < 400) {
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
        exports: [nestjs_pino_1.LoggerModule],
    })
], CustomLoggerModule);
