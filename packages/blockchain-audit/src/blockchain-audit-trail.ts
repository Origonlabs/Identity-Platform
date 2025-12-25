import { createHash } from 'crypto';
import Redis from 'ioredis';
import type { AuditBlock, AuditTransaction, BlockchainConfig } from './types';
import { MerkleTree } from './merkle-tree';

export class BlockchainAuditTrail {
  private readonly redis: Redis;
  private readonly config: BlockchainConfig;
  private currentBlock: AuditBlock | null = null;
  private pendingTransactions: AuditTransaction[] = [];

  constructor(redisUrl?: string, config?: Partial<BlockchainConfig>) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.config = {
      difficulty: config?.difficulty || 4,
      blockSize: config?.blockSize || 100,
      chainId: config?.chainId || 'audit-chain-1',
    };
  }

  async addTransaction(transaction: AuditTransaction): Promise<void> {
    this.pendingTransactions.push(transaction);

    if (this.pendingTransactions.length >= this.config.blockSize) {
      await this.mineBlock();
    }
  }

  async mineBlock(): Promise<AuditBlock> {
    const previousBlock = await this.getLatestBlock();
    const previousHash = previousBlock ? previousBlock.hash : '0'.repeat(64);

    const merkleTree = new MerkleTree(this.pendingTransactions);
    const merkleRoot = merkleTree.getRoot();

    const block: Omit<AuditBlock, 'hash' | 'nonce'> = {
      index: previousBlock ? previousBlock.index + 1 : 0,
      timestamp: new Date(),
      previousHash,
      merkleRoot,
      transactions: [...this.pendingTransactions],
    };

    const minedBlock = await this.proofOfWork(block);
    this.pendingTransactions = [];

    await this.saveBlock(minedBlock);
    this.currentBlock = minedBlock;

    return minedBlock;
  }

  async getBlock(index: number): Promise<AuditBlock | null> {
    const data = await this.redis.get(`blockchain:${this.config.chainId}:block:${index}`);
    if (!data) return null;
    return JSON.parse(data) as AuditBlock;
  }

  async getLatestBlock(): Promise<AuditBlock | null> {
    const index = await this.getLatestBlockIndex();
    if (index === null) return null;
    return this.getBlock(index);
  }

  async verifyChain(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    let currentIndex = 0;
    let previousBlock: AuditBlock | null = null;

    while (true) {
      const block = await this.getBlock(currentIndex);
      if (!block) break;

      if (previousBlock && block.previousHash !== previousBlock.hash) {
        errors.push(`Block ${currentIndex}: Previous hash mismatch`);
      }

      const merkleTree = new MerkleTree(block.transactions);
      if (merkleTree.getRoot() !== block.merkleRoot) {
        errors.push(`Block ${currentIndex}: Merkle root mismatch`);
      }

      const calculatedHash = this.calculateHash(block);
      if (calculatedHash !== block.hash) {
        errors.push(`Block ${currentIndex}: Hash mismatch`);
      }

      previousBlock = block;
      currentIndex++;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async proofOfWork(block: Omit<AuditBlock, 'hash' | 'nonce'>): Promise<AuditBlock> {
    let nonce = 0;
    const target = '0'.repeat(this.config.difficulty);

    while (true) {
      const hash = this.calculateHash({ ...block, nonce, hash: '' });
      if (hash.startsWith(target)) {
        return {
          ...block,
          hash,
          nonce,
        };
      }
      nonce++;
    }
  }

  private calculateHash(block: Partial<AuditBlock>): string {
    const data = JSON.stringify({
      index: block.index,
      timestamp: block.timestamp,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      transactions: block.transactions,
      nonce: block.nonce,
    });

    return createHash('sha256').update(data).digest('hex');
  }

  private async saveBlock(block: AuditBlock): Promise<void> {
    await this.redis.setex(
      `blockchain:${this.config.chainId}:block:${block.index}`,
      86400 * 365 * 10,
      JSON.stringify(block)
    );
    await this.redis.set(`blockchain:${this.config.chainId}:latest`, block.index.toString());
  }

  private async getLatestBlockIndex(): Promise<number | null> {
    const index = await this.redis.get(`blockchain:${this.config.chainId}:latest`);
    return index ? parseInt(index, 10) : null;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
