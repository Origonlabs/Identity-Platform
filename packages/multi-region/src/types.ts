export interface Region {
  id: string;
  name: string;
  endpoint: string;
  latency?: number;
  healthy: boolean;
  priority: number;
}

export interface ReplicationConfig {
  strategy: 'sync' | 'async' | 'eventual';
  regions: string[];
  conflictResolution: 'last_write_wins' | 'merge' | 'custom';
}

export interface RegionalData {
  region: string;
  data: unknown;
  timestamp: Date;
  version: number;
}
