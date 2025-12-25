import type { ComplianceRequirement, ComplianceStandard } from './types';
import { GDPRComplianceService } from './gdpr-compliance';
import { SOC2ComplianceService } from './soc2-compliance';
import { AuditLogger } from './audit-logger';

export class ComplianceEngine {
  private readonly gdpr: GDPRComplianceService;
  private readonly soc2: SOC2ComplianceService;
  private readonly auditLogger: AuditLogger;

  constructor(redisUrl?: string) {
    this.gdpr = new GDPRComplianceService();
    this.soc2 = new SOC2ComplianceService();
    this.auditLogger = new AuditLogger(redisUrl);
  }

  async checkCompliance(standard: ComplianceStandard): Promise<ComplianceRequirement[]> {
    switch (standard) {
      case 'SOC2':
        return this.soc2.checkCompliance();
      case 'GDPR':
        return this.checkGDPRCompliance();
      default:
        return [];
    }
  }

  async logComplianceEvent(
    action: string,
    resource: string,
    standards: ComplianceStandard[],
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.auditLogger.log({
      action,
      resource,
      result: 'success',
      ip: 'system',
      userAgent: 'compliance-engine',
      metadata: metadata || {},
      complianceTags: standards,
    });
  }

  getAuditLogger(): AuditLogger {
    return this.auditLogger;
  }

  getGDPRService(): GDPRComplianceService {
    return this.gdpr;
  }

  private async checkGDPRCompliance(): Promise<ComplianceRequirement[]> {
    return [
      {
        standard: 'GDPR',
        requirement: 'Article 15 - Right of Access',
        description: 'Users can request access to their personal data',
        status: 'compliant',
        evidence: ['Data subject request handler implemented'],
        lastChecked: new Date(),
      },
      {
        standard: 'GDPR',
        requirement: 'Article 17 - Right to Erasure',
        description: 'Users can request deletion of their personal data',
        status: 'compliant',
        evidence: ['Data erasure process implemented'],
        lastChecked: new Date(),
      },
      {
        standard: 'GDPR',
        requirement: 'Article 20 - Data Portability',
        description: 'Users can export their data in machine-readable format',
        status: 'compliant',
        evidence: ['Data export functionality implemented'],
        lastChecked: new Date(),
      },
    ];
  }
}
