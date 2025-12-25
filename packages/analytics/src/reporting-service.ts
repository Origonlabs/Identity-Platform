import type { Report, AnalyticsMetric } from './types';
import { AnalyticsEngine } from './analytics-engine';

export class ReportingService {
  constructor(private readonly analytics: AnalyticsEngine) {}

  async generateReport(
    name: string,
    type: Report['type'],
    period: { start: Date; end: Date },
    metrics: string[]
  ): Promise<Report> {
    const reportMetrics: AnalyticsMetric[] = [];

    for (const metricName of metrics) {
      const metricData = await this.analytics.getMetrics(
        metricName,
        period.start,
        period.end
      );
      reportMetrics.push(...metricData);
    }

    return {
      id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      name,
      type,
      metrics: reportMetrics,
      generatedAt: new Date(),
      period,
    };
  }

  async generateDailyReport(date: Date): Promise<Report> {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    return this.generateReport(
      `Daily Report - ${date.toISOString().split('T')[0]}`,
      'daily',
      { start, end },
      ['events.login', 'events.signup', 'events.api_call', 'events.error']
    );
  }

  async generateWeeklyReport(weekStart: Date): Promise<Report> {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return this.generateReport(
      `Weekly Report - Week of ${weekStart.toISOString().split('T')[0]}`,
      'weekly',
      { start, end },
      ['events.login', 'events.signup', 'events.api_call', 'events.error']
    );
  }

  async generateMonthlyReport(month: number, year: number): Promise<Report> {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    return this.generateReport(
      `Monthly Report - ${year}-${month.toString().padStart(2, '0')}`,
      'monthly',
      { start, end },
      [
        'events.login',
        'events.signup',
        'events.api_call',
        'events.error',
        'events.mfa',
        'events.password_reset',
      ]
    );
  }
}
