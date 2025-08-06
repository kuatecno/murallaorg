import { Injectable } from '@nestjs/common';
import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { User, Role } from '@prisma/client';

type Subjects = 'User' | 'Role' | 'Project' | 'Task' | 'Document' | 'Product' | 'Sale' | 'Transaction' | 'all';

// Define the ability type
export type AppAbility = Ability<[string, Subjects]>;
export const AppAbility = Ability as AbilityClass<AppAbility>;

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

@Injectable()
export class AbilityFactory {
  createForUser(user: User & { role: Role }): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(AppAbility);

    if (user.role.name === 'admin') {
      // Admin can manage everything
      can('manage', 'all');
      return build({
        // Use a function to detect subject types
        detectSubjectType: (item) => (item as any).constructor?.name || 'unknown',
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
  canUserPerform(user: User & { role: Role }, action: string, subject: string): boolean {
    const ability = this.createForUser(user);
    return ability.can(action, subject as Subjects);
  }

  // Helper method to get all permissions for a user
  getUserPermissions(user: User & { role: Role }): string[] {
    const ability = this.createForUser(user);
    const permissions: string[] = [];
    
    // Define all possible subjects and actions to check
    const subjects = ['User', 'Role', 'Project', 'Task', 'Document', 'Product', 'Sale', 'Transaction'];
    const actions = ['create', 'read', 'update', 'delete', 'manage'];
    
    subjects.forEach(subject => {
      actions.forEach(action => {
        if (ability.can(action, subject as Subjects)) {
          permissions.push(`${action}:${subject}`);
        }
      });
    });
    
    return permissions;
  }
}
