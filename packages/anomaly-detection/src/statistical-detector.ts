import type { AnomalyEvent, DetectionResult } from './types';

export class StatisticalAnomalyDetector {
  async detectAnomaly(
    event: AnomalyEvent,
    historicalData: AnomalyEvent[]
  ): Promise<DetectionResult> {
    const reasons: string[] = [];
    let score = 0;

    const timeBasedAnomaly = this.detectTimeBasedAnomaly(event, historicalData);
    if (timeBasedAnomaly.isAnomaly) {
      score += 0.3;
      reasons.push(timeBasedAnomaly.reason);
    }

    const frequencyAnomaly = this.detectFrequencyAnomaly(event, historicalData);
    if (frequencyAnomaly.isAnomaly) {
      score += 0.4;
      reasons.push(frequencyAnomaly.reason);
    }

    const patternAnomaly = this.detectPatternAnomaly(event, historicalData);
    if (patternAnomaly.isAnomaly) {
      score += 0.3;
      reasons.push(patternAnomaly.reason);
    }

    const isAnomaly = score >= 0.5;
    const confidence = Math.min(score, 1.0);
    const recommendedAction = this.getRecommendedAction(score);

    return {
      isAnomaly,
      confidence,
      score,
      reasons,
      recommendedAction,
    };
  }

  private detectTimeBasedAnomaly(
    event: AnomalyEvent,
    historical: AnomalyEvent[]
  ): { isAnomaly: boolean; reason: string } {
    if (historical.length === 0) {
      return { isAnomaly: false, reason: '' };
    }

    const hour = event.timestamp.getHours();
    const historicalHours = historical.map((e) => e.timestamp.getHours());
    const avgHour = historicalHours.reduce((a, b) => a + b, 0) / historicalHours.length;
    const stdDev = this.calculateStdDev(historicalHours, avgHour);

    if (Math.abs(hour - avgHour) > 2 * stdDev) {
      return {
        isAnomaly: true,
        reason: `Unusual time: ${hour}h (avg: ${avgHour.toFixed(1)}h)`,
      };
    }

    return { isAnomaly: false, reason: '' };
  }

  private detectFrequencyAnomaly(
    event: AnomalyEvent,
    historical: AnomalyEvent[]
  ): { isAnomaly: boolean; reason: string } {
    const last24h = historical.filter(
      (e) => event.timestamp.getTime() - e.timestamp.getTime() < 86400000
    );

    if (last24h.length > 100) {
      return {
        isAnomaly: true,
        reason: `High frequency: ${last24h.length} events in 24h`,
      };
    }

    const lastHour = last24h.filter(
      (e) => event.timestamp.getTime() - e.timestamp.getTime() < 3600000
    );

    if (lastHour.length > 20) {
      return {
        isAnomaly: true,
        reason: `Very high frequency: ${lastHour.length} events in last hour`,
      };
    }

    return { isAnomaly: false, reason: '' };
  }

  private detectPatternAnomaly(
    event: AnomalyEvent,
    historical: AnomalyEvent[]
  ): { isAnomaly: boolean; reason: string } {
    if (event.userId && historical.length > 0) {
      const userHistory = historical.filter((e) => e.userId === event.userId);
      if (userHistory.length > 0) {
        const uniqueIPs = new Set(userHistory.map((e) => e.ip));
        if (!uniqueIPs.has(event.ip) && uniqueIPs.size > 0) {
          return {
            isAnomaly: true,
            reason: `New IP address for user: ${event.ip}`,
          };
        }
      }
    }

    return { isAnomaly: false, reason: '' };
  }

  private calculateStdDev(values: number[], mean: number): number {
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private getRecommendedAction(score: number): DetectionResult['recommendedAction'] {
    if (score >= 0.8) return 'block';
    if (score >= 0.6) return 'alert';
    if (score >= 0.4) return 'investigate';
    return 'monitor';
  }
}
