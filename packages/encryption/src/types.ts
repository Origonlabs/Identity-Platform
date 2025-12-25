export interface EncryptionKey {
  id: string;
  algorithm: 'AES-256-GCM' | 'AES-128-GCM' | 'ChaCha20-Poly1305';
  material: Uint8Array;
  createdAt: Date;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

export interface KeyRotationPolicy {
  rotationInterval: number;
  maxKeyAge: number;
  overlapPeriod: number;
  automatic: boolean;
}

export interface EncryptionResult {
  ciphertext: string;
  keyId: string;
  algorithm: string;
  iv: string;
  tag: string;
}
