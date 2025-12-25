import { NotificationChannel } from '../../domain/value-objects';

export class NotificationCreatedEvent {
  constructor(
    public readonly notificationId: string,
    public readonly channel: NotificationChannel,
    public readonly projectId: string,
  ) {}
}
