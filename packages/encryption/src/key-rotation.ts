import type { KeyRotationPolicy, EncryptionKey } from './types';
import { KeyManagementService } from './key-management';

export class KeyRotationService {
  private rotationInterval?: NodeJS.Timeout;

  constructor(
    private readonly keyManager: KeyManagementService,
    private readonly policy: KeyRotationPolicy
  ) {}

  start(): void {
    if (!this.policy.automatic) return;

    this.rotationInterval = setInterval(() => {
      this.rotateIfNeeded().catch((error) => {
        console.error('Key rotation error:', error);
      });
    }, this.policy.rotationInterval);
  }

  stop(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
  }

  async rotateIfNeeded(): Promise<EncryptionKey | null> {
    const currentKey = this.keyManager.getCurrentKey();
    if (!currentKey) {
      return this.keyManager.generateKey();
    }

    const keyAge = Date.now() - currentKey.createdAt.getTime();
    if (keyAge >= this.policy.maxKeyAge) {
      const newKey = this.keyManager.rotateKey();
      
      setTimeout(() => {
        if (currentKey.id) {
          this.keyManager.revokeKey(currentKey.id);
        }
      }, this.policy.overlapPeriod);

      return newKey;
    }

    return null;
  }

  async forceRotation(): Promise<EncryptionKey> {
    return this.keyManager.rotateKey();
  }
}
