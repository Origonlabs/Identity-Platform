import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider, SMSPayload, SendResult, ProviderConfig } from '../../../domain/ports/notification-provider.interface';
import { NotificationChannel } from '../../../domain/value-objects';

@Injectable()
export class TwilioProvider extends NotificationProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  readonly name = 'twilio';
  readonly channel = NotificationChannel.SMS;
  readonly config: ProviderConfig;
  private accountSid: string;
  private authToken: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID') || '';
    this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN') || '';

    this.config = {
      name: this.name,
      enabled: Boolean(this.accountSid && this.authToken),
      priority: 1,
      credentials: {
        accountSid: this.accountSid ? '***' : '',
        authToken: this.authToken ? '***' : '',
      },
    };
  }

  async send(payload: SMSPayload): Promise<SendResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_DISABLED',
          message: 'Twilio provider is not configured',
          retriable: false,
        },
      };
    }

    try {
      const twilio = await import('twilio');
      const client = twilio.default(this.accountSid, this.authToken);

      const message = await client.messages.create({
        body: payload.body,
        from: payload.from,
        to: payload.to,
      });

      this.logger.log(`SMS sent via Twilio: ${message.sid}`);

      return {
        success: true,
        providerMessageId: message.sid,
      };
    } catch (error: any) {
      this.logger.error(`Twilio error: ${error.message}`, error.stack);

      const isRetriable = error.status >= 500 || error.code === 20429;

      return {
        success: false,
        error: {
          code: error.code?.toString() || 'TWILIO_ERROR',
          message: error.message || 'Failed to send SMS via Twilio',
          retriable: isRetriable,
        },
      };
    }
  }

  validatePayload(payload: any): boolean {
    const smsPayload = payload as SMSPayload;
    return (
      typeof smsPayload.to === 'string' &&
      typeof smsPayload.from === 'string' &&
      typeof smsPayload.body === 'string' &&
      smsPayload.body.length > 0
    );
  }

  async isHealthy(): Promise<boolean> {
    return this.config.enabled;
  }
}
