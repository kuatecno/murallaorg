"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const metrics_service_1 = require("./metrics.service");
let MetricsInterceptor = class MetricsInterceptor {
    constructor(metricsService) {
        this.metricsService = metricsService;
    }
    intercept(context, next) {
        var _a, _b, _c;
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const startTime = Date.now();
        const method = request.method;
        const route = ((_a = request.route) === null || _a === void 0 ? void 0 : _a.path) || request.url;
        const userRole = (_c = (_b = request.user) === null || _b === void 0 ? void 0 : _b.role) === null || _c === void 0 ? void 0 : _c.name;
        return next.handle().pipe((0, operators_1.tap)({
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
        }));
    }
    getActionFromMethod(method) {
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
    getResourceFromRoute(route) {
        // Extract resource name from route path
        const segments = route.split('/').filter(Boolean);
        if (segments.length > 0) {
            return segments[0]; // First segment is usually the resource
        }
        return 'unknown';
    }
};
exports.MetricsInterceptor = MetricsInterceptor;
exports.MetricsInterceptor = MetricsInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [metrics_service_1.MetricsService])
], MetricsInterceptor);
