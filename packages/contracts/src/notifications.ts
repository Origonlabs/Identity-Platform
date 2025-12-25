import { EventContract, EventEnvelope } from './events';
import { SemanticVersion } from './versioning';

export type NotificationChannel = 'email' | 'sms' | 'webhook';

export type BaseNotificationRequest = {
  channel: NotificationChannel;
  projectId: string;
  tenantId?: string;
  locale?: string;
  deduplicationKey?: string;
  expiresAt?: string;
  metadata?: Record<string, string>;
};

export type EmailNotificationRequest = BaseNotificationRequest & {
  channel: 'email';
  to: string;
  templateId: string;
  variables?: Record<string, string | number | boolean | null>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
};

export type SmsNotificationRequest = BaseNotificationRequest & {
  channel: 'sms';
  to: string;
  templateId: string;
  variables?: Record<string, string | number | boolean | null>;
};

export type WebhookNotificationRequest = BaseNotificationRequest & {
  channel: 'webhook';
  url: string;
  signatureVersion: SemanticVersion;
  body: unknown;
};

export type NotificationRequest =
  | EmailNotificationRequest
  | SmsNotificationRequest
  | WebhookNotificationRequest;

export type NotificationStatus =
  | 'requested'
  | 'scheduled'
  | 'dispatched'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type NotificationEnvelope = {
  id: string;
  request: NotificationRequest;
  status: NotificationStatus;
  createdAt: string;
  updatedAt: string;
  lastError?: {
    code: string;
    message: string;
    retriable: boolean;
  };
  providerResponseId?: string;
};

type RequestedPayload = {
  notification: NotificationEnvelope;
};

type DispatchedPayload = {
  notificationId: string;
  channel: NotificationChannel;
  provider: string;
  providerMessageId?: string;
};

type DeliveredPayload = {
  notificationId: string;
  deliveredAt: string;
};

type FailedPayload = {
  notificationId: string;
  failedAt: string;
  errorCode: string;
  message: string;
  retriable: boolean;
};

export const notificationEvents: Record<
  'requested' | 'dispatched' | 'delivered' | 'failed',
  EventContract<RequestedPayload | DispatchedPayload | DeliveredPayload | FailedPayload>
> = {
  requested: {
    type: 'notifications.requested',
    version: '1.0.0',
    schema: 'notifications.requested@1.0.0',
    example: {
      id: 'evt_123',
      type: 'notifications.requested',
      version: '1.0.0',
      occurredAt: new Date().toISOString(),
      payload: {
        notification: {
          id: 'ntf_123',
          request: {
            channel: 'email',
            projectId: 'proj_123',
            to: 'user@example.com',
            templateId: 'tmpl_welcome',
          },
          status: 'requested',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      },
      meta: {
        source: 'notifications-service',
      },
    },
  },
  dispatched: {
    type: 'notifications.dispatched',
    version: '1.0.0',
    schema: 'notifications.dispatched@1.0.0',
    example: {
      id: 'evt_124',
      type: 'notifications.dispatched',
      version: '1.0.0',
      occurredAt: new Date().toISOString(),
      payload: {
        notificationId: 'ntf_123',
        channel: 'email',
        provider: 'postmark',
        providerMessageId: 'msg_abc',
      },
      meta: {
        source: 'notifications-service',
      },
    },
  },
  delivered: {
    type: 'notifications.delivered',
    version: '1.0.0',
    schema: 'notifications.delivered@1.0.0',
    example: {
      id: 'evt_125',
      type: 'notifications.delivered',
      version: '1.0.0',
      occurredAt: new Date().toISOString(),
      payload: {
        notificationId: 'ntf_123',
        deliveredAt: new Date().toISOString(),
      },
      meta: {
        source: 'notifications-service',
      },
    },
  },
  failed: {
    type: 'notifications.failed',
    version: '1.0.0',
    schema: 'notifications.failed@1.0.0',
    example: {
      id: 'evt_126',
      type: 'notifications.failed',
      version: '1.0.0',
      occurredAt: new Date().toISOString(),
      payload: {
        notificationId: 'ntf_123',
        failedAt: new Date().toISOString(),
        errorCode: 'bounce',
        message: 'Mailbox unreachable',
        retriable: false,
      },
      meta: {
        source: 'notifications-service',
      },
    },
  },
};

export type NotificationEvent =
  | EventEnvelope<RequestedPayload>
  | EventEnvelope<DispatchedPayload>
  | EventEnvelope<DeliveredPayload>
  | EventEnvelope<FailedPayload>;
