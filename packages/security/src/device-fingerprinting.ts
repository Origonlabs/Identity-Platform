import UAParser from 'ua-parser-js';
import type { DeviceFingerprint, AuthenticationContext } from './types';
import { createHash } from 'crypto';

export class DeviceFingerprintingService {
  generateFingerprint(context: AuthenticationContext): DeviceFingerprint {
    const parser = new UAParser(context.userAgent);
    const ua = parser.getResult();

    const components = [
      context.userAgent,
      ua.browser.name || '',
      ua.browser.version || '',
      ua.os.name || '',
      ua.os.version || '',
      ua.device.model || '',
      ua.device.type || '',
    ];

    const fingerprintId = this.hashComponents(components);

    return {
      id: fingerprintId,
      browser: `${ua.browser.name || 'unknown'} ${ua.browser.version || ''}`.trim(),
      os: `${ua.os.name || 'unknown'} ${ua.os.version || ''}`.trim(),
      device: `${ua.device.vendor || ''} ${ua.device.model || ''} ${ua.device.type || ''}`.trim(),
      screen: this.getScreenInfo(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language || 'en',
      plugins: this.getPlugins(),
      canvas: this.getCanvasFingerprint(),
      webgl: this.getWebGLFingerprint(),
      audio: this.getAudioFingerprint(),
      fonts: this.getFonts(),
      ip: context.ip,
      userAgent: context.userAgent,
      createdAt: new Date(),
    };
  }

  async compareFingerprints(
    stored: DeviceFingerprint,
    current: DeviceFingerprint
  ): Promise<number> {
    let similarity = 0;
    let factors = 0;

    if (stored.browser === current.browser) {
      similarity += 0.15;
      factors++;
    }

    if (stored.os === current.os) {
      similarity += 0.15;
      factors++;
    }

    if (stored.device === current.device) {
      similarity += 0.15;
      factors++;
    }

    if (stored.timezone === current.timezone) {
      similarity += 0.10;
      factors++;
    }

    if (stored.language === current.language) {
      similarity += 0.05;
      factors++;
    }

    if (stored.canvas === current.canvas) {
      similarity += 0.20;
      factors++;
    }

    if (stored.webgl === current.webgl) {
      similarity += 0.15;
      factors++;
    }

    const fontSimilarity = this.compareArrays(stored.fonts, current.fonts);
    similarity += fontSimilarity * 0.05;

    return similarity;
  }

  private hashComponents(components: string[]): string {
    const combined = components.join('|');
    return createHash('sha256').update(combined).digest('hex').substring(0, 32);
  }

  private getScreenInfo(): string {
    if (typeof window === 'undefined') return 'unknown';
    return `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  }

  private getPlugins(): string[] {
    if (typeof navigator === 'undefined' || !navigator.plugins) return [];
    return Array.from(navigator.plugins).map((p) => p.name);
  }

  private getCanvasFingerprint(): string {
    if (typeof document === 'undefined') return '';
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
      return canvas.toDataURL();
    } catch {
      return '';
    }
  }

  private getWebGLFingerprint(): string {
    if (typeof document === 'undefined') return '';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return '';
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return '';
      return `${gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)}|${gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)}`;
    } catch {
      return '';
    }
  }

  private getAudioFingerprint(): string {
    return '';
  }

  private getFonts(): string[] {
    const baseFonts = ['Arial', 'Courier New', 'Georgia', 'Times New Roman', 'Verdana'];
    return baseFonts;
  }

  private compareArrays(arr1: string[], arr2: string[]): number {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}
