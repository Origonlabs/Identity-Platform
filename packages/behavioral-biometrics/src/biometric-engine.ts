import type { BiometricSignature, BiometricVerification } from './types';
import { KeystrokeDynamicsAnalyzer } from './keystroke-dynamics';
import { MouseDynamicsAnalyzer } from './mouse-dynamics';
import { TypingPatternAnalyzer } from './typing-pattern';

export class BehavioralBiometricEngine {
  private readonly keystroke: KeystrokeDynamicsAnalyzer;
  private readonly mouse: MouseDynamicsAnalyzer;
  private readonly typing: TypingPatternAnalyzer;

  constructor(redisUrl?: string) {
    this.keystroke = new KeystrokeDynamicsAnalyzer(redisUrl);
    this.mouse = new MouseDynamicsAnalyzer(redisUrl);
    this.typing = new TypingPatternAnalyzer(redisUrl);
  }

  async buildSignature(userId: string): Promise<BiometricSignature> {
    const [keystroke, mouse, typing] = await Promise.all([
      this.keystroke.buildPattern(userId),
      this.mouse.buildPattern(userId),
      this.typing.buildPattern(userId),
    ]);

    const confidence = this.calculateOverallConfidence(keystroke, mouse, typing);

    return {
      userId,
      keystroke,
      mouse,
      typing,
      confidence,
      timestamp: new Date(),
    };
  }

  async verify(
    userId: string,
    currentSignature: Partial<BiometricSignature>
  ): Promise<BiometricVerification> {
    const [keystrokeResult, mouseResult, typingResult] = await Promise.all([
      currentSignature.keystroke
        ? this.keystroke.verify(userId, currentSignature.keystroke)
        : { match: false, confidence: 0 },
      currentSignature.mouse
        ? this.mouse.verify(userId, currentSignature.mouse)
        : { match: false, confidence: 0 },
      currentSignature.typing
        ? this.typing.verify(userId, currentSignature.typing)
        : { match: false, confidence: 0 },
    ]);

    const confidences = [
      keystrokeResult.confidence,
      mouseResult.confidence,
      typingResult.confidence,
    ].filter((c) => c > 0);

    const overallConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    const factors: string[] = [];
    if (keystrokeResult.match) factors.push('keystroke');
    if (mouseResult.match) factors.push('mouse');
    if (typingResult.match) factors.push('typing');

    const riskScore = 1 - overallConfidence;

    return {
      match: overallConfidence >= 0.7 && factors.length >= 2,
      confidence: overallConfidence,
      factors,
      riskScore,
    };
  }

  private calculateOverallConfidence(
    keystroke: any,
    mouse: any,
    typing: any
  ): number {
    let total = 0;
    let count = 0;

    if (keystroke.keyPressDuration.length > 0) {
      total += 0.4;
      count++;
    }
    if (mouse.movementSpeed.length > 0) {
      total += 0.3;
      count++;
    }
    if (typing.wordsPerMinute > 0) {
      total += 0.3;
      count++;
    }

    return count > 0 ? total / count : 0;
  }

  async close(): Promise<void> {
    await Promise.all([
      this.keystroke.close(),
      this.mouse.close(),
      this.typing.close(),
    ]);
  }
}
