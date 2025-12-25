export type QuantumResistantAlgorithm = 
  | 'CRYSTALS-Kyber'
  | 'CRYSTALS-Dilithium'
  | 'FALCON'
  | 'SPHINCS+'
  | 'NTRU';

export interface QuantumKeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: QuantumResistantAlgorithm;
  createdAt: Date;
}

export interface QuantumSignature {
  message: string;
  signature: string;
  publicKey: string;
  algorithm: QuantumResistantAlgorithm;
  timestamp: Date;
}

export interface QuantumKeyExchange {
  sharedSecret: string;
  publicKey: string;
  algorithm: QuantumResistantAlgorithm;
  timestamp: Date;
}
