import { createHmac } from 'crypto';
import type { WebhookSignature } from './types';

export class WebhookSigningService {
  sign(payload: string, secret: string, timestamp?: string): WebhookSignature {
    const ts = timestamp || Date.now().toString();
    const signedPayload = `${ts}.${payload}`;
    const signature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return {
      timestamp: ts,
      signature,
      version: 'v1',
    };
  }

  verify(
    payload: string,
    signature: string,
    secret: string,
    timestamp: string,
    tolerance: number = 300000
  ): boolean {
    const now = Date.now();
    const ts = parseInt(timestamp, 10);

    if (Math.abs(now - ts) > tolerance) {
      return false;
    }

    const expected = this.sign(payload, secret, timestamp);
    return expected.signature === signature;
  }

  generateHeaders(payload: string, secret: string): Record<string, string> {
    const signature = this.sign(payload, secret);

    return {
      'X-Webhook-Timestamp': signature.timestamp,
      'X-Webhook-Signature': signature.signature,
      'X-Webhook-Version': signature.version,
    };
  }
}
