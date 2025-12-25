export type ComplianceStandard = 'GDPR' | 'SOC2' | 'HIPAA' | 'PCI-DSS' | 'ISO27001';

export interface ComplianceRequirement {
  standard: ComplianceStandard;
  requirement: string;
  description: string;
  status: 'compliant' | 'non-compliant' | 'partial';
  evidence: string[];
  lastChecked: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'denied';
  ip: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  complianceTags: ComplianceStandard[];
}

export interface DataSubjectRequest {
  id: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'objection';
  userId: string;
  requestedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  completedAt?: Date;
  data?: unknown;
}
