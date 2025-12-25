import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import type { EncryptionKey, EncryptionResult } from './types';

export class KeyManagementService {
  private readonly keys = new Map<string, EncryptionKey>();
  private currentKeyId: string | null = null;

  generateKey(algorithm: EncryptionKey['algorithm'] = 'AES-256-GCM'): EncryptionKey {
    const keySize = algorithm.includes('256') ? 32 : algorithm.includes('128') ? 16 : 32;
    const keyMaterial = randomBytes(keySize);
    const keyId = `key_${Date.now()}_${randomBytes(8).toString('hex')}`;

    const key: EncryptionKey = {
      id: keyId,
      algorithm,
      material: keyMaterial,
      createdAt: new Date(),
      metadata: {},
    };

    this.keys.set(keyId, key);
    if (!this.currentKeyId) {
      this.currentKeyId = keyId;
    }

    return key;
  }

  getKey(keyId: string): EncryptionKey | undefined {
    return this.keys.get(keyId);
  }

  getCurrentKey(): EncryptionKey | null {
    if (!this.currentKeyId) return null;
    return this.keys.get(this.currentKeyId) || null;
  }

  setCurrentKey(keyId: string): void {
    if (this.keys.has(keyId)) {
      this.currentKeyId = keyId;
    }
  }

  rotateKey(): EncryptionKey {
    const newKey = this.generateKey();
    this.currentKeyId = newKey.id;
    return newKey;
  }

  revokeKey(keyId: string): void {
    this.keys.delete(keyId);
    if (this.currentKeyId === keyId) {
      const keys = Array.from(this.keys.values());
      this.currentKeyId = keys.length > 0 ? keys[keys.length - 1].id : null;
    }
  }

  listKeys(): EncryptionKey[] {
    return Array.from(this.keys.values());
  }
}
