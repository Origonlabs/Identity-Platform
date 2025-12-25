export class NotificationCancelledEvent {
  constructor(
    public readonly notificationId: string,
    public readonly reason?: string,
  ) {}
}
