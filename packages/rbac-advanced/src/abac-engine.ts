import type { ABACPolicy, AuthorizationContext } from './types';

export class ABACEngine {
  private readonly policies: ABACPolicy[] = [];

  addPolicy(policy: ABACPolicy): void {
    this.policies.push(policy);
    this.policies.sort((a, b) => b.priority - a.priority);
  }

  async authorize(context: AuthorizationContext): Promise<boolean> {
    for (const policy of this.policies) {
      if (this.matchesPolicy(policy, context)) {
        return policy.effect === 'allow';
      }
    }

    return false;
  }

  private matchesPolicy(policy: ABACPolicy, context: AuthorizationContext): boolean {
    if (!this.matchesSubjects(policy, context)) return false;
    if (!this.matchesResources(policy, context)) return false;
    if (!this.matchesActions(policy, context)) return false;
    if (!this.matchesConditions(policy, context)) return false;

    return true;
  }

  private matchesSubjects(policy: ABACPolicy, context: AuthorizationContext): boolean {
    if (policy.subjects.includes('*')) return true;
    if (policy.subjects.includes(`user:${context.user.id}`)) return true;
    return policy.subjects.some((subject) => {
      if (subject.startsWith('role:')) {
        const role = subject.substring(5);
        return context.user.roles.includes(role);
      }
      return false;
    });
  }

  private matchesResources(policy: ABACPolicy, context: AuthorizationContext): boolean {
    if (policy.resources.includes('*')) return true;
    if (policy.resources.includes(`${context.resource.type}:*`)) return true;
    return policy.resources.includes(`${context.resource.type}:${context.resource.id}`);
  }

  private matchesActions(policy: ABACPolicy, context: AuthorizationContext): boolean {
    if (policy.actions.includes('*')) return true;
    return policy.actions.includes(context.action);
  }

  private matchesConditions(policy: ABACPolicy, context: AuthorizationContext): boolean {
    if (policy.conditions.length === 0) return true;

    for (const condition of policy.conditions) {
      const attributeValue = this.getAttributeValue(condition.attribute, context);

      switch (condition.operator) {
        case 'equals':
          if (attributeValue !== condition.value) return false;
          break;
        case 'not_equals':
          if (attributeValue === condition.value) return false;
          break;
        case 'in':
          if (!Array.isArray(condition.value) || !condition.value.includes(attributeValue)) return false;
          break;
        case 'not_in':
          if (Array.isArray(condition.value) && condition.value.includes(attributeValue)) return false;
          break;
        case 'greater_than':
          if (typeof attributeValue !== 'number' || typeof condition.value !== 'number' || attributeValue <= condition.value) return false;
          break;
        case 'less_than':
          if (typeof attributeValue !== 'number' || typeof condition.value !== 'number' || attributeValue >= condition.value) return false;
          break;
        case 'contains':
          if (typeof attributeValue !== 'string' || typeof condition.value !== 'string' || !attributeValue.includes(condition.value)) return false;
          break;
      }
    }

    return true;
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
