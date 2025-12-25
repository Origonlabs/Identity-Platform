import type { VerifiableCredential, VerifiablePresentation } from './types';

export class VCVerifier {
  async verifyCredential(credential: VerifiableCredential): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!credential['@context'] || credential['@context'].length === 0) {
      errors.push('Missing @context');
    }

    if (!credential.type || credential.type.length === 0) {
      errors.push('Missing type');
    }

    if (!credential.issuer || !credential.issuer.id) {
      errors.push('Missing issuer');
    }

    if (!credential.credentialSubject || !credential.credentialSubject.id) {
      errors.push('Missing credentialSubject');
    }

    if (credential.expirationDate) {
      const expiration = new Date(credential.expirationDate);
      if (expiration < new Date()) {
        errors.push('Credential expired');
      }
    }

    if (!credential.proof || !credential.proof.jws) {
      errors.push('Missing or invalid proof');
    }

    const proofValid = await this.verifyProof(credential);
    if (!proofValid) {
      errors.push('Invalid proof signature');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async verifyPresentation(
    presentation: VerifiablePresentation
  ): Promise<{
    valid: boolean;
    errors: string[];
    credentialErrors: Record<number, string[]>;
  }> {
    const errors: string[] = [];
    const credentialErrors: Record<number, string[]> = {};

    if (!presentation.verifiableCredential || presentation.verifiableCredential.length === 0) {
      errors.push('No credentials in presentation');
    }

    for (let i = 0; i < presentation.verifiableCredential.length; i++) {
      const credential = presentation.verifiableCredential[i];
      const result = await this.verifyCredential(credential);
      if (!result.valid) {
        credentialErrors[i] = result.errors;
      }
    }

    const proofValid = await this.verifyProof(presentation);
    if (!proofValid) {
      errors.push('Invalid presentation proof');
    }

    return {
      valid: errors.length === 0 && Object.keys(credentialErrors).length === 0,
      errors,
      credentialErrors,
    };
  }

  private async verifyProof(document: any): Promise<boolean> {
    if (!document.proof || !document.proof.jws) {
      return false;
    }

    // Placeholder for actual proof verification
    // In production, verify JWS signature against issuer's public key
    return document.proof.jws.length > 0;
  }
}
