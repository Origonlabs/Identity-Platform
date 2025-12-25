import { NotificationChannel } from '../value-objects';

export interface EmailPayload {
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  replyTo?: string;
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType: string;
  }[];
}

export interface SMSPayload {
  to: string;
  from: string;
  body: string;
}

export interface WebhookPayload {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export type NotificationPayload = EmailPayload | SMSPayload | WebhookPayload;

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  credentials: Record<string, string>;
  options?: Record<string, unknown>;
}

export abstract class NotificationProvider {
  abstract readonly name: string;
  abstract readonly channel: NotificationChannel;
  abstract readonly config: ProviderConfig;

  abstract send(payload: NotificationPayload): Promise<SendResult>;
  abstract validatePayload(payload: NotificationPayload): boolean;
  abstract isHealthy(): Promise<boolean>;
}
