import type { AnalyticsEvent, Dashboard, DashboardWidget } from './types';
import { AnalyticsEngine } from './analytics-engine';

export class RealTimeAnalyticsService {
  private readonly subscribers = new Map<string, Set<(data: unknown) => void>>();

  constructor(private readonly analytics: AnalyticsEngine) {}

  subscribe(dashboardId: string, callback: (data: unknown) => void): () => void {
    if (!this.subscribers.has(dashboardId)) {
      this.subscribers.set(dashboardId, new Set());
    }

    this.subscribers.get(dashboardId)!.add(callback);

    return () => {
      this.subscribers.get(dashboardId)?.delete(callback);
    };
  }

  async updateDashboard(dashboard: Dashboard): Promise<void> {
    const data: Record<string, unknown> = {};

    for (const widget of dashboard.widgets) {
      data[widget.id] = await this.getWidgetData(widget);
    }

    const subscribers = this.subscribers.get(dashboard.id);
    if (subscribers) {
      for (const callback of subscribers) {
        callback(data);
      }
    }
  }

  private async getWidgetData(widget: DashboardWidget): Promise<unknown> {
    switch (widget.type) {
      case 'metric':
        return this.getMetricValue(widget.query);
      case 'chart':
        return this.getChartData(widget.query, widget.config);
      case 'table':
        return this.getTableData(widget.query);
      case 'list':
        return this.getListData(widget.query);
      default:
        return null;
    }
  }

  private async getMetricValue(query: string): Promise<number> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    return this.analytics.aggregate(query, 'sum', oneHourAgo, now);
  }

  private async getChartData(query: string, config: Record<string, unknown>): Promise<unknown> {
    const now = new Date();
    const period = (config.period as number) || 3600000;
    const start = new Date(now.getTime() - period);

    return this.analytics.getMetrics(query, start, now);
  }

  private async getTableData(query: string): Promise<unknown> {
    return [];
  }

  private async getListData(query: string): Promise<unknown> {
    return [];
  }
}
