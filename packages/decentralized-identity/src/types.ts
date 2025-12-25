export interface DID {
  did: string;
  method: 'key' | 'web' | 'ethr' | 'polygon';
  controller: string;
  publicKey: string;
  createdAt: Date;
}

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: {
    id: string;
    name?: string;
  };
  issuanceDate: string;
  expirationDate?: string;
  credentialSubject: {
    id: string;
    [key: string]: unknown;
  };
  proof: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    jws: string;
  };
}

export interface VerifiablePresentation {
  '@context': string[];
  type: string[];
  verifiableCredential: VerifiableCredential[];
  proof: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    jws: string;
  };
}

export interface CredentialRequest {
  subjectId: string;
  credentialType: string;
  claims: Record<string, unknown>;
  expirationDays?: number;
}
