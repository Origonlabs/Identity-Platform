import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import type { EncryptionKey, EncryptionResult } from './types';
import { KeyManagementService } from './key-management';

export class EncryptionService {
  constructor(private readonly keyManager: KeyManagementService) {}

  async encrypt(plaintext: string, keyId?: string): Promise<EncryptionResult> {
    const key = keyId
      ? this.keyManager.getKey(keyId)
      : this.keyManager.getCurrentKey();

    if (!key) {
      throw new Error('No encryption key available');
    }

    const algorithm = this.getCipherAlgorithm(key.algorithm);
    const iv = randomBytes(12);
    const cipher = createCipheriv(algorithm, key.material, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    const tag = (cipher as any).getAuthTag?.() || Buffer.alloc(0);

    return {
      ciphertext,
      keyId: key.id,
      algorithm: key.algorithm,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  async decrypt(encrypted: EncryptionResult): Promise<string> {
    const key = this.keyManager.getKey(encrypted.keyId);
    if (!key) {
      throw new Error(`Key ${encrypted.keyId} not found`);
    }

    const algorithm = this.getCipherAlgorithm(key.algorithm);
    const iv = Buffer.from(encrypted.iv, 'base64');
    const tag = Buffer.from(encrypted.tag, 'base64');

    const decipher = createDecipheriv(algorithm, key.material, iv);
    if (tag.length > 0) {
      (decipher as any).setAuthTag(tag);
    }

    let plaintext = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  }

  private getCipherAlgorithm(algorithm: EncryptionKey['algorithm']): string {
    switch (algorithm) {
      case 'AES-256-GCM':
        return 'aes-256-gcm';
      case 'AES-128-GCM':
        return 'aes-128-gcm';
      case 'ChaCha20-Poly1305':
        return 'chacha20-poly1305';
      default:
        return 'aes-256-gcm';
    }
  }
}
