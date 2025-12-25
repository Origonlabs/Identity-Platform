import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider, EmailPayload, SendResult, ProviderConfig } from '../../../domain/ports/notification-provider.interface';
import { NotificationChannel } from '../../../domain/value-objects';

@Injectable()
export class SendGridProvider extends NotificationProvider {
  private readonly logger = new Logger(SendGridProvider.name);
  readonly name = 'sendgrid';
  readonly channel = NotificationChannel.Email;
  readonly config: ProviderConfig;
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('SENDGRID_API_KEY') || '';
    this.config = {
      name: this.name,
      enabled: Boolean(this.apiKey),
      priority: 1,
      credentials: {
        apiKey: this.apiKey ? '***' : '',
      },
    };
  }

  async send(payload: EmailPayload): Promise<SendResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_DISABLED',
          message: 'SendGrid provider is not configured',
          retriable: false,
        },
      };
    }

    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(this.apiKey);

      const message = {
        to: payload.to,
        from: payload.from,
        ...(payload.cc && { cc: payload.cc }),
        ...(payload.bcc && { bcc: payload.bcc }),
        ...(payload.replyTo && { replyTo: payload.replyTo }),
        subject: payload.subject,
        text: payload.body,
        ...(payload.htmlBody && { html: payload.htmlBody }),
        ...(payload.attachments && {
          attachments: payload.attachments.map((att) => ({
            filename: att.filename,
            content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
            type: att.contentType,
          })),
        }),
      };

      const response = await sgMail.default.send(message);
      const messageId = response[0]?.headers?.['x-message-id'];

      this.logger.log(`Email sent via SendGrid: ${messageId}`);

      return {
        success: true,
        providerMessageId: messageId,
      };
    } catch (error: any) {
      this.logger.error(`SendGrid error: ${error.message}`, error.stack);

      const isRetriable = error.code >= 500 || error.code === 429;

      return {
        success: false,
        error: {
          code: error.code?.toString() || 'SENDGRID_ERROR',
          message: error.message || 'Failed to send email via SendGrid',
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
