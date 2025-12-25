import type { ABACPolicy, Condition } from './types';

export class PolicyBuilder {
  private policy: Partial<ABACPolicy> = {
    effect: 'allow',
    subjects: [],
    resources: [],
    actions: [],
    conditions: [],
    priority: 0,
  };

  static create(name: string): PolicyBuilder {
    const builder = new PolicyBuilder();
    builder.policy.name = name;
    builder.policy.id = `policy_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    return builder;
  }

  allow(): this {
    this.policy.effect = 'allow';
    return this;
  }

  deny(): this {
    this.policy.effect = 'deny';
    return this;
  }

  forUsers(...userIds: string[]): this {
    this.policy.subjects = userIds.map((id) => `user:${id}`);
    return this;
  }

  forRoles(...roleIds: string[]): this {
    this.policy.subjects = roleIds.map((id) => `role:${id}`);
    return this;
  }

  forAll(): this {
    this.policy.subjects = ['*'];
    return this;
  }

  onResources(...resources: string[]): this {
    this.policy.resources = resources;
    return this;
  }

  onAllResources(): this {
    this.policy.resources = ['*'];
    return this;
  }

  withActions(...actions: string[]): this {
    this.policy.actions = actions;
    return this;
  }

  withAllActions(): this {
    this.policy.actions = ['*'];
    return this;
  }

  when(condition: Condition): this {
    if (!this.policy.conditions) {
      this.policy.conditions = [];
    }
    this.policy.conditions.push(condition);
    return this;
  }

  withPriority(priority: number): this {
    this.policy.priority = priority;
    return this;
  }

  build(): ABACPolicy {
    if (!this.policy.id || !this.policy.name) {
      throw new Error('Policy must have id and name');
    }

    return {
      id: this.policy.id,
      name: this.policy.name,
      effect: this.policy.effect!,
      subjects: this.policy.subjects!,
      resources: this.policy.resources!,
      actions: this.policy.actions!,
      conditions: this.policy.conditions!,
      priority: this.policy.priority!,
    };
  }
}
