import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider, EmailPayload, SendResult, ProviderConfig } from '../../../domain/ports/notification-provider.interface';
import { NotificationChannel } from '../../../domain/value-objects';

@Injectable()
export class AwsSesProvider extends NotificationProvider {
  private readonly logger = new Logger(AwsSesProvider.name);
  readonly name = 'aws-ses';
  readonly channel = NotificationChannel.Email;
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

  async send(payload: EmailPayload): Promise<SendResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_DISABLED',
          message: 'AWS SES provider is not configured',
          retriable: false,
        },
      };
    }

    try {
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

      const client = new SESClient({
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });

      const command = new SendEmailCommand({
        Source: payload.from,
        Destination: {
          ToAddresses: payload.to,
          ...(payload.cc && { CcAddresses: payload.cc }),
          ...(payload.bcc && { BccAddresses: payload.bcc }),
        },
        Message: {
          Subject: {
            Data: payload.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: {
              Data: payload.body,
              Charset: 'UTF-8',
            },
            ...(payload.htmlBody && {
              Html: {
                Data: payload.htmlBody,
                Charset: 'UTF-8',
              },
            }),
          },
        },
        ...(payload.replyTo && { ReplyToAddresses: [payload.replyTo] }),
      });

      const response = await client.send(command);
      const messageId = response.MessageId;

      this.logger.log(`Email sent via AWS SES: ${messageId}`);

      return {
        success: true,
        providerMessageId: messageId,
      };
    } catch (error: any) {
      this.logger.error(`AWS SES error: ${error.message}`, error.stack);

      const isRetriable = error.$metadata?.httpStatusCode >= 500 || error.name === 'ThrottlingException';

      return {
        success: false,
        error: {
          code: error.name || 'AWS_SES_ERROR',
          message: error.message || 'Failed to send email via AWS SES',
          retriable: isRetriable,
        },
      };
    }
  }

  validatePayload(payload: any): boolean {
    const emailPayload = payload as EmailPayload;
    return (
      Array.isArray(emailPayload.to) &&
      emailPayload.to.length > 0 &&
      typeof emailPayload.from === 'string' &&
      typeof emailPayload.subject === 'string' &&
      typeof emailPayload.body === 'string'
    );
  }

  async isHealthy(): Promise<boolean> {
    return this.config.enabled;
  }
}
