export interface AuditBlock {
  index: number;
  timestamp: Date;
  previousHash: string;
  hash: string;
  merkleRoot: string;
  transactions: AuditTransaction[];
  nonce: number;
}

export interface AuditTransaction {
  id: string;
  type: 'authentication' | 'authorization' | 'data_access' | 'config_change' | 'security_event';
  userId?: string;
  resource: string;
  action: string;
  result: 'success' | 'failure' | 'denied';
  metadata: Record<string, unknown>;
  signature: string;
}

export interface BlockchainConfig {
  difficulty: number;
  blockSize: number;
  chainId: string;
}
