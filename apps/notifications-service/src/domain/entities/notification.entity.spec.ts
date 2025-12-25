import { Notification, NotificationMetadata } from './notification.entity';
import { NotificationChannel, NotificationStatus } from '../value-objects';

describe('Notification Entity', () => {
  const mockMetadata: NotificationMetadata = {
    projectId: 'proj_123',
    tenantId: 'tenant_123',
    userId: 'user_123',
    priority: 'normal',
  };

  const mockPayload = {
    to: ['user@example.com'],
    from: 'noreply@example.com',
    subject: 'Test',
    body: 'Test message',
  };

  describe('constructor', () => {
    it('should create a notification with required fields', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
      });

      expect(notification.id).toBe('notif_123');
      expect(notification.channel).toBe(NotificationChannel.Email);
      expect(notification.status).toBe(NotificationStatus.Requested);
      expect(notification.payload).toEqual(mockPayload);
      expect(notification.metadata).toEqual(mockMetadata);
      expect(notification.attempts).toBe(0);
      expect(notification.maxAttempts).toBe(3);
    });

    it('should initialize with default values', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
      });

      expect(notification.attempts).toBe(0);
      expect(notification.maxAttempts).toBe(3);
      expect(notification.errors).toEqual([]);
      expect(notification.provider).toBeUndefined();
      expect(notification.providerMessageId).toBeUndefined();
    });
  });

  describe('markAsScheduled', () => {
    it('should update status to scheduled', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
      });

      notification.markAsScheduled();

      expect(notification.status).toBe(NotificationStatus.Scheduled);
    });
  });

  describe('markAsDispatched', () => {
    it('should update status and increment attempts', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
      });

      notification.markAsDispatched('sendgrid');

      expect(notification.status).toBe(NotificationStatus.Dispatched);
      expect(notification.provider).toBe('sendgrid');
      expect(notification.attempts).toBe(1);
    });
  });

  describe('markAsDelivered', () => {
    it('should update status and set provider message ID', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Dispatched,
        payload: mockPayload,
        metadata: mockMetadata,
      });

      notification.markAsDelivered('msg_123');

      expect(notification.status).toBe(NotificationStatus.Delivered);
      expect(notification.providerMessageId).toBe('msg_123');
      expect(notification.processedAt).toBeDefined();
    });
  });

  describe('markAsFailed', () => {
    it('should add error and mark as scheduled if retriable', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
      });

      notification.markAsFailed({
        code: 'NETWORK_ERROR',
        message: 'Connection timeout',
        retriable: true,
      });

      expect(notification.status).toBe(NotificationStatus.Scheduled);
      expect(notification.attempts).toBe(1);
      expect(notification.errors).toHaveLength(1);
      expect(notification.errors[0].code).toBe('NETWORK_ERROR');
      expect(notification.errors[0].retriable).toBe(true);
    });

    it('should mark as failed if not retriable', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
      });

      notification.markAsFailed({
        code: 'INVALID_EMAIL',
        message: 'Invalid recipient',
        retriable: false,
      });

      expect(notification.status).toBe(NotificationStatus.Failed);
      expect(notification.processedAt).toBeDefined();
    });

    it('should mark as failed if max retries exceeded', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
        attempts: 3,
      });

      notification.markAsFailed({
        code: 'NETWORK_ERROR',
        message: 'Connection timeout',
        retriable: true,
      });

      expect(notification.status).toBe(NotificationStatus.Failed);
      expect(notification.canRetry()).toBe(false);
    });
  });

  describe('canRetry', () => {
    it('should return true if attempts < maxAttempts', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
        attempts: 2,
      });

      expect(notification.canRetry()).toBe(true);
    });

    it('should return false if attempts >= maxAttempts', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
        attempts: 3,
      });

      expect(notification.canRetry()).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return true if current time > expiresAt', () => {
      const pastDate = new Date(Date.now() - 1000);
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: {
          ...mockMetadata,
          expiresAt: pastDate,
        },
      });

      expect(notification.isExpired()).toBe(true);
    });

    it('should return false if current time < expiresAt', () => {
      const futureDate = new Date(Date.now() + 1000);
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: {
          ...mockMetadata,
          expiresAt: futureDate,
        },
      });

      expect(notification.isExpired()).toBe(false);
    });
  });

  describe('getBackoffDelay', () => {
    it('should calculate exponential backoff', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
        attempts: 0,
      });

      expect(notification.getBackoffDelay()).toBe(1000);

      notification.markAsDispatched('provider');
      expect(notification.getBackoffDelay()).toBe(2000);

      notification.markAsDispatched('provider');
      expect(notification.getBackoffDelay()).toBe(4000);
    });

    it('should cap at max delay', () => {
      const notification = new Notification({
        id: 'notif_123',
        channel: NotificationChannel.Email,
        status: NotificationStatus.Requested,
        payload: mockPayload,
        metadata: mockMetadata,
        attempts: 20,
      });

      expect(notification.getBackoffDelay()).toBe(300000);
    });
  });
});
