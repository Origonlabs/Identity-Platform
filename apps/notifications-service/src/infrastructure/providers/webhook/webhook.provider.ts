import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { NotificationProvider, WebhookPayload, SendResult, ProviderConfig } from '../../../domain/ports/notification-provider.interface';
import { NotificationChannel } from '../../../domain/value-objects';
import { firstValueFrom, timeout, catchError } from 'rxjs';

@Injectable()
export class WebhookProvider extends NotificationProvider {
  private readonly logger = new Logger(WebhookProvider.name);
  readonly name = 'webhook';
  readonly channel = NotificationChannel.Webhook;
  readonly config: ProviderConfig;

  constructor(private readonly httpService: HttpService) {
    super();
    this.config = {
      name: this.name,
      enabled: true,
      priority: 1,
      credentials: {},
    };
  }

  async send(payload: WebhookPayload): Promise<SendResult> {
    try {
      const timeoutMs = payload.timeout || 30000;

      const request$ = this.httpService.request({
        method: payload.method,
        url: payload.url,
        headers: payload.headers || {},
        data: payload.body,
        timeout: timeoutMs,
      }).pipe(
        timeout(timeoutMs),
        catchError((error) => {
          throw error;
        }),
      );

      const response = await firstValueFrom(request$);

      this.logger.log(`Webhook sent to ${payload.url}: ${response.status}`);

      return {
        success: true,
        providerMessageId: `${payload.method}:${payload.url}:${response.status}`,
      };
    } catch (error: any) {
      this.logger.error(`Webhook error for ${payload.url}: ${error.message}`, error.stack);

      const statusCode = error.response?.status || 0;
      const isRetriable =
        statusCode >= 500 ||
        statusCode === 429 ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ECONNRESET';

      return {
        success: false,
        error: {
          code: error.code || error.response?.status?.toString() || 'WEBHOOK_ERROR',
          message: error.message || 'Failed to send webhook',
          retriable: isRetriable,
        },
      };
    }
  }

  validatePayload(payload: any): boolean {
    const webhookPayload = payload as WebhookPayload;
    return (
      typeof webhookPayload.url === 'string' &&
      webhookPayload.url.startsWith('http') &&
      ['GET', 'POST', 'PUT', 'PATCH'].includes(webhookPayload.method)
    );
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
