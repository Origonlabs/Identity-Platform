/**
 * Behavioral Biometrics Analyzer
 *
 * Analyzes user behavioral patterns for continuous authentication
 * Includes keystroke dynamics, mouse movements, and navigation patterns
 */

export type KeystrokeEvent = {
  key: string,
  pressTime: number,
  releaseTime: number,
  timestamp: number,
}

export type MouseEvent = {
  x: number,
  y: number,
  timestamp: number,
  eventType: 'move' | 'click' | 'scroll',
}

export type NavigationEvent = {
  path: string,
  timestamp: number,
  duration: number,
}

export type KeystrokeFeatures = {
  avgDwellTime: number, // Average time key is held down
  avgFlightTime: number, // Average time between key releases
  dwellTimeStdDev: number,
  flightTimeStdDev: number,
  typingSpeed: number, // Characters per second
  errorRate: number,
  commonDigraphs: Map<string, number>, // Timing for common key pairs
}

export type MouseMovementFeatures = {
  avgSpeed: number,
  avgAcceleration: number,
  avgCurvature: number,
  clickAccuracy: number,
  movementJitter: number,
  scrollPattern: number[],
}

export type NavigationFeatures = {
  commonPaths: string[],
  avgSessionDuration: number,
  pagesPerSession: number,
  returnRate: number,
  navigationSpeed: number,
}

export type BehavioralProfile = {
  userId: string,
  keystrokeFeatures?: KeystrokeFeatures,
  mouseFeatures?: MouseMovementFeatures,
  navigationFeatures?: NavigationFeatures,
  lastUpdated: Date,
  sampleCount: number,
}

export type AnomalyDetectionResult = {
  isAnomaly: boolean,
  anomalyScore: number, // 0.0 - 1.0
  confidence: number,
  deviations: {
    feature: string,
    expected: number,
    actual: number,
    deviation: number,
  }[],
}

export class BehavioralBiometricsAnalyzer {
  private readonly anomalyThreshold = 0.7;
  private readonly minSamplesForProfile = 10;

  /**
   * Analyze keystroke dynamics
   */
  analyzeKeystrokeDynamics(events: KeystrokeEvent[]): KeystrokeFeatures {
    if (events.length < 2) {
      return this.getDefaultKeystrokeFeatures();
    }

    const dwellTimes: number[] = [];
    const flightTimes: number[] = [];
    const digraphs = new Map<string, number[]>();

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const dwellTime = event.releaseTime - event.pressTime;
      dwellTimes.push(dwellTime);

      if (i < events.length - 1) {
        const nextEvent = events[i + 1];
        const flightTime = nextEvent.pressTime - event.releaseTime;
        flightTimes.push(flightTime);

        // Track digraph timing
        const digraph = event.key + nextEvent.key;
        if (!digraphs.has(digraph)) {
          digraphs.set(digraph, []);
        }
        digraphs.get(digraph)!.push(flightTime);
      }
    }

    const avgDwellTime = this.average(dwellTimes);
    const avgFlightTime = this.average(flightTimes);
    const dwellTimeStdDev = this.standardDeviation(dwellTimes);
    const flightTimeStdDev = this.standardDeviation(flightTimes);

    const totalTime = events[events.length - 1].timestamp - events[0].timestamp;
    const typingSpeed = (events.length / totalTime) * 1000; // chars per second

    // Calculate error rate (backspace frequency)
    const backspaceCount = events.filter(e => e.key === 'Backspace').length;
    const errorRate = backspaceCount / events.length;

    // Average digraph timings
    const commonDigraphs = new Map<string, number>();
    for (const [digraph, timings] of digraphs) {
      commonDigraphs.set(digraph, this.average(timings));
    }

    return {
      avgDwellTime,
      avgFlightTime,
      dwellTimeStdDev,
      flightTimeStdDev,
      typingSpeed,
      errorRate,
      commonDigraphs,
    };
  }

  /**
   * Analyze mouse movement patterns
   */
  analyzeMouseMovement(events: MouseEvent[]): MouseMovementFeatures {
    if (events.length < 3) {
      return this.getDefaultMouseFeatures();
    }

    const speeds: number[] = [];
    const accelerations: number[] = [];
    const curvatures: number[] = [];
    const scrollPattern: number[] = [];

    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const curr = events[i];

      if (curr.eventType === 'move') {
        const distance = Math.sqrt(
          Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
        );
        const timeDiff = curr.timestamp - prev.timestamp;
        const speed = distance / timeDiff;
        speeds.push(speed);

        if (i > 1) {
          const prevSpeed = speeds[speeds.length - 2];
          const acceleration = (speed - prevSpeed) / timeDiff;
          accelerations.push(acceleration);
        }

        // Calculate curvature
        if (i > 1) {
          const prev2 = events[i - 2];
          const curvature = this.calculateCurvature(
            prev2.x, prev2.y,
            prev.x, prev.y,
            curr.x, curr.y
          );
          curvatures.push(curvature);
        }
      }

      if (curr.eventType === 'scroll') {
        scrollPattern.push(curr.y);
      }
    }

    const clickEvents = events.filter(e => e.eventType === 'click');
    const clickAccuracy = this.calculateClickAccuracy(clickEvents);
    const movementJitter = this.standardDeviation(speeds);

    return {
      avgSpeed: this.average(speeds),
      avgAcceleration: this.average(accelerations),
      avgCurvature: this.average(curvatures),
      clickAccuracy,
      movementJitter,
      scrollPattern,
    };
  }

  /**
   * Analyze navigation patterns
   */
  analyzeNavigationPatterns(events: NavigationEvent[]): NavigationFeatures {
    if (events.length === 0) {
      return this.getDefaultNavigationFeatures();
    }

    const paths = events.map(e => e.path);
    const commonPaths = this.findCommonPaths(paths);

    const durations = events.map(e => e.duration);
    const avgSessionDuration = this.average(durations);

    const pagesPerSession = events.length;

    // Calculate return rate (how often user returns to same page)
    const uniquePaths = new Set(paths).size;
    const returnRate = 1 - (uniquePaths / paths.length);

    // Navigation speed (pages per minute)
    const totalTime = events[events.length - 1].timestamp - events[0].timestamp;
    const navigationSpeed = (events.length / totalTime) * 60000;

    return {
      commonPaths,
      avgSessionDuration,
      pagesPerSession,
      returnRate,
      navigationSpeed,
    };
  }

  /**
   * Create behavioral profile from events
   */
  createProfile(
    userId: string,
    keystrokeEvents?: KeystrokeEvent[],
    mouseEvents?: MouseEvent[],
    navigationEvents?: NavigationEvent[]
  ): BehavioralProfile {
    const profile: BehavioralProfile = {
      userId,
      lastUpdated: new Date(),
      sampleCount: 0,
    };

    if (keystrokeEvents && keystrokeEvents.length >= this.minSamplesForProfile) {
      profile.keystrokeFeatures = this.analyzeKeystrokeDynamics(keystrokeEvents);
      profile.sampleCount += keystrokeEvents.length;
    }

    if (mouseEvents && mouseEvents.length >= this.minSamplesForProfile) {
      profile.mouseFeatures = this.analyzeMouseMovement(mouseEvents);
      profile.sampleCount += mouseEvents.length;
    }

    if (navigationEvents && navigationEvents.length >= this.minSamplesForProfile) {
      profile.navigationFeatures = this.analyzeNavigationPatterns(navigationEvents);
      profile.sampleCount += navigationEvents.length;
    }

    return profile;
  }

  /**
   * Detect anomalies by comparing current behavior to baseline profile
   */
  detectAnomaly(
    baselineProfile: BehavioralProfile,
    currentKeystrokeEvents?: KeystrokeEvent[],
    currentMouseEvents?: MouseEvent[],
    currentNavigationEvents?: NavigationEvent[]
  ): AnomalyDetectionResult {
    const deviations: AnomalyDetectionResult['deviations'] = [];
    let totalDeviation = 0;
    let featureCount = 0;

    // Keystroke anomaly detection
    if (baselineProfile.keystrokeFeatures && currentKeystrokeEvents && currentKeystrokeEvents.length > 0) {
      const currentFeatures = this.analyzeKeystrokeDynamics(currentKeystrokeEvents);
      const keystrokeDeviations = this.compareKeystrokeFeatures(
        baselineProfile.keystrokeFeatures,
        currentFeatures
      );
      deviations.push(...keystrokeDeviations);
      totalDeviation += keystrokeDeviations.reduce((sum, d) => sum + d.deviation, 0);
      featureCount += keystrokeDeviations.length;
    }

    // Mouse movement anomaly detection
    if (baselineProfile.mouseFeatures && currentMouseEvents && currentMouseEvents.length > 0) {
      const currentFeatures = this.analyzeMouseMovement(currentMouseEvents);
      const mouseDeviations = this.compareMouseFeatures(
        baselineProfile.mouseFeatures,
        currentFeatures
      );
      deviations.push(...mouseDeviations);
      totalDeviation += mouseDeviations.reduce((sum, d) => sum + d.deviation, 0);
      featureCount += mouseDeviations.length;
    }

    // Navigation anomaly detection
    if (baselineProfile.navigationFeatures && currentNavigationEvents && currentNavigationEvents.length > 0) {
      const currentFeatures = this.analyzeNavigationPatterns(currentNavigationEvents);
      const navDeviations = this.compareNavigationFeatures(
        baselineProfile.navigationFeatures,
        currentFeatures
      );
      deviations.push(...navDeviations);
      totalDeviation += navDeviations.reduce((sum, d) => sum + d.deviation, 0);
      featureCount += navDeviations.length;
    }

    const anomalyScore = featureCount > 0 ? totalDeviation / featureCount : 0;
    const isAnomaly = anomalyScore > this.anomalyThreshold;

    // Confidence based on number of features analyzed
    const confidence = Math.min(0.5 + (featureCount * 0.05), 0.95);

    return {
      isAnomaly,
      anomalyScore,
      confidence,
      deviations,
    };
  }

  /**
   * Compare keystroke features
   */
  private compareKeystrokeFeatures(
    baseline: KeystrokeFeatures,
    current: KeystrokeFeatures
  ): AnomalyDetectionResult['deviations'] {
    return [
      {
        feature: 'avgDwellTime',
        expected: baseline.avgDwellTime,
        actual: current.avgDwellTime,
        deviation: Math.abs(baseline.avgDwellTime - current.avgDwellTime) / baseline.avgDwellTime,
      },
      {
        feature: 'avgFlightTime',
        expected: baseline.avgFlightTime,
        actual: current.avgFlightTime,
        deviation: Math.abs(baseline.avgFlightTime - current.avgFlightTime) / baseline.avgFlightTime,
      },
      {
        feature: 'typingSpeed',
        expected: baseline.typingSpeed,
        actual: current.typingSpeed,
        deviation: Math.abs(baseline.typingSpeed - current.typingSpeed) / baseline.typingSpeed,
      },
    ];
  }

  /**
   * Compare mouse movement features
   */
  private compareMouseFeatures(
    baseline: MouseMovementFeatures,
    current: MouseMovementFeatures
  ): AnomalyDetectionResult['deviations'] {
    return [
      {
        feature: 'avgSpeed',
        expected: baseline.avgSpeed,
        actual: current.avgSpeed,
        deviation: Math.abs(baseline.avgSpeed - current.avgSpeed) / (baseline.avgSpeed || 1),
      },
      {
        feature: 'avgCurvature',
        expected: baseline.avgCurvature,
        actual: current.avgCurvature,
        deviation: Math.abs(baseline.avgCurvature - current.avgCurvature) / (baseline.avgCurvature || 1),
      },
    ];
  }

  /**
   * Compare navigation features
   */
  private compareNavigationFeatures(
    baseline: NavigationFeatures,
    current: NavigationFeatures
  ): AnomalyDetectionResult['deviations'] {
    return [
      {
        feature: 'navigationSpeed',
        expected: baseline.navigationSpeed,
        actual: current.navigationSpeed,
        deviation: Math.abs(baseline.navigationSpeed - current.navigationSpeed) / baseline.navigationSpeed,
      },
    ];
  }

  // Helper methods
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  private standardDeviation(numbers: number[]): number {
    const avg = this.average(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }

  private calculateCurvature(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
    const area = Math.abs(
      (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2
    );
    const a = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const b = Math.sqrt(Math.pow(x3 - x2, 2) + Math.pow(y3 - y2, 2));
    const c = Math.sqrt(Math.pow(x3 - x1, 2) + Math.pow(y3 - y1, 2));

    const s = (a + b + c) / 2;
    const radius = (a * b * c) / (4 * area);

    return 1 / (radius || 1);
  }

  private calculateClickAccuracy(clickEvents: MouseEvent[]): number {
    // Simplified - in real implementation, would check if clicks hit intended targets
    return 0.9; // Placeholder
  }

  private findCommonPaths(paths: string[]): string[] {
    const pathCounts = new Map<string, number>();
    for (const path of paths) {
      pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
    }

    return Array.from(pathCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([path]) => path);
  }

  private getDefaultKeystrokeFeatures(): KeystrokeFeatures {
    return {
      avgDwellTime: 100,
      avgFlightTime: 150,
      dwellTimeStdDev: 20,
      flightTimeStdDev: 30,
      typingSpeed: 3,
      errorRate: 0.05,
      commonDigraphs: new Map(),
    };
  }

  private getDefaultMouseFeatures(): MouseMovementFeatures {
    return {
      avgSpeed: 100,
      avgAcceleration: 10,
      avgCurvature: 0.5,
      clickAccuracy: 0.9,
      movementJitter: 5,
      scrollPattern: [],
    };
  }

  private getDefaultNavigationFeatures(): NavigationFeatures {
    return {
      commonPaths: [],
      avgSessionDuration: 300000, // 5 minutes
      pagesPerSession: 5,
      returnRate: 0.3,
      navigationSpeed: 1,
    };
  }
}

// Singleton instance
let biometricsAnalyzerInstance: BehavioralBiometricsAnalyzer | null = null;

export function getBehavioralBiometricsAnalyzer(): BehavioralBiometricsAnalyzer {
  if (!biometricsAnalyzerInstance) {
    biometricsAnalyzerInstance = new BehavioralBiometricsAnalyzer();
  }
  return biometricsAnalyzerInstance;
}
