import { IsString, IsEnum, IsOptional, IsObject, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationChannel } from '../../../domain/value-objects';

export class SendNotificationDto {
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsObject()
  payload: any;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsObject()
  templateVariables?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  tags?: Record<string, string>;
}
