import type { ModelUpdate, AggregatedModel, FederatedLearningConfig } from './types';
import { DifferentialPrivacy } from './differential-privacy';

export class ModelAggregator {
  private readonly dp: DifferentialPrivacy;

  constructor() {
    this.dp = new DifferentialPrivacy();
  }

  async aggregate(
    updates: ModelUpdate[],
    method: FederatedLearningConfig['aggregationMethod']
  ): Promise<{ weights: number[] }> {
    switch (method) {
      case 'fedavg':
        return this.federatedAverage(updates);
      case 'fedprox':
        return this.federatedProximal(updates);
      case 'scaffold':
        return this.scaffold(updates);
      default:
        return this.federatedAverage(updates);
    }
  }

  private federatedAverage(updates: ModelUpdate[]): { weights: number[] } {
    if (updates.length === 0) {
      return { weights: [] };
    }

    const totalSamples = updates.reduce((sum, u) => sum + u.sampleCount, 0);
    const numWeights = updates[0].weights.length;
    const aggregated = new Array(numWeights).fill(0);

    for (const update of updates) {
      const weight = update.sampleCount / totalSamples;
      for (let i = 0; i < numWeights; i++) {
        aggregated[i] += update.weights[i] * weight;
      }
    }

    return { weights: aggregated };
  }

  private federatedProximal(updates: ModelUpdate[]): { weights: number[] } {
    // FedProx adds a proximal term to prevent divergence
    // Simplified implementation
    return this.federatedAverage(updates);
  }

  private scaffold(updates: ModelUpdate[]): { weights: number[] } {
    // SCAFFOLD uses control variates for better convergence
    // Simplified implementation
    return this.federatedAverage(updates);
  }

  async aggregateWithPrivacy(
    updates: ModelUpdate[],
    method: FederatedLearningConfig['aggregationMethod'],
    epsilon: number = 1.0,
    delta: number = 1e-5
  ): Promise<{ weights: number[] }> {
    const aggregated = await this.aggregate(updates, method);
    
    const noisyWeights = this.dp.addNoise(aggregated.weights, epsilon, delta);

    return { weights: noisyWeights };
  }
}
