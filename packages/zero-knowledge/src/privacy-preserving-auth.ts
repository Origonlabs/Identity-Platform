import type { ZKAuthRequest, PrivacyPreservingClaim } from './types';
import { ZKProofService } from './zk-proof-service';
import { ZKVerifier } from './zk-verifier';

export class PrivacyPreservingAuth {
  private readonly proofService: ZKProofService;
  private readonly verifier: ZKVerifier;

  constructor() {
    this.proofService = new ZKProofService();
    this.verifier = new ZKVerifier();
  }

  async authenticate(request: ZKAuthRequest): Promise<{
    authenticated: boolean;
    claims: PrivacyPreservingClaim[];
    verifiedAttributes: string[];
  }> {
    const claims: PrivacyPreservingClaim[] = [];

    for (const attribute of request.requiredAttributes) {
      const claim = await this.proofService.generateAttributeProof(
        attribute,
        'verified',
        `secret_${request.userId}`
      );
      claims.push(claim);
    }

    const verifiedAttributes: string[] = [];
    for (const claim of claims) {
      const isValid = await this.verifier.verifyAttributeClaim(claim);
      if (isValid) {
        verifiedAttributes.push(claim.attribute);
      }
    }

    return {
      authenticated: verifiedAttributes.length === request.requiredAttributes.length,
      claims,
      verifiedAttributes,
    };
  }

  async proveWithoutRevealing(
    attribute: string,
    condition: (value: unknown) => boolean,
    secret: string
  ): Promise<PrivacyPreservingClaim> {
    const proof = await this.proofService.generateProof(
      secret,
      condition(true) ? '1' : '0',
      'conditional_verification'
    );

    return {
      attribute,
      value: 'hidden',
      proof,
      schema: 'v1',
    };
  }
}
