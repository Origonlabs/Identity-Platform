import type { ZeroTrustContext, ZeroTrustPolicy, PolicyRule, VerificationResult } from './types';

export class ZeroTrustPolicyEngine {
  private readonly policies: ZeroTrustPolicy[] = [];

  addPolicy(policy: ZeroTrustPolicy): void {
    this.policies.push(policy);
    this.policies.sort((a, b) => b.priority - a.priority);
  }

  evaluate(context: ZeroTrustContext): VerificationResult {
    const requiredActions: string[] = [];
    let denyReason = '';

    for (const policy of this.policies) {
      for (const rule of policy.rules) {
        if (rule.condition(context)) {
          switch (rule.action) {
            case 'deny':
              return {
                allowed: false,
                requiredActions: [],
                confidence: 1.0,
                reason: rule.reason,
                expiresAt: new Date(),
              };

            case 'require_mfa':
              if (!context.user.mfaVerified) {
                requiredActions.push('mfa');
              }
              break;

            case 'require_approval':
              requiredActions.push('approval');
              break;

            case 'audit':
              requiredActions.push('audit');
              break;

            case 'allow':
              break;
          }
        }
      }
    }

    const confidence = this.calculateConfidence(context);
    const allowed = requiredActions.length === 0 || this.canProceedWithActions(context, requiredActions);

    return {
      allowed,
      requiredActions,
      confidence,
      reason: allowed ? 'Access granted' : `Required actions: ${requiredActions.join(', ')}`,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  private calculateConfidence(context: ZeroTrustContext): number {
    let confidence = 1.0;

    if (!context.user.mfaVerified) confidence -= 0.2;
    if (!context.device.trusted) confidence -= 0.3;
    if (context.device.complianceStatus !== 'compliant') confidence -= 0.2;
    if (context.network.vpn || context.network.proxy) confidence -= 0.1;
    if (context.network.tor) confidence -= 0.5;
    if (context.user.riskScore > 0.7) confidence -= 0.3;

    return Math.max(0, confidence);
  }

  private canProceedWithActions(context: ZeroTrustContext, actions: string[]): boolean {
    if (actions.includes('mfa') && !context.user.mfaVerified) {
      return false;
    }

    if (actions.includes('approval')) {
      return false;
    }

    return true;
  }
}
