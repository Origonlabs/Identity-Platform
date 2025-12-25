export class CancelNotificationCommand {
  constructor(
    public readonly notificationId: string,
    public readonly reason?: string,
  ) {}
}
