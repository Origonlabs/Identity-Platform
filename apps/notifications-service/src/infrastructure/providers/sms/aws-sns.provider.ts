import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider, SMSPayload, SendResult, ProviderConfig } from '../../../domain/ports/notification-provider.interface';
import { NotificationChannel } from '../../../domain/value-objects';

@Injectable()
export class AwsSnsProvider extends NotificationProvider {
  private readonly logger = new Logger(AwsSnsProvider.name);
  readonly name = 'aws-sns';
  readonly channel = NotificationChannel.SMS;
  readonly config: ProviderConfig;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID') || '';
    this.secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '';

    this.config = {
      name: this.name,
      enabled: Boolean(this.accessKeyId && this.secretAccessKey),
      priority: 2,
      credentials: {
        region: this.region,
        accessKeyId: this.accessKeyId ? '***' : '',
        secretAccessKey: this.secretAccessKey ? '***' : '',
      },
    };
  }

  async send(payload: SMSPayload): Promise<SendResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_DISABLED',
          message: 'AWS SNS provider is not configured',
          retriable: false,
        },
      };
    }

    try {
      const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');

      const client = new SNSClient({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });

      const command = new PublishCommand({
        PhoneNumber: payload.to,
        Message: payload.body,
      });

      const response = await client.send(command);
      const messageId = response.MessageId;

      this.logger.log(`SMS sent via AWS SNS: ${messageId}`);

      return {
        success: true,
        providerMessageId: messageId,
      };
    } catch (error: any) {
      this.logger.error(`AWS SNS error: ${error.message}`, error.stack);

      const isRetriable = error.$metadata?.httpStatusCode >= 500 || error.name === 'ThrottlingException';

      return {
        success: false,
        error: {
          code: error.name || 'AWS_SNS_ERROR',
          message: error.message || 'Failed to send SMS via AWS SNS',
          retriable: isRetriable,
        },
      };
    }
  }

  validatePayload(payload: any): boolean {
    const smsPayload = payload as SMSPayload;
    return (
      typeof smsPayload.to === 'string' &&
      typeof smsPayload.body === 'string' &&
      smsPayload.body.length > 0
    );
  }

  async isHealthy(): Promise<boolean> {
    return this.config.enabled;
  }
}
