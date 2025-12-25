import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * OAuth 2.0 error responses according to RFC 6749
 */
export class OAuthException extends HttpException {
  constructor(
    public readonly error: string,
    public readonly errorDescription: string,
    public readonly errorUri?: string,
    public readonly state?: string,
  ) {
    super(
      {
        error,
        error_description: errorDescription,
        ...(errorUri && { error_uri: errorUri }),
        ...(state && { state }),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidRequestException extends OAuthException {
  constructor(description: string, state?: string) {
    super('invalid_request', description, undefined, state);
  }
}

export class InvalidClientException extends OAuthException {
  constructor(description: string = 'Client authentication failed') {
    super('invalid_client', description);
  }
}

export class InvalidGrantException extends OAuthException {
  constructor(description: string = 'The provided authorization grant is invalid') {
    super('invalid_grant', description);
  }
}

export class UnauthorizedClientException extends OAuthException {
  constructor(description: string = 'The client is not authorized to use this grant type') {
    super('unauthorized_client', description);
  }
}

export class UnsupportedGrantTypeException extends OAuthException {
  constructor(grantType: string) {
    super(
      'unsupported_grant_type',
      `Grant type '${grantType}' is not supported`,
    );
  }
}

export class InvalidScopeException extends OAuthException {
  constructor(scope: string) {
    super('invalid_scope', `The requested scope '${scope}' is invalid or not supported`);
  }
}

export class AccessDeniedException extends OAuthException {
  constructor(description: string = 'The resource owner denied the request', state?: string) {
    super('access_denied', description, undefined, state);
  }
}

export class ServerErrorException extends OAuthException {
  constructor(description: string = 'The authorization server encountered an unexpected error') {
    super('server_error', description);
  }
}

export class TemporarilyUnavailableException extends OAuthException {
  constructor(description: string = 'The authorization server is temporarily unavailable') {
    super('temporarily_unavailable', description);
  }
}

/**
 * PKCE-related exceptions
 */
export class InvalidCodeChallengeException extends OAuthException {
  constructor() {
    super('invalid_request', 'Invalid code_challenge or code_challenge_method');
  }
}

export class InvalidCodeVerifierException extends OAuthException {
  constructor() {
    super('invalid_grant', 'Invalid code_verifier');
  }
}

/**
 * OIDC-related exceptions
 */
export class LoginRequiredException extends OAuthException {
  constructor(state?: string) {
    super('login_required', 'The authorization server requires end-user authentication', undefined, state);
  }
}

export class ConsentRequiredException extends OAuthException {
  constructor(state?: string) {
    super('consent_required', 'The authorization server requires end-user consent', undefined, state);
  }
}

export class InteractionRequiredException extends OAuthException {
  constructor(state?: string) {
    super('interaction_required', 'The authorization server requires end-user interaction', undefined, state);
  }
}
