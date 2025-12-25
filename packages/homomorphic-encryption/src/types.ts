export type HomomorphicScheme = 'BFV' | 'BGV' | 'CKKS' | 'TFHE';

export interface HomomorphicKeyPair {
  publicKey: string;
  secretKey: string;
  scheme: HomomorphicScheme;
  parameters: {
    polyModulusDegree: number;
    coeffModulus: number[];
    plainModulus: number;
  };
}

export interface EncryptedValue {
  ciphertext: string;
  scheme: HomomorphicScheme;
  metadata: Record<string, unknown>;
}

export interface ComputationResult {
  result: EncryptedValue;
  operations: string[];
  computationTime: number;
}
