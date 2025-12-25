import type { ZeroTrustContext, VerificationResult } from './types';

export class ContinuousVerificationService {
  private readonly activeVerifications = new Map<string, {
    context: ZeroTrustContext;
    result: VerificationResult;
    lastVerified: Date;
  }>();

  async verify(
    sessionId: string,
    context: ZeroTrustContext,
    policyEngine: (context: ZeroTrustContext) => VerificationResult
  ): Promise<VerificationResult> {
    const stored = this.activeVerifications.get(sessionId);

    if (stored && this.isStillValid(stored.result, stored.context, context)) {
      stored.lastVerified = new Date();
      return stored.result;
    }

    const result = policyEngine(context);
    
    this.activeVerifications.set(sessionId, {
      context,
      result,
      lastVerified: new Date(),
    });

    return result;
  }

  async reverify(
    sessionId: string,
    context: ZeroTrustContext,
    policyEngine: (context: ZeroTrustContext) => VerificationResult
  ): Promise<VerificationResult> {
    const result = policyEngine(context);
    
    this.activeVerifications.set(sessionId, {
      context,
      result,
      lastVerified: new Date(),
    });

    return result;
  }

  invalidate(sessionId: string): void {
    this.activeVerifications.delete(sessionId);
  }

  private isStillValid(
    result: VerificationResult,
    oldContext: ZeroTrustContext,
    newContext: ZeroTrustContext
  ): boolean {
    if (new Date() > result.expiresAt) {
      return false;
    }

    if (oldContext.user.riskScore !== newContext.user.riskScore) {
      return false;
    }

    if (oldContext.device.id !== newContext.device.id) {
      return false;
    }

    if (oldContext.network.ip !== newContext.network.ip) {
      return false;
    }

    return true;
  }

  cleanup(): void {
    const now = new Date();
    for (const [sessionId, verification] of this.activeVerifications.entries()) {
      if (now > verification.result.expiresAt) {
        this.activeVerifications.delete(sessionId);
      }
    }
  }
}
