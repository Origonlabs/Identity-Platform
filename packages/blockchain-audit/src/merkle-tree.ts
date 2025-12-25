import { createHash } from 'crypto';
import type { AuditTransaction } from './types';

export class MerkleTree {
  private readonly leaves: string[];
  private readonly root: string;

  constructor(transactions: AuditTransaction[]) {
    this.leaves = transactions.map((tx) => this.hashTransaction(tx));
    this.root = this.buildTree(this.leaves);
  }

  getRoot(): string {
    return this.root;
  }

  getProof(transaction: AuditTransaction): string[] {
    const leafHash = this.hashTransaction(transaction);
    const leafIndex = this.leaves.indexOf(leafHash);
    
    if (leafIndex === -1) {
      return [];
    }

    return this.generateProof(leafIndex, this.leaves);
  }

  verifyProof(transaction: AuditTransaction, proof: string[], root: string): boolean {
    const leafHash = this.hashTransaction(transaction);
    let currentHash = leafHash;

    for (const proofHash of proof) {
      currentHash = this.combineHashes(currentHash, proofHash);
    }

    return currentHash === root;
  }

  private hashTransaction(transaction: AuditTransaction): string {
    const data = JSON.stringify({
      id: transaction.id,
      type: transaction.type,
      resource: transaction.resource,
      action: transaction.action,
      result: transaction.result,
    });

    return createHash('sha256').update(data).digest('hex');
  }

  private buildTree(leaves: string[]): string {
    if (leaves.length === 0) {
      return '';
    }

    if (leaves.length === 1) {
      return leaves[0];
    }

    const level: string[] = [];
    for (let i = 0; i < leaves.length; i += 2) {
      if (i + 1 < leaves.length) {
        level.push(this.combineHashes(leaves[i], leaves[i + 1]));
      } else {
        level.push(leaves[i]);
      }
    }

    return this.buildTree(level);
  }

  private generateProof(index: number, leaves: string[]): string[] {
    const proof: string[] = [];
    let currentIndex = index;
    let currentLevel = [...leaves];

    while (currentLevel.length > 1) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      
      if (siblingIndex < currentLevel.length) {
        proof.push(currentLevel[siblingIndex]);
      }

      currentIndex = Math.floor(currentIndex / 2);
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(this.combineHashes(currentLevel[i], currentLevel[i + 1]));
        } else {
          nextLevel.push(currentLevel[i]);
        }
      }
      currentLevel = nextLevel;
    }

    return proof;
  }

  private combineHashes(left: string, right: string): string {
    return createHash('sha256')
      .update(left + right)
      .digest('hex');
  }
}
