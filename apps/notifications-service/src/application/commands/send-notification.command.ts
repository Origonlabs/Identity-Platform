import { NotificationChannel } from '../../domain/value-objects';
import { NotificationPayload } from '../../domain/ports/notification-provider.interface';

export class SendNotificationCommand {
  constructor(
    public readonly projectId: string,
    public readonly channel: NotificationChannel,
    public readonly payload: NotificationPayload,
    public readonly tenantId?: string,
    public readonly userId?: string,
    public readonly templateName?: string,
    public readonly templateVariables?: Record<string, unknown>,
    public readonly priority?: 'low' | 'normal' | 'high' | 'urgent',
    public readonly scheduledFor?: Date,
    public readonly expiresAt?: Date,
    public readonly tags?: Record<string, string>,
  ) {}
}
