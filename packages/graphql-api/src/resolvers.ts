import type { GraphQLContext } from './types';

export const resolvers = {
  Query: {
    me: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Unauthorized');
      }
      return {
        id: context.userId,
        email: 'user@example.com',
        name: 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    users: async (_: unknown, args: { limit?: number; offset?: number }) => {
      return [];
    },
    teams: async () => {
      return [];
    },
    oauthConnections: async (_: unknown, __: unknown, context: GraphQLContext) => {
      if (!context.userId) {
        throw new Error('Unauthorized');
      }
      return [];
    },
  },
  Mutation: {
    updateUser: async (_: unknown, args: { input: { name?: string; email?: string } }) => {
      return {
        id: '1',
        email: args.input.email || 'user@example.com',
        name: args.input.name || 'User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    createTeam: async (_: unknown, args: { input: { name: string; memberIds: string[] } }) => {
      return {
        id: `team_${Date.now()}`,
        name: args.input.name,
        members: [],
        createdAt: new Date().toISOString(),
      };
    },
    deleteTeam: async (_: unknown, args: { id: string }) => {
      return true;
    },
  },
};
