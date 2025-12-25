export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  inherits?: string[];
  metadata: Record<string, unknown>;
}

export interface Permission {
  id: string;
  resource: string;
  actions: string[];
  conditions?: Condition[];
}

export interface Condition {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains';
  value: unknown;
}

export interface ABACPolicy {
  id: string;
  name: string;
  effect: 'allow' | 'deny';
  subjects: string[];
  resources: string[];
  actions: string[];
  conditions: Condition[];
  priority: number;
}

export interface AuthorizationContext {
  user: {
    id: string;
    roles: string[];
    attributes: Record<string, unknown>;
  };
  resource: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
    owner?: string;
  };
  action: string;
  environment: {
    ip: string;
    time: Date;
    location?: string;
  };
}
