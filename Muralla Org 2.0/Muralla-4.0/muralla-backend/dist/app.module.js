"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const apollo_1 = require("@nestjs/apollo");
const path_1 = require("path");
const app_controller_1 = require("./app.controller");
const users_module_1 = require("./users/users.module");
const roles_module_1 = require("./roles/roles.module");
const auth_module_1 = require("./auth/auth.module");
const projects_module_1 = require("./projects/projects.module");
const tasks_module_1 = require("./tasks/tasks.module");
const knowledge_module_1 = require("./knowledge/knowledge.module");
const notifications_module_1 = require("./notifications/notifications.module");
const inventory_module_1 = require("./inventory/inventory.module");
const finance_module_1 = require("./finance/finance.module");
const pto_module_1 = require("./pto/pto.module");
const websocket_module_1 = require("./websocket/websocket.module");
const queue_module_1 = require("./queue/queue.module");
const health_module_1 = require("./health/health.module");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const prisma_service_1 = require("./prisma/prisma.service");
const audit_service_1 = require("./common/audit.service");
const pagination_service_1 = require("./common/pagination.service");
const abilities_factory_1 = require("./common/abilities.factory");
const abilities_guard_1 = require("./common/abilities.guard");
const logger_module_1 = require("./common/logger.module");
const metrics_service_1 = require("./common/metrics.service");
const metrics_controller_1 = require("./common/metrics.controller");
const metrics_interceptor_1 = require("./common/metrics.interceptor");
const core_2 = require("@nestjs/core");
const jwt_auth_guard_1 = require("./auth/jwt-auth.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            graphql_1.GraphQLModule.forRoot({
                driver: apollo_1.ApolloDriver,
                typePaths: ['./**/*.graphql'],
                definitions: {
                    path: (0, path_1.join)(process.cwd(), 'src/graphql.ts'),
                    outputAs: 'class',
                },
                sortSchema: true,
                playground: true,
                installSubscriptionHandlers: true,
            }),
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            auth_module_1.AuthModule,
            projects_module_1.ProjectsModule,
            tasks_module_1.TasksModule,
            knowledge_module_1.KnowledgeModule,
            notifications_module_1.NotificationsModule,
            inventory_module_1.InventoryModule,
            pto_module_1.PtoModule,
            finance_module_1.FinanceModule,
            websocket_module_1.WebsocketModule,
            queue_module_1.QueueModule,
            health_module_1.HealthModule,
            logger_module_1.CustomLoggerModule,
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000, // 1 minute
                    limit: 100, // 100 requests per minute
                },
            ]),
        ],
        controllers: [app_controller_1.AppController, metrics_controller_1.MetricsController],
        providers: [
            prisma_service_1.PrismaService,
            audit_service_1.AuditService,
            pagination_service_1.PaginationService,
            abilities_factory_1.AbilityFactory,
            metrics_service_1.MetricsService,
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: abilities_guard_1.AbilitiesGuard,
            },
            {
                provide: core_2.APP_INTERCEPTOR,
                useClass: metrics_interceptor_1.MetricsInterceptor,
            },
        ],
    })
], AppModule);
