import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationProvider, EmailPayload, SendResult, ProviderConfig } from '../../../domain/ports/notification-provider.interface';
import { NotificationChannel } from '../../../domain/value-objects';

@Injectable()
export class SmtpProvider extends NotificationProvider {
  private readonly logger = new Logger(SmtpProvider.name);
  readonly name = 'smtp';
  readonly channel = NotificationChannel.Email;
  readonly config: ProviderConfig;
  private host: string;
  private port: number;
  private secure: boolean;
  private username: string;
  private password: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.host = this.configService.get<string>('SMTP_HOST') || '';
    this.port = this.configService.get<number>('SMTP_PORT') || 587;
    this.secure = this.configService.get<boolean>('SMTP_SECURE') || false;
    this.username = this.configService.get<string>('SMTP_USERNAME') || '';
    this.password = this.configService.get<string>('SMTP_PASSWORD') || '';

    this.config = {
      name: this.name,
      enabled: Boolean(this.host && this.username && this.password),
      priority: 3,
      credentials: {
        host: this.host,
        port: this.port.toString(),
        username: this.username ? '***' : '',
        password: this.password ? '***' : '',
      },
    };
  }

  async send(payload: EmailPayload): Promise<SendResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        error: {
          code: 'PROVIDER_DISABLED',
          message: 'SMTP provider is not configured',
          retriable: false,
        },
      };
    }

    try {
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransporter({
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: {
          user: this.username,
          pass: this.password,
        },
      });

      const info = await transporter.sendMail({
        from: payload.from,
        to: payload.to.join(', '),
        ...(payload.cc && { cc: payload.cc.join(', ') }),
        ...(payload.bcc && { bcc: payload.bcc.join(', ') }),
        ...(payload.replyTo && { replyTo: payload.replyTo }),
        subject: payload.subject,
        text: payload.body,
        ...(payload.htmlBody && { html: payload.htmlBody }),
        ...(payload.attachments && {
          attachments: payload.attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          })),
        }),
      });

      this.logger.log(`Email sent via SMTP: ${info.messageId}`);

      return {
        success: true,
        providerMessageId: info.messageId,
      };
    } catch (error: any) {
      this.logger.error(`SMTP error: ${error.message}`, error.stack);

      const isRetriable = error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT';

      return {
        success: false,
        error: {
          code: error.code || 'SMTP_ERROR',
          message: error.message || 'Failed to send email via SMTP',
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
    if (!this.config.enabled) {
      return false;
    }

    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransporter({
        host: this.host,
        port: this.port,
        secure: this.secure,
        auth: {
          user: this.username,
          pass: this.password,
        },
      });

      await transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
}
