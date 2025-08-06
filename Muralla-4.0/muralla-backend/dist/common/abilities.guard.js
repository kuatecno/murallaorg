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
exports.CheckAbilities = exports.AbilitiesGuard = exports.RequireAbility = exports.ABILITY_METADATA_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const abilities_factory_1 = require("./abilities.factory");
// Metadata key for abilities
exports.ABILITY_METADATA_KEY = 'ability';
// Decorator to define required permissions using NestJS SetMetadata
const RequireAbility = (action, subject, field) => (0, common_1.SetMetadata)(exports.ABILITY_METADATA_KEY, { action, subject, field });
exports.RequireAbility = RequireAbility;
let AbilitiesGuard = class AbilitiesGuard {
    // duplicate role field removed
    constructor(reflector, abilityFactory) {
        this.reflector = reflector;
        this.abilityFactory = abilityFactory;
    }
    async canActivate(context) {
        var _a;
        const requiredAbility = this.reflector.getAllAndOverride(exports.ABILITY_METADATA_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredAbility) {
            return true; // No ability requirement, allow access
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) {
            throw new common_1.ForbiddenException('User not authenticated');
        }
        const ability = this.abilityFactory.createForUser(user);
        const { action, subject, field } = requiredAbility;
        // Get the resource from request if available
        let resource;
        if ((_a = request.params) === null || _a === void 0 ? void 0 : _a.id) {
            // For operations on specific resources, we might need to fetch the resource
            // This is a simplified version - in practice, you might want to fetch the actual resource
            resource = { id: request.params.id };
        }
        // Check field-level permissions if specified
        if (field && request.body) {
            const hasFieldAccess = this.checkFieldAccess(ability, action, subject, field, user);
            if (!hasFieldAccess) {
                throw new common_1.ForbiddenException(`Insufficient permissions to ${action} ${field} on ${subject}`);
            }
        }
        // Check general ability (third param must match subject type, so cast to any safely)
        const hasPermission = resource
            ? ability.can(action, subject, resource)
            : ability.can(action, subject);
        if (!hasPermission) {
            throw new common_1.ForbiddenException(`Insufficient permissions to ${action} ${subject}`);
        }
        return true;
    }
    checkFieldAccess(ability, action, subject, field, user) {
        // Field-level access control logic
        // This is a simplified implementation - you can extend this based on your needs
        // Admin can access all fields
        if (user.role.name === 'admin') {
            return true;
        }
        // Define sensitive fields that require special permissions
        const sensitiveFields = {
            User: ['password', 'roleId', 'isDeleted'],
            Role: ['permissions'],
            Transaction: ['amount'],
        };
        const subjectSensitiveFields = sensitiveFields[subject] || [];
        if (subjectSensitiveFields.includes(field)) {
            // Only admin and manager can modify sensitive fields
            return ['admin', 'manager'].includes(user.role.name);
        }
        // For non-sensitive fields, use the general ability check
        return ability.can(action, subject);
    }
};
exports.AbilitiesGuard = AbilitiesGuard;
exports.AbilitiesGuard = AbilitiesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        abilities_factory_1.AbilityFactory])
], AbilitiesGuard);
// Alias decorator with a friendlier name
exports.CheckAbilities = exports.RequireAbility;
