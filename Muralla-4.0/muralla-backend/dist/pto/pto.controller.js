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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PtoController = void 0;
const common_1 = require("@nestjs/common");
const pto_service_1 = require("./pto.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../common/roles.guard");
const roles_decorator_1 = require("../common/roles.decorator");
const create_pto_request_dto_1 = require("./dto/create-pto-request.dto");
const update_pto_status_dto_1 = require("./dto/update-pto-status.dto");
const client_1 = require("@prisma/client");
let PtoController = class PtoController {
    constructor(ptoService) {
        this.ptoService = ptoService;
    }
    // PTO Balances
    getBalances(employeeId) {
        return this.ptoService.getBalances(employeeId);
    }
    // Submit PTO Request (employee)
    createRequest(dto, req) {
        return this.ptoService.createRequest(req.user.id, dto);
    }
    // List PTO Requests (employees see own, managers see all)
    listRequests(employeeId, status, req) {
        // Employees can only view their own requests unless they have higher role
        if (req.user.role === 'employee') {
            employeeId = req.user.id;
        }
        return this.ptoService.listRequests({ employeeId, status });
    }
    // Approve/Reject/Cancel PTO (managers)
    updateStatus(id, dto, req) {
        return this.ptoService.updateStatus(id, dto, req.user.id);
    }
};
exports.PtoController = PtoController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('balances'),
    __param(0, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PtoController.prototype, "getBalances", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('employee'),
    (0, common_1.Post)('requests'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pto_request_dto_1.CreatePtoRequestDto, Object]),
    __metadata("design:returntype", void 0)
], PtoController.prototype, "createRequest", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('employee', 'hr_manager', 'manager', 'admin'),
    (0, common_1.Get)('requests'),
    __param(0, (0, common_1.Query)('employeeId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], PtoController.prototype, "listRequests", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('hr_manager', 'manager', 'admin'),
    (0, common_1.Patch)('requests/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_pto_status_dto_1.UpdatePtoStatusDto, Object]),
    __metadata("design:returntype", void 0)
], PtoController.prototype, "updateStatus", null);
exports.PtoController = PtoController = __decorate([
    (0, common_1.Controller)('pto'),
    __metadata("design:paramtypes", [pto_service_1.PtoService])
], PtoController);
