import Redis from 'ioredis';
import type { AuditLog, ComplianceStandard } from './types';

export class AuditLogger {
  private readonly redis: Redis;

  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  async log(event: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      timestamp: new Date(),
      ...event,
    };

    const key = `audit:${auditLog.timestamp.toISOString().split('T')[0]}`;
    await this.redis.lpush(key, JSON.stringify(auditLog));
    await this.redis.expire(key, 86400 * 365);

    for (const standard of auditLog.complianceTags) {
      await this.redis.sadd(`audit:compliance:${standard}`, auditLog.id);
    }
  }

  async query(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    complianceStandard?: ComplianceStandard;
  }): Promise<AuditLog[]> {
    const results: AuditLog[] = [];
    const start = filters.startDate || new Date(Date.now() - 86400000 * 30);
    const end = filters.endDate || new Date();

    const dates = this.getDateRange(start, end);
    
    for (const date of dates) {
      const key = `audit:${date}`;
      const logs = await this.redis.lrange(key, 0, -1);
      
      for (const logStr of logs) {
        const log = JSON.parse(logStr) as AuditLog;
        
        if (this.matchesFilters(log, filters)) {
          results.push(log);
        }
      }
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getComplianceReport(standard: ComplianceStandard): Promise<AuditLog[]> {
    const logIds = await this.redis.smembers(`audit:compliance:${standard}`);
    const logs: AuditLog[] = [];

    for (const logId of logIds) {
      const date = logId.split('_')[1];
      const dateKey = new Date(parseInt(date)).toISOString().split('T')[0];
      const key = `audit:${dateKey}`;
      const logStrs = await this.redis.lrange(key, 0, -1);
      
      for (const logStr of logStrs) {
        const log = JSON.parse(logStr) as AuditLog;
        if (log.id === logId) {
          logs.push(log);
        }
      }
    }

    return logs;
  }

  private matchesFilters(log: AuditLog, filters: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
  }): boolean {
    if (filters.userId && log.userId !== filters.userId) return false;
    if (filters.action && log.action !== filters.action) return false;
    if (filters.resource && log.resource !== filters.resource) return false;
    if (filters.startDate && log.timestamp < filters.startDate) return false;
    if (filters.endDate && log.timestamp > filters.endDate) return false;
    return true;
  }

  private getDateRange(start: Date, end: Date): string[] {
    const dates: string[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
