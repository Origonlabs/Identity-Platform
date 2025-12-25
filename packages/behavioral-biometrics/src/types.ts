export interface KeystrokePattern {
  userId: string;
  keyPressDuration: number[];
  keyInterval: number[];
  digraphLatency: Map<string, number>;
  flightTime: number[];
  holdTime: number[];
}

export interface MousePattern {
  userId: string;
  movementSpeed: number[];
  clickDuration: number[];
  movementAcceleration: number[];
  scrollPattern: number[];
  clickPattern: number[];
}

export interface TypingPattern {
  userId: string;
  wordsPerMinute: number;
  averageWordLength: number;
  commonErrors: string[];
  correctionPattern: number[];
  rhythm: number[];
}

export interface BiometricSignature {
  userId: string;
  keystroke: KeystrokePattern;
  mouse: MousePattern;
  typing: TypingPattern;
  confidence: number;
  timestamp: Date;
}

export interface BiometricVerification {
  match: boolean;
  confidence: number;
  factors: string[];
  riskScore: number;
}
