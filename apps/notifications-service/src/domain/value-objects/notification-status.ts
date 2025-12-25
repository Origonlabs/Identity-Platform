export enum NotificationStatus {
  Requested = 'requested',
  Scheduled = 'scheduled',
  Dispatched = 'dispatched',
  Delivered = 'delivered',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export function isValidNotificationStatus(value: string): value is NotificationStatus {
  return Object.values(NotificationStatus).includes(value as NotificationStatus);
}

export function isTerminalStatus(status: NotificationStatus): boolean {
  return [
    NotificationStatus.Delivered,
    NotificationStatus.Failed,
    NotificationStatus.Cancelled,
  ].includes(status);
}
