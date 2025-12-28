export interface ZeroTrustConfig {
  verifyEveryRequest?: boolean;
  trustDomains?: string[];
}

export class ZeroTrustValidator {
  constructor(config?: ZeroTrustConfig);
  validate(request: any): Promise<boolean>;
  verifyIdentity(token: string): Promise<boolean>;
}

export class ZeroTrustEngine extends ZeroTrustValidator {
  constructor(config?: ZeroTrustConfig);
}

export function createZeroTrustValidator(config?: ZeroTrustConfig): ZeroTrustValidator;
