/**
 * Immutable Audit Log System
 *
 * Blockchain-backed audit trail for compliance and forensic analysis
 * Creates cryptographically verifiable, tamper-proof audit records
 */

import { createHash, createSign, createVerify } from 'crypto';

export type AuditLogEntry = {
  id: string,
  tenancyId: string,

  // Event information
  eventType: string,
  eventData: Record<string, unknown>,

  // Subject (who performed the action)
  actorType: 'user' | 'admin' | 'system' | 'api_key',
  actorId?: string,

  // Object (what was acted upon)
  resourceType: string,
  resourceId?: string,

  // Action details
  action: string,
  result: 'success' | 'failure' | 'denied',

  // Context
  ipAddress?: string,
  userAgent?: string,
  geoLocation?: Record<string, unknown>,

  // Timestamps
  timestamp: Date,

  // Cryptographic proof
  previousHash?: string, // Hash of previous entry (blockchain chain)
  currentHash: string, // Hash of this entry
  signature: string, // Digital signature

  // Blockchain integration (optional)
  blockchainTxHash?: string,
  blockchainNetwork?: string,
  blockchainConfirmedAt?: Date,

  // Merkle tree (for batch verification)
  merkleRoot?: string,
  merkleProof?: string[],

  // Compliance
  complianceTags: string[],
  retentionPeriodDays: number,
}

export type BlockchainConfig = {
  enabled: boolean,
  network: 'ethereum' | 'polygon' | 'avalanche' | 'custom',
  contractAddress?: string,
  privateKey?: string,
  batchSize: number, // Number of logs to batch before writing to blockchain
}

export type VerificationResult = {
  isValid: boolean,
  chainIntegrity: boolean,
  signatureValid: boolean,
  blockchainVerified: boolean,
  errors: string[],
}

export class ImmutableAuditLogSystem {
  private logs: Map<string, AuditLogEntry> = new Map();
  private lastLogHash: string | null = null;
  private blockchainConfig: BlockchainConfig;
  private pendingBatch: AuditLogEntry[] = [];

  constructor(blockchainConfig?: Partial<BlockchainConfig>) {
    this.blockchainConfig = {
      enabled: blockchainConfig?.enabled ?? false,
      network: blockchainConfig?.network ?? 'polygon',
      contractAddress: blockchainConfig?.contractAddress,
      privateKey: blockchainConfig?.privateKey,
      batchSize: blockchainConfig?.batchSize ?? 100,
    };
  }

  /**
   * Create and append a new audit log entry
   */
  async createEntry(
    entry: Omit<AuditLogEntry, 'id' | 'currentHash' | 'signature' | 'previousHash' | 'timestamp'>
  ): Promise<AuditLogEntry> {
    const id = this.generateEntryId();
    const timestamp = new Date();

    // Create the log entry
    const logEntry: AuditLogEntry = {
      ...entry,
      id,
      timestamp,
      previousHash: this.lastLogHash ?? undefined,
      currentHash: '', // Will be calculated
      signature: '', // Will be calculated
    };

    // Calculate hash
    logEntry.currentHash = this.calculateHash(logEntry);

    // Sign the entry
    logEntry.signature = this.signEntry(logEntry);

    // Store the entry
    this.logs.set(id, logEntry);
    this.lastLogHash = logEntry.currentHash;

    // Add to pending batch for blockchain
    if (this.blockchainConfig.enabled) {
      this.pendingBatch.push(logEntry);

      // Write to blockchain if batch is full
      if (this.pendingBatch.length >= this.blockchainConfig.batchSize) {
        await this.writeBatchToBlockchain();
      }
    }

    return logEntry;
  }

  /**
   * Verify the integrity of the audit log chain
   */
  async verifyChain(entries: AuditLogEntry[]): Promise<VerificationResult> {
    const result: VerificationResult = {
      isValid: true,
      chainIntegrity: true,
      signatureValid: true,
      blockchainVerified: true,
      errors: [],
    };

    if (entries.length === 0) {
      return result;
    }

    // Sort entries by timestamp
    const sortedEntries = [...entries].sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Verify chain integrity
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];

      // Verify hash
      const calculatedHash = this.calculateHash(entry);
      if (calculatedHash !== entry.currentHash) {
        result.isValid = false;
        result.chainIntegrity = false;
        result.errors.push(`Entry ${entry.id}: Hash mismatch`);
      }

      // Verify signature
      if (!this.verifySignature(entry)) {
        result.isValid = false;
        result.signatureValid = false;
        result.errors.push(`Entry ${entry.id}: Invalid signature`);
      }

      // Verify chain link
      if (i > 0) {
        const prevEntry = sortedEntries[i - 1];
        if (entry.previousHash !== prevEntry.currentHash) {
          result.isValid = false;
          result.chainIntegrity = false;
          result.errors.push(`Entry ${entry.id}: Broken chain link`);
        }
      }
    }

    // Verify blockchain entries
    const blockchainEntries = sortedEntries.filter(e => e.blockchainTxHash);
    for (const entry of blockchainEntries) {
      const blockchainValid = await this.verifyBlockchainEntry(entry);
      if (!blockchainValid) {
        result.isValid = false;
        result.blockchainVerified = false;
        result.errors.push(`Entry ${entry.id}: Blockchain verification failed`);
      }
    }

    return result;
  }

  /**
   * Create a Merkle tree for a batch of entries
   */
  createMerkleTree(entries: AuditLogEntry[]): {
    root: string,
    proofs: Map<string, string[]>,
  } {
    if (entries.length === 0) {
      return { root: '', proofs: new Map() };
    }

    // Create leaf hashes
    const leaves = entries.map(e => e.currentHash);

    // Build tree
    const tree = this.buildMerkleTree(leaves);
    const root = tree[tree.length - 1][0];

    // Generate proofs for each entry
    const proofs = new Map<string, string[]>();
    for (let i = 0; i < entries.length; i++) {
      const proof = this.generateMerkleProof(tree, i);
      proofs.set(entries[i].id, proof);
    }

    return { root, proofs };
  }

  /**
   * Verify a Merkle proof
   */
  verifyMerkleProof(
    leafHash: string,
    proof: string[],
    root: string
  ): boolean {
    let computedHash = leafHash;

    for (const proofElement of proof) {
      // Determine order (smaller hash goes first for consistency)
      if (computedHash < proofElement) {
        computedHash = this.hashPair(computedHash, proofElement);
      } else {
        computedHash = this.hashPair(proofElement, computedHash);
      }
    }

    return computedHash === root;
  }

  /**
   * Query audit logs with filters
   */
  queryLogs(filters: {
    tenancyId?: string,
    eventType?: string,
    actorId?: string,
    resourceType?: string,
    resourceId?: string,
    startDate?: Date,
    endDate?: Date,
    complianceTags?: string[],
  }): AuditLogEntry[] {
    let results = Array.from(this.logs.values());

    if (filters.tenancyId) {
      results = results.filter(e => e.tenancyId === filters.tenancyId);
    }

    if (filters.eventType) {
      results = results.filter(e => e.eventType === filters.eventType);
    }

    if (filters.actorId) {
      results = results.filter(e => e.actorId === filters.actorId);
    }

    if (filters.resourceType) {
      results = results.filter(e => e.resourceType === filters.resourceType);
    }

    if (filters.resourceId) {
      results = results.filter(e => e.resourceId === filters.resourceId);
    }

    if (filters.startDate) {
      results = results.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      results = results.filter(e => e.timestamp <= filters.endDate!);
    }

    if (filters.complianceTags) {
      results = results.filter(e =>
        filters.complianceTags!.some(tag => e.complianceTags.includes(tag))
      );
    }

    return results.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    tenancyId: string,
    complianceStandard: 'GDPR' | 'HIPAA' | 'SOC2' | 'PCI_DSS',
    startDate: Date,
    endDate: Date
  ): Promise<{
    standard: string,
    period: { start: Date, end: Date },
    totalEvents: number,
    eventsByType: Record<string, number>,
    accessPatterns: {
      userAccess: number,
      adminAccess: number,
      systemAccess: number,
      apiAccess: number,
    },
    securityEvents: {
      successfulActions: number,
      failedActions: number,
      deniedActions: number,
    },
    chainIntegrity: boolean,
    blockchainVerified: boolean,
  }> {
    const logs = this.queryLogs({
      tenancyId,
      startDate,
      endDate,
      complianceTags: [complianceStandard],
    });

    const eventsByType: Record<string, number> = {};
    for (const log of logs) {
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
    }

    const accessPatterns = {
      userAccess: logs.filter(l => l.actorType === 'user').length,
      adminAccess: logs.filter(l => l.actorType === 'admin').length,
      systemAccess: logs.filter(l => l.actorType === 'system').length,
      apiAccess: logs.filter(l => l.actorType === 'api_key').length,
    };

    const securityEvents = {
      successfulActions: logs.filter(l => l.result === 'success').length,
      failedActions: logs.filter(l => l.result === 'failure').length,
      deniedActions: logs.filter(l => l.result === 'denied').length,
    };

    // Verify chain integrity for this period
    const verification = await this.verifyChain(logs);

    return {
      standard: complianceStandard,
      period: { start: startDate, end: endDate },
      totalEvents: logs.length,
      eventsByType,
      accessPatterns,
      securityEvents,
      chainIntegrity: verification.chainIntegrity,
      blockchainVerified: verification.blockchainVerified,
    };
  }

  /**
   * Calculate hash for an entry
   */
  private calculateHash(entry: Omit<AuditLogEntry, 'currentHash' | 'signature'>): string {
    const data = {
      id: entry.id,
      tenancyId: entry.tenancyId,
      eventType: entry.eventType,
      eventData: entry.eventData,
      actorType: entry.actorType,
      actorId: entry.actorId,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      action: entry.action,
      result: entry.result,
      timestamp: entry.timestamp.toISOString(),
      previousHash: entry.previousHash,
    };

    return createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  /**
   * Sign an entry
   */
  private signEntry(entry: AuditLogEntry): string {
    // In production, use proper private key from secure storage
    const privateKey = this.getPrivateKey();

    const sign = createSign('RSA-SHA256');
    sign.update(entry.currentHash);
    return sign.sign(privateKey, 'hex');
  }

  /**
   * Verify signature of an entry
   */
  private verifySignature(entry: AuditLogEntry): boolean {
    // In production, use proper public key
    const publicKey = this.getPublicKey();

    const verify = createVerify('RSA-SHA256');
    verify.update(entry.currentHash);
    return verify.verify(publicKey, entry.signature, 'hex');
  }

  /**
   * Write a batch of entries to blockchain
   */
  private async writeBatchToBlockchain(): Promise<void> {
    if (this.pendingBatch.length === 0) return;

    // Create Merkle tree for the batch
    const { root, proofs } = this.createMerkleTree(this.pendingBatch);

    // Simulate blockchain write (in production, use actual blockchain SDK)
    const txHash = await this.writeToBlockchain(root);

    // Update entries with blockchain info
    for (const entry of this.pendingBatch) {
      entry.blockchainTxHash = txHash;
      entry.blockchainNetwork = this.blockchainConfig.network;
      entry.blockchainConfirmedAt = new Date();
      entry.merkleRoot = root;
      entry.merkleProof = proofs.get(entry.id);
    }

    // Clear pending batch
    this.pendingBatch = [];
  }

  /**
   * Write to blockchain (placeholder - implement with actual blockchain SDK)
   */
  private async writeToBlockchain(merkleRoot: string): Promise<string> {
    // In production, implement actual blockchain interaction
    // For example, using ethers.js for Ethereum:
    /*
    const contract = new ethers.Contract(
      this.blockchainConfig.contractAddress!,
      contractABI,
      wallet
    );
    const tx = await contract.recordAuditBatch(merkleRoot);
    await tx.wait();
    return tx.hash;
    */

    // Placeholder: return simulated transaction hash
    return `0x${createHash('sha256').update(merkleRoot + Date.now()).digest('hex')}`;
  }

  /**
   * Verify blockchain entry (placeholder)
   */
  private async verifyBlockchainEntry(entry: AuditLogEntry): Promise<boolean> {
    if (!entry.blockchainTxHash || !entry.merkleRoot || !entry.merkleProof) {
      return false;
    }

    // In production, verify against actual blockchain
    // For now, verify Merkle proof
    return this.verifyMerkleProof(
      entry.currentHash,
      entry.merkleProof,
      entry.merkleRoot
    );
  }

  /**
   * Build Merkle tree from leaf hashes
   */
  private buildMerkleTree(leaves: string[]): string[][] {
    const tree: string[][] = [leaves];

    while (tree[tree.length - 1].length > 1) {
      const currentLevel = tree[tree.length - 1];
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(this.hashPair(currentLevel[i], currentLevel[i + 1]));
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }

      tree.push(nextLevel);
    }

    return tree;
  }

  /**
   * Generate Merkle proof for a leaf at given index
   */
  private generateMerkleProof(tree: string[][], leafIndex: number): string[] {
    const proof: string[] = [];
    let index = leafIndex;

    for (let level = 0; level < tree.length - 1; level++) {
      const currentLevel = tree[level];
      const isRightNode = index % 2 === 1;
      const siblingIndex = isRightNode ? index - 1 : index + 1;

      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }

      index = Math.floor(index / 2);
    }

    return proof;
  }

  /**
   * Hash a pair of hashes
   */
  private hashPair(hash1: string, hash2: string): string {
    return createHash('sha256')
      .update(hash1 + hash2)
      .digest('hex');
  }

  /**
   * Generate entry ID
   */
  private generateEntryId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get private key (placeholder - use proper key management in production)
   */
  private getPrivateKey(): string {
    // In production, retrieve from secure key storage (KMS, HSM, etc.)
    return `-----BEGIN RSA PRIVATE KEY-----
MIIBogIBAAJBALRiMLAA...
-----END RSA PRIVATE KEY-----`;
  }

  /**
   * Get public key (placeholder)
   */
  private getPublicKey(): string {
    // In production, retrieve from secure storage
    return `-----BEGIN PUBLIC KEY-----
MFwwDQYJKoZIhvcNAQEB...
-----END PUBLIC KEY-----`;
  }

  /**
   * Export audit logs for external storage/archival
   */
  async exportLogs(filters?: Parameters<typeof this.queryLogs>[0]): Promise<{
    logs: AuditLogEntry[],
    exportDate: Date,
    integrity: VerificationResult,
  }> {
    const logs = filters ? this.queryLogs(filters) : Array.from(this.logs.values());
    const integrity = await this.verifyChain(logs);

    return {
      logs,
      exportDate: new Date(),
      integrity,
    };
  }
}

// Singleton instance
let auditLogInstance: ImmutableAuditLogSystem | null = null;

export function getImmutableAuditLogSystem(
  config?: Partial<BlockchainConfig>
): ImmutableAuditLogSystem {
  if (!auditLogInstance) {
    auditLogInstance = new ImmutableAuditLogSystem(config);
  }
  return auditLogInstance;
}
