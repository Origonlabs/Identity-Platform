import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PKCEService {
  /**
   * Verify PKCE challenge
   */
  verifyChallenge(
    verifier: string,
    challenge: string,
    method: string = 'S256',
  ): boolean {
    if (method === 'plain') {
      return verifier === challenge;
    }

    if (method === 'S256') {
      const hash = crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64url');

      return hash === challenge;
    }

    return false;
  }

  /**
   * Generate PKCE verifier and challenge (utility for testing)
   */
  generateChallenge(method: string = 'S256'): { verifier: string; challenge: string } {
    const verifier = this.generateVerifier();

    if (method === 'plain') {
      return { verifier, challenge: verifier };
    }

    const challenge = crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');

    return { verifier, challenge };
  }

  /**
   * Generate PKCE code verifier
   */
  private generateVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
}
