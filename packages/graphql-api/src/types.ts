export interface GraphQLContext {
  userId?: string;
  permissions: string[];
  ip: string;
  userAgent: string;
}

export interface GraphQLConfig {
  port?: number;
  path?: string;
  cors?: boolean;
  playground?: boolean;
}
