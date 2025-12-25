import { Notification } from '../../../domain/entities/notification.entity';
import { NotificationChannel, NotificationStatus } from '../../../domain/value-objects';

export class NotificationResponseDto {
  id: string;
  projectId: string;
  tenantId?: string;
  userId?: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload: unknown;
  provider?: string;
  providerMessageId?: string;
  attempts: number;
  maxAttempts: number;
  lastError?: {
    code: string;
    message: string;
    retriable: boolean;
    occurredAt: string;
  };
  priority?: string;
  scheduledFor?: string;
  expiresAt?: string;
  tags?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;

  static fromDomain(notification: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = notification.id;
    dto.projectId = notification.metadata.projectId;
    dto.tenantId = notification.metadata.tenantId;
    dto.userId = notification.metadata.userId;
    dto.channel = notification.channel;
    dto.status = notification.status;
    dto.payload = notification.payload;
    dto.provider = notification.provider;
    dto.providerMessageId = notification.providerMessageId;
    dto.attempts = notification.attempts;
    dto.maxAttempts = notification.maxAttempts;
    dto.priority = notification.metadata.priority;
    dto.scheduledFor = notification.metadata.scheduledFor?.toISOString();
    dto.expiresAt = notification.metadata.expiresAt?.toISOString();
    dto.tags = notification.metadata.tags;
    dto.createdAt = notification.createdAt.toISOString();
    dto.updatedAt = notification.updatedAt.toISOString();
    dto.processedAt = notification.processedAt?.toISOString();

    const lastError = notification.getLastError();
    if (lastError) {
      dto.lastError = {
        code: lastError.code,
        message: lastError.message,
        retriable: lastError.retriable,
        occurredAt: lastError.occurredAt.toISOString(),
      };
    }

    return dto;
  }
}
