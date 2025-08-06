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
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
let MetricsService = class MetricsService {
    constructor() {
        // Custom business metrics
        this.userActions = new prom_client_1.Counter({
            name: 'user_actions_total',
            help: 'Total number of user actions',
            labelNames: ['action', 'user_role', 'resource'],
            registers: [prom_client_1.register],
        });
        this.apiErrors = new prom_client_1.Counter({
            name: 'api_errors_total',
            help: 'Total number of API errors',
            labelNames: ['endpoint', 'error_type', 'status_code'],
            registers: [prom_client_1.register],
        });
        // Collect default metrics (CPU, memory, etc.)
        (0, prom_client_1.collectDefaultMetrics)({ register: prom_client_1.register });
        // HTTP request metrics
        this.httpRequestsTotal = new prom_client_1.Counter({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'route', 'status_code', 'user_role'],
            registers: [prom_client_1.register],
        });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
            registers: [prom_client_1.register],
        });
        // Connection metrics
        this.activeConnections = new prom_client_1.Gauge({
            name: 'websocket_connections_active',
            help: 'Number of active WebSocket connections',
            registers: [prom_client_1.register],
        });
        this.databaseConnections = new prom_client_1.Gauge({
            name: 'database_connections_active',
            help: 'Number of active database connections',
            registers: [prom_client_1.register],
        });
        // Queue metrics
        this.queueJobs = new prom_client_1.Counter({
            name: 'queue_jobs_total',
            help: 'Total number of queue jobs processed',
            labelNames: ['queue_name', 'status'],
            registers: [prom_client_1.register],
        });
        // Authentication metrics
        this.authAttempts = new prom_client_1.Counter({
            name: 'auth_attempts_total',
            help: 'Total number of authentication attempts',
            labelNames: ['method', 'status'],
            registers: [prom_client_1.register],
        });
    }
    // HTTP request tracking
    incrementHttpRequests(method, route, statusCode, userRole) {
        this.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode.toString(),
            user_role: userRole || 'anonymous',
        });
    }
    recordHttpRequestDuration(method, route, statusCode, duration) {
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
    setActiveConnections(count) {
        this.activeConnections.set(count);
    }
    // Database connection tracking
    setDatabaseConnections(count) {
        this.databaseConnections.set(count);
    }
    // Queue job tracking
    incrementQueueJob(queueName, status) {
        this.queueJobs.inc({ queue_name: queueName, status });
    }
    // Authentication tracking
    incrementAuthAttempt(method, status) {
        this.authAttempts.inc({ method, status });
    }
    incrementUserAction(action, userRole, resource) {
        this.userActions.inc({ action, user_role: userRole, resource });
    }
    incrementApiError(endpoint, errorType, statusCode) {
        this.apiErrors.inc({
            endpoint,
            error_type: errorType,
            status_code: statusCode.toString(),
        });
    }
    // Get metrics for Prometheus scraping
    getMetrics() {
        return prom_client_1.register.metrics();
    }
    // Clear all metrics (useful for testing)
    clearMetrics() {
        prom_client_1.register.clear();
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MetricsService);
