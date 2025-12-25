import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import {
  BaseNotificationRequest,
  EmailNotificationRequest,
  NotificationChannel,
  NotificationRequest,
  SmsNotificationRequest,
  WebhookNotificationRequest,
} from '@opendex/contracts';

class BaseDto implements Omit<BaseNotificationRequest, 'channel'> {
  @IsString()
  projectId!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  deduplicationKey?: string;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

class EmailDto extends BaseDto implements Omit<EmailNotificationRequest, keyof BaseNotificationRequest> {
  @IsIn(['email'])
  channel!: NotificationChannel;

  @IsString()
  to!: string;

  @IsString()
  templateId!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean | null>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bcc?: string[];

  @IsOptional()
  @IsString()
  replyTo?: string;
}

class SmsDto extends BaseDto implements Omit<SmsNotificationRequest, keyof BaseNotificationRequest> {
  @IsIn(['sms'])
  channel!: NotificationChannel;

  @IsString()
  to!: string;

  @IsString()
  templateId!: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string | number | boolean | null>;
}

class WebhookDto extends BaseDto implements Omit<WebhookNotificationRequest, keyof BaseNotificationRequest> {
  @IsIn(['webhook'])
  channel!: NotificationChannel;

  @IsString()
  url!: string;

  @IsString()
  signatureVersion!: `${number}.${number}.${number}`;

  @IsObject()
  body!: unknown;
}

export class CreateNotificationDto {
  @ValidateNested()
  @Type((opts) => {
    switch ((opts?.newObject as CreateNotificationDto)?.request?.channel) {
      case 'email':
        return EmailDto;
      case 'sms':
        return SmsDto;
      case 'webhook':
      default:
        return WebhookDto;
    }
  })
  request!: NotificationRequest;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
