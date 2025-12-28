export interface DDoSCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface DDoSProtectionConfig {
  maxRequestsPerSecond?: number;
  banDuration?: number;
}

export class DDoSProtector {
  constructor(redisUrl?: string);
  checkRequest(ip: string, path?: string): Promise<DDoSCheckResult>;
  banIp(ip: string, duration?: number): Promise<void>;
  close(): Promise<void>;
}

export function createDDoSProtector(config?: DDoSProtectionConfig): DDoSProtector;
