import { Notification } from '../entities/notification.entity';
import { NotificationStatus } from '../value-objects';

export interface NotificationFilters {
  projectId?: string;
  tenantId?: string;
  userId?: string;
  status?: NotificationStatus[];
  channel?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export abstract class NotificationRepository {
  abstract create(notification: Notification): Promise<Notification>;
  abstract findById(id: string): Promise<Notification | null>;
  abstract findMany(filters: NotificationFilters): Promise<Notification[]>;
  abstract update(notification: Notification): Promise<Notification>;
  abstract delete(id: string): Promise<void>;
  abstract findScheduledNotifications(beforeDate: Date): Promise<Notification[]>;
  abstract findFailedRetriableNotifications(): Promise<Notification[]>;
  abstract count(filters: NotificationFilters): Promise<number>;
}
