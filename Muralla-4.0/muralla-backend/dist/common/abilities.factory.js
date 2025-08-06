"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbilityFactory = exports.Action = exports.AppAbility = void 0;
const common_1 = require("@nestjs/common");
const ability_1 = require("@casl/ability");
exports.AppAbility = ability_1.Ability;
var Action;
(function (Action) {
    Action["Manage"] = "manage";
    Action["Create"] = "create";
    Action["Read"] = "read";
    Action["Update"] = "update";
    Action["Delete"] = "delete";
})(Action || (exports.Action = Action = {}));
let AbilityFactory = class AbilityFactory {
    createForUser(user) {
        const { can, cannot, build } = new ability_1.AbilityBuilder(exports.AppAbility);
        if (user.role.name === 'admin') {
            // Admin can manage everything
            can('manage', 'all');
            return build({
                // Use a function to detect subject types
                detectSubjectType: (item) => { var _a; return ((_a = item.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown'; },
            });
        }
        // Manager permissions
        if (user.role.name === 'manager') {
            // Users - can manage non-admin users
            can(Action.Read, 'User');
            can(Action.Create, 'User');
            can(Action.Update, 'User');
            can(Action.Delete, 'User');
            // Projects & Tasks - full access
            can(Action.Manage, 'Project');
            can(Action.Manage, 'Task');
            // Knowledge Hub - full access
            can(Action.Manage, 'Document');
            // Inventory & Sales - full access
            can(Action.Manage, 'Product');
            can(Action.Manage, 'Sale');
            // Finance - full access
            can(Action.Manage, 'Transaction');
            // Roles - can read but not modify
            can(Action.Read, 'Role');
        }
        // Staff permissions
        if (user.role.name === 'staff') {
            // Users - can read all, update own profile
            can(Action.Read, 'User');
            can(Action.Update, 'User');
            // Projects - can read all
            can(Action.Read, 'Project');
            // Tasks - can read all, create/update tasks
            can(Action.Read, 'Task');
            can(Action.Create, 'Task');
            can(Action.Update, 'Task');
            // Knowledge Hub - can read all, create/update documents
            can(Action.Read, 'Document');
            can(Action.Create, 'Document');
            can(Action.Update, 'Document');
            // Inventory - can read products, create sales
            can(Action.Read, 'Product');
            can(Action.Create, 'Sale');
            can(Action.Read, 'Sale');
            can(Action.Update, 'Sale');
            // Finance - can read transactions, create expense reports
            can(Action.Read, 'Transaction');
            can(Action.Create, 'Transaction');
            // Roles - can read
            can(Action.Read, 'Role');
        }
        // Guest permissions (very limited)
        if (user.role.name === 'guest') {
            // Users - can only read own profile and update it
            can(Action.Read, 'User');
            can(Action.Update, 'User');
            // Projects - limited read access
            can(Action.Read, 'Project');
            // Tasks - limited read access
            can(Action.Read, 'Task');
            // Knowledge Hub - can read public documents only
            can(Action.Read, 'Document');
            // No access to inventory, sales, or finance
            cannot(Action.Manage, 'Product');
            cannot(Action.Manage, 'Sale');
        }
        return build();
    }
    // Helper method to check if user can perform action on subject
    canUserPerform(user, action, subject) {
        const ability = this.createForUser(user);
        return ability.can(action, subject);
    }
    // Helper method to get all permissions for a user
    getUserPermissions(user) {
        const ability = this.createForUser(user);
        const permissions = [];
        // Define all possible subjects and actions to check
        const subjects = ['User', 'Role', 'Project', 'Task', 'Document', 'Product', 'Sale', 'Transaction'];
        const actions = ['create', 'read', 'update', 'delete', 'manage'];
        subjects.forEach(subject => {
            actions.forEach(action => {
                if (ability.can(action, subject)) {
                    permissions.push(`${action}:${subject}`);
                }
            });
        });
        return permissions;
    }
};
exports.AbilityFactory = AbilityFactory;
exports.AbilityFactory = AbilityFactory = __decorate([
    (0, common_1.Injectable)()
], AbilityFactory);
