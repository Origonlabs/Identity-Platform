export interface AnalyticsEvent {
  id: string;
  type: string;
  userId?: string;
  timestamp: Date;
  properties: Record<string, unknown>;
  sessionId?: string;
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  timestamp: Date;
  dimensions: Record<string, string>;
}

export interface Report {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  metrics: AnalyticsMetric[];
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  refreshInterval: number;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'list';
  title: string;
  query: string;
  config: Record<string, unknown>;
}
