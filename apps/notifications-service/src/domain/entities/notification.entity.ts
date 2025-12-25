import { NotificationChannel, NotificationStatus } from '../value-objects';

export interface NotificationError {
  code: string;
  message: string;
  retriable: boolean;
  occurredAt: Date;
}

export interface NotificationMetadata {
  projectId: string;
  tenantId?: string;
  userId?: string;
  source?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
  expiresAt?: Date;
  tags?: Record<string, string>;
}

export class Notification {
  private _id: string;
  private _channel: NotificationChannel;
  private _status: NotificationStatus;
  private _payload: unknown;
  private _metadata: NotificationMetadata;
  private _provider?: string;
  private _providerMessageId?: string;
  private _errors: NotificationError[];
  private _attempts: number;
  private _maxAttempts: number;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _processedAt?: Date;

  constructor(props: {
    id: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    payload: unknown;
    metadata: NotificationMetadata;
    provider?: string;
    providerMessageId?: string;
    errors?: NotificationError[];
    attempts?: number;
    maxAttempts?: number;
    createdAt?: Date;
    updatedAt?: Date;
    processedAt?: Date;
  }) {
    this._id = props.id;
    this._channel = props.channel;
    this._status = props.status;
    this._payload = props.payload;
    this._metadata = props.metadata;
    this._provider = props.provider;
    this._providerMessageId = props.providerMessageId;
    this._errors = props.errors || [];
    this._attempts = props.attempts || 0;
    this._maxAttempts = props.maxAttempts || 3;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._processedAt = props.processedAt;
  }

  get id(): string {
    return this._id;
  }

  get channel(): NotificationChannel {
    return this._channel;
  }

  get status(): NotificationStatus {
    return this._status;
  }

  get payload(): unknown {
    return this._payload;
  }

  get metadata(): NotificationMetadata {
    return this._metadata;
  }

  get provider(): string | undefined {
    return this._provider;
  }

  get providerMessageId(): string | undefined {
    return this._providerMessageId;
  }

  get errors(): NotificationError[] {
    return this._errors;
  }

  get attempts(): number {
    return this._attempts;
  }

  get maxAttempts(): number {
    return this._maxAttempts;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get processedAt(): Date | undefined {
    return this._processedAt;
  }

  markAsScheduled(): void {
    this._status = NotificationStatus.Scheduled;
    this._updatedAt = new Date();
  }

  markAsDispatched(provider: string): void {
    this._status = NotificationStatus.Dispatched;
    this._provider = provider;
    this._attempts += 1;
    this._updatedAt = new Date();
  }

  markAsDelivered(providerMessageId: string): void {
    this._status = NotificationStatus.Delivered;
    this._providerMessageId = providerMessageId;
    this._processedAt = new Date();
    this._updatedAt = new Date();
  }

  markAsFailed(error: Omit<NotificationError, 'occurredAt'>): void {
    const notificationError: NotificationError = {
      ...error,
      occurredAt: new Date(),
    };

    this._errors.push(notificationError);
    this._attempts += 1;

    if (this.canRetry() && error.retriable) {
      this._status = NotificationStatus.Scheduled;
    } else {
      this._status = NotificationStatus.Failed;
      this._processedAt = new Date();
    }

    this._updatedAt = new Date();
  }

  markAsCancelled(): void {
    this._status = NotificationStatus.Cancelled;
    this._processedAt = new Date();
    this._updatedAt = new Date();
  }

  canRetry(): boolean {
    return this._attempts < this._maxAttempts;
  }

  isProcessed(): boolean {
    return (
      this._status === NotificationStatus.Delivered ||
      this._status === NotificationStatus.Failed ||
      this._status === NotificationStatus.Cancelled
    );
  }

  isScheduled(): boolean {
    if (!this._metadata.scheduledFor) {
      return false;
    }
    return this._metadata.scheduledFor > new Date();
  }

  isExpired(): boolean {
    if (!this._metadata.expiresAt) {
      return false;
    }
    return this._metadata.expiresAt < new Date();
  }

  getLastError(): NotificationError | undefined {
    return this._errors[this._errors.length - 1];
  }

  getBackoffDelay(): number {
    const baseDelay = 1000;
    const maxDelay = 300000;
    const delay = Math.min(
      baseDelay * Math.pow(2, this._attempts),
      maxDelay
    );
    return delay;
  }
}