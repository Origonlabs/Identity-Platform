import { randomBytes } from 'crypto';
import type { PrivacyMetrics } from './types';

export class DifferentialPrivacy {
  addNoise(
    values: number[],
    epsilon: number,
    delta: number = 1e-5
  ): number[] {
    const sensitivity = this.calculateSensitivity(values);
    const noiseScale = this.calculateNoiseScale(sensitivity, epsilon, delta);

    return values.map((value) => value + this.generateLaplaceNoise(noiseScale));
  }

  calculatePrivacyBudget(
    epsilon: number,
    queries: number
  ): PrivacyMetrics {
    const composedEpsilon = epsilon * queries;
    const noiseScale = this.calculateNoiseScale(1.0, composedEpsilon, 1e-5);

    return {
      epsilon: composedEpsilon,
      delta: 1e-5,
      noiseScale,
    };
  }

  private calculateSensitivity(values: number[]): number {
    if (values.length === 0) return 1.0;
    
    const max = Math.max(...values);
    const min = Math.min(...values);
    return Math.abs(max - min) || 1.0;
  }

  private calculateNoiseScale(sensitivity: number, epsilon: number, delta: number): number {
    return sensitivity / epsilon;
  }

  private generateLaplaceNoise(scale: number): number {
    const u = (randomBytes(4).readUInt32LE(0) / 0xFFFFFFFF) - 0.5;
    return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  }
}
