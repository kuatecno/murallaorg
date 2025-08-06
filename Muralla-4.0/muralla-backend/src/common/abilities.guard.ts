import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AbilityFactory, Action, AppAbility } from './abilities.factory';
import { User, Role } from '@prisma/client';

// Metadata key for abilities
export const ABILITY_METADATA_KEY = 'ability';

// Decorator to define required permissions using NestJS SetMetadata
export const RequireAbility = (
  action: Action,
  subject: string,
  field?: string,
) => SetMetadata(ABILITY_METADATA_KEY, { action, subject, field });



@Injectable()
export class AbilitiesGuard implements CanActivate {
  // duplicate role field removed
  constructor(
    private reflector: Reflector,
    private abilityFactory: AbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredAbility = this.reflector.getAllAndOverride<{
      action: Action;
      subject: string;
      field?: string;
    }>(ABILITY_METADATA_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredAbility) {
      return true; // No ability requirement, allow access
    }

    const request = context.switchToHttp().getRequest();
    const user: User & { role: Role } = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const ability = this.abilityFactory.createForUser(user);
    const { action, subject, field } = requiredAbility;

    // Get the resource from request if available
    let resource;
    if (request.params?.id) {
      // For operations on specific resources, we might need to fetch the resource
      // This is a simplified version - in practice, you might want to fetch the actual resource
      resource = { id: request.params.id };
    }

    // Check field-level permissions if specified
    if (field && request.body) {
      const hasFieldAccess = this.checkFieldAccess(ability, action, subject, field, user);
      if (!hasFieldAccess) {
        throw new ForbiddenException(`Insufficient permissions to ${action} ${field} on ${subject}`);
      }
    }

    // Check general ability (third param must match subject type, so cast to any safely)
    const hasPermission = resource
      ? ability.can(action, subject as any, resource as any)
      : ability.can(action, subject as any);
    
    if (!hasPermission) {
      throw new ForbiddenException(`Insufficient permissions to ${action} ${subject}`);
    }

    return true;
  }

  private checkFieldAccess(
    ability: AppAbility,
    action: Action,
    subject: string,
    field: string,
    user: User & { role: Role },
  ): boolean {
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

    const subjectSensitiveFields = sensitiveFields[subject as keyof typeof sensitiveFields] || [];
    
    if (subjectSensitiveFields.includes(field)) {
      // Only admin and manager can modify sensitive fields
      return ['admin', 'manager'].includes(user.role.name);
    }

    // For non-sensitive fields, use the general ability check
    return ability.can(action, subject as any);
  }
}

// Alias decorator with a friendlier name
export const CheckAbilities = RequireAbility;
