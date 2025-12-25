import { createHash, createSign } from 'crypto';
import type { VerifiableCredential, CredentialRequest, DID } from './types';

export class VerifiableCredentialsService {
  async issueCredential(
    request: CredentialRequest,
    issuerDID: DID
  ): Promise<VerifiableCredential> {
    const credentialId = `vc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const issuanceDate = new Date().toISOString();
    const expirationDate = request.expirationDays
      ? new Date(Date.now() + request.expirationDays * 86400000).toISOString()
      : undefined;

    const credential: Omit<VerifiableCredential, 'proof'> = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
      ],
      id: credentialId,
      type: ['VerifiableCredential', request.credentialType],
      issuer: {
        id: issuerDID.did,
        name: 'Atlas Identity Platform',
      },
      issuanceDate,
      expirationDate,
      credentialSubject: {
        id: request.subjectId,
        ...request.claims,
      },
    };

    const proof = await this.createProof(credential, issuerDID);

    return {
      ...credential,
      proof,
    };
  }

  async createPresentation(
    credentials: VerifiableCredential[],
    holderDID: DID
  ): Promise<{ '@context': string[]; type: string[]; verifiableCredential: VerifiableCredential[]; proof: { type: string; created: string; proofPurpose: string; verificationMethod: string; jws: string } }> {
    const presentation = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      verifiableCredential: credentials,
    };

    const proof = await this.createProof(presentation, holderDID);

    return {
      ...presentation,
      proof,
    };
  }

  private async createProof(
    document: unknown,
    did: DID
  ): Promise<VerifiableCredential['proof']> {
    const documentHash = createHash('sha256')
      .update(JSON.stringify(document))
      .digest('hex');

    const sign = createSign('RSA-SHA256');
    sign.update(documentHash);
    const signature = sign.sign(did.publicKey, 'base64');

    return {
      type: 'JsonWebSignature2020',
      created: new Date().toISOString(),
      proofPurpose: 'assertionMethod',
      verificationMethod: `${did.did}#keys-1`,
      jws: signature,
    };
  }
}
