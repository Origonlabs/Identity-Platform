/**
 * OAuth Provider Interface
 * All OAuth providers must implement this interface
 */
export interface IOAuthProvider {
  /**
   * Provider identifier (github, google, microsoft, etc.)
   */
  readonly providerId: string;

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthorizationUrl(options: AuthorizationUrlOptions): Promise<string>;

  /**
   * Exchange authorization code for access token
   */
  getAccessToken(code: string, redirectUri: string): Promise<ProviderTokens>;

  /**
   * Get user profile from provider
   */
  getUserProfile(accessToken: string): Promise<ProviderUserProfile>;

  /**
   * Refresh access token (if supported)
   */
  refreshAccessToken?(refreshToken: string): Promise<ProviderTokens>;

  /**
   * Revoke access token (if supported)
   */
  revokeAccessToken?(accessToken: string): Promise<void>;
}

export interface AuthorizationUrlOptions {
  redirectUri: string;
  state: string;
  scope?: string[];
  prompt?: string;
  loginHint?: string;
  extraParams?: Record<string, string>;
}

export interface ProviderTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
  idToken?: string; // For OIDC providers
}

export interface ProviderUserProfile {
  id: string; // Provider's user ID
  email?: string;
  emailVerified?: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  locale?: string;
  raw: Record<string, any>; // Raw profile data from provider
}

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  scope?: string[];
  extraParams?: Record<string, any>;
}
