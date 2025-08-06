import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type RoleType = 'admin' | 'manager' | 'staff' | 'guest' | 'employee' | 'finance_manager' | 'hr_manager';

export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
