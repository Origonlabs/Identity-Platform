import type { SessionPolicy, Session } from './types';

export class SessionPolicyEngine {
  evaluatePolicy(session: Session, policy: SessionPolicy): {
    valid: boolean;
    reason?: string;
    action?: 'extend' | 'revoke' | 'require_reauth';
  } {
    if (session.revokedAt) {
      return { valid: false, reason: 'Session has been revoked' };
    }

    if (new Date() > session.expiresAt) {
      return { valid: false, reason: 'Session has expired' };
    }

    const idleTime = Date.now() - session.lastActivityAt.getTime();
    if (idleTime > policy.idleTimeout) {
      return { valid: false, reason: 'Session idle timeout exceeded', action: 'revoke' };
    }

    if (policy.allowedIPs && !policy.allowedIPs.includes(session.ip)) {
      return { valid: false, reason: 'IP address not allowed', action: 'revoke' };
    }

    if (policy.blockedIPs && policy.blockedIPs.includes(session.ip)) {
      return { valid: false, reason: 'IP address blocked', action: 'revoke' };
    }

    if (policy.requireMFA && !session.mfaVerified) {
      return { valid: false, reason: 'MFA verification required', action: 'require_reauth' };
    }

    const sessionAge = Date.now() - session.createdAt.getTime();
    if (sessionAge > policy.maxDuration) {
      if (policy.requireReauth) {
        return { valid: false, reason: 'Session duration exceeded', action: 'require_reauth' };
      }
      return { valid: false, reason: 'Session duration exceeded', action: 'revoke' };
    }

    if (policy.riskBasedTimeout && session.riskLevel === 'high') {
      const riskBasedTimeout = policy.maxDuration * 0.3;
      if (sessionAge > riskBasedTimeout) {
        return { valid: false, reason: 'High-risk session timeout', action: 'require_reauth' };
      }
    }

    return { valid: true };
  }

  shouldExtendSession(session: Session, policy: SessionPolicy): boolean {
    const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
    const extensionThreshold = policy.maxDuration * 0.2;

    return timeUntilExpiry < extensionThreshold && !policy.requireReauth;
  }

  calculateNewExpiry(session: Session, policy: SessionPolicy): Date {
    const now = Date.now();
    const sessionAge = now - session.createdAt.getTime();
    const remainingDuration = policy.maxDuration - sessionAge;

    if (remainingDuration <= 0) {
      return new Date(now);
    }

    return new Date(now + remainingDuration);
  }
}
