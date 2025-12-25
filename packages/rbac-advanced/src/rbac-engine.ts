import type { Role, Permission, AuthorizationContext } from './types';

export class RBACEngine {
  private readonly roles = new Map<string, Role>();

  addRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId);
  }

  async authorize(context: AuthorizationContext): Promise<boolean> {
    const userRoles = context.user.roles.map((roleId) => this.roles.get(roleId)).filter(Boolean) as Role[];

    for (const role of userRoles) {
      if (this.hasPermission(role, context.resource.type, context.action, context)) {
        return true;
      }

      if (role.inherits) {
        for (const inheritedRoleId of role.inherits) {
          const inheritedRole = this.roles.get(inheritedRoleId);
          if (inheritedRole && this.hasPermission(inheritedRole, context.resource.type, context.action, context)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private hasPermission(
    role: Role,
    resourceType: string,
    action: string,
    context: AuthorizationContext
  ): boolean {
    for (const permission of role.permissions) {
      if (permission.resource === resourceType || permission.resource === '*') {
        if (permission.actions.includes(action) || permission.actions.includes('*')) {
          if (!permission.conditions || this.evaluateConditions(permission.conditions, context)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private evaluateConditions(conditions: Permission['conditions'], context: AuthorizationContext): boolean {
    if (!conditions) return true;

    for (const condition of conditions) {
      if (!this.evaluateCondition(condition, context)) {
        return false;
      }
    }

    return true;
  }

  private evaluateCondition(condition: Permission['conditions']![0], context: AuthorizationContext): boolean {
    const attributeValue = this.getAttributeValue(condition.attribute, context);

    switch (condition.operator) {
      case 'equals':
        return attributeValue === condition.value;
      case 'not_equals':
        return attributeValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(attributeValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(attributeValue);
      case 'greater_than':
        return typeof attributeValue === 'number' && typeof condition.value === 'number' && attributeValue > condition.value;
      case 'less_than':
        return typeof attributeValue === 'number' && typeof condition.value === 'number' && attributeValue < condition.value;
      case 'contains':
        return typeof attributeValue === 'string' && typeof condition.value === 'string' && attributeValue.includes(condition.value);
      default:
        return false;
    }
  }

  private getAttributeValue(attribute: string, context: AuthorizationContext): unknown {
    const parts = attribute.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
}
