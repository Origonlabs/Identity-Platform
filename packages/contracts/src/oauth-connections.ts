import { EventContract, EventEnvelope } from './events';

export type OAuthProviderCategory = 'oauth2' | 'oidc' | 'saml';

export type OAuthProvider = {
  id: string;
  name: string;
  category: OAuthProviderCategory;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  supportsPkce: boolean;
  requiresWebhookForRefresh?: boolean;
};

export type OAuthConnection = {
  id: string;
  providerId: string;
  projectId: string;
  tenantId?: string;
  userId: string;
  scope: string[];
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'refreshing' | 'revoked' | 'expired';
};

export type TokenSet = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  issuedAt: string;
  expiresAt?: string;
  idToken?: string;
};

type ConnectionLinkedPayload = {
  connection: OAuthConnection;
  tokenSet: TokenSet;
};

type TokenRefreshedPayload = {
  connectionId: string;
  tokenSet: TokenSet;
};

type ConnectionRevokedPayload = {
  connectionId: string;
  reason: 'user' | 'provider' | 'security';
};

export const oauthConnectionEvents: Record<
  'linked' | 'tokenRefreshed' | 'revoked',
  EventContract<ConnectionLinkedPayload | TokenRefreshedPayload | ConnectionRevokedPayload>
> = {
  linked: {
    type: 'oauth.connection.linked',
    version: '1.0.0',
    schema: 'oauth.connection.linked@1.0.0',
    example: {
      id: 'evt_conn_1',
      type: 'oauth.connection.linked',
      version: '1.0.0',
      occurredAt: new Date().toISOString(),
      payload: {
        connection: {
          id: 'conn_123',
          providerId: 'google',
          projectId: 'proj_123',
          userId: 'user_123',
          scope: ['calendar', 'email'],
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        tokenSet: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          issuedAt: new Date().toISOString(),
          expiresIn: 3600,
        },
      },
      meta: {
        source: 'oauth-connections-service',
      },
    },
  },
  tokenRefreshed: {
    type: 'oauth.connection.token_refreshed',
    version: '1.0.0',
    schema: 'oauth.connection.token_refreshed@1.0.0',
    example: {
      id: 'evt_conn_2',
      type: 'oauth.connection.token_refreshed',
      version: '1.0.0',
      occurredAt: new Date().toISOString(),
      payload: {
        connectionId: 'conn_123',
        tokenSet: {
          accessToken: 'access-token-2',
          refreshToken: 'refresh-token',
          issuedAt: new Date().toISOString(),
          expiresIn: 3600,
        },
      },
      meta: {
        source: 'oauth-connections-service',
      },
    },
  },
  revoked: {
    type: 'oauth.connection.revoked',
    version: '1.0.0',
    schema: 'oauth.connection.revoked@1.0.0',
    example: {
      id: 'evt_conn_3',
      type: 'oauth.connection.revoked',
      version: '1.0.0',
      occurredAt: new Date().toISOString(),
      payload: {
        connectionId: 'conn_123',
        reason: 'security',
      },
      meta: {
        source: 'oauth-connections-service',
      },
    },
  },
};

export type OAuthConnectionEvent =
  | EventEnvelope<ConnectionLinkedPayload>
  | EventEnvelope<TokenRefreshedPayload>
  | EventEnvelope<ConnectionRevokedPayload>;
