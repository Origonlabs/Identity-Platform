import type { ZeroTrustContext, VerificationResult, ZeroTrustPolicy } from './types';
import { ZeroTrustPolicyEngine } from './policy-engine';
import { ContinuousVerificationService } from './continuous-verification';

export class ZeroTrustEngine {
  private readonly policyEngine: ZeroTrustPolicyEngine;
  private readonly verificationService: ContinuousVerificationService;

  constructor() {
    this.policyEngine = new ZeroTrustPolicyEngine();
    this.verificationService = new ContinuousVerificationService();
    this.setupDefaultPolicies();
  }

  async authorize(
    sessionId: string,
    context: ZeroTrustContext
  ): Promise<VerificationResult> {
    return this.verificationService.verify(
      sessionId,
      context,
      (ctx) => this.policyEngine.evaluate(ctx)
    );
  }

  async reauthorize(
    sessionId: string,
    context: ZeroTrustContext
  ): Promise<VerificationResult> {
    return this.verificationService.reverify(
      sessionId,
      context,
      (ctx) => this.policyEngine.evaluate(ctx)
    );
  }

  addPolicy(policy: ZeroTrustPolicy): void {
    this.policyEngine.addPolicy(policy);
  }

  private setupDefaultPolicies(): void {
    this.policyEngine.addPolicy({
      id: 'high-risk-block',
      name: 'Block High Risk Users',
      priority: 100,
      rules: [
        {
          condition: (ctx) => ctx.user.riskScore >= 0.9,
          action: 'deny',
          reason: 'User risk score too high',
        },
      ],
    });

    this.policyEngine.addPolicy({
      id: 'tor-block',
      name: 'Block Tor Network',
      priority: 90,
      rules: [
        {
          condition: (ctx) => ctx.network.tor === true,
          action: 'deny',
          reason: 'Tor network not allowed',
        },
      ],
    });

    this.policyEngine.addPolicy({
      id: 'restricted-resource-mfa',
      name: 'MFA for Restricted Resources',
      priority: 80,
      rules: [
        {
          condition: (ctx) =>
            ctx.resource.sensitivity === 'restricted' && !ctx.user.mfaVerified,
          action: 'require_mfa',
          reason: 'MFA required for restricted resources',
        },
      ],
    });

    this.policyEngine.addPolicy({
      id: 'non-compliant-device',
      name: 'Non-Compliant Device Policy',
      priority: 70,
      rules: [
        {
          condition: (ctx) => ctx.device.complianceStatus === 'non-compliant',
          action: 'deny',
          reason: 'Device compliance required',
        },
      ],
    });

    this.policyEngine.addPolicy({
      id: 'untrusted-device-mfa',
      name: 'MFA for Untrusted Devices',
      priority: 60,
      rules: [
        {
          condition: (ctx) => !ctx.device.trusted && ctx.resource.sensitivity !== 'public',
          action: 'require_mfa',
          reason: 'MFA required for untrusted devices',
        },
      ],
    });
  }
}
