import { createYoga } from 'graphql-yoga';
import { createSchema } from '@graphql-tools/schema';
import type { GraphQLContext, GraphQLConfig } from './types';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';

export function createGraphQLServer(config: GraphQLConfig = {}) {
  const schema = createSchema({
    typeDefs,
    resolvers,
  });

  const yoga = createYoga({
    schema,
    context: (req): GraphQLContext => {
      const authHeader = req.headers.get('authorization');
      const userId = authHeader ? extractUserId(authHeader) : undefined;

      return {
        userId,
        permissions: [],
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        userAgent: req.headers.get('user-agent') || 'unknown',
      };
    },
    cors: config.cors !== false,
    graphiql: config.playground !== false,
    graphqlEndpoint: config.path || '/graphql',
  });

  return yoga;
}

function extractUserId(authHeader: string): string | undefined {
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || payload.userId;
  } catch {
    return undefined;
  }
}
