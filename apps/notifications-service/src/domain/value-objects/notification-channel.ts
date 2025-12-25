export enum NotificationChannel {
  Email = 'email',
  SMS = 'sms',
  Webhook = 'webhook',
}

export function isValidNotificationChannel(value: string): value is NotificationChannel {
  return Object.values(NotificationChannel).includes(value as NotificationChannel);
}
