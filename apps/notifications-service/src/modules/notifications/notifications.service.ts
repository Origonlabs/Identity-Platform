import { Injectable } from '@nestjs/common';
import {
  NotificationEnvelope,
  NotificationRequest,
  NotificationStatus,
  notificationEvents,
} from '@opendex/contracts';
import { randomUUID } from 'crypto';

@Injectable()
export class NotificationsService {
  // In-memory store for scaffolding; replace with repository/event outbox later.
  private readonly notifications = new Map<string, NotificationEnvelope>();

  async enqueue(request: NotificationRequest, dryRun: boolean): Promise<NotificationEnvelope> {
    const now = new Date().toISOString();
    const id = `ntf_${randomUUID()}`;
    const envelope: NotificationEnvelope = {
      id,
      request,
      status: dryRun ? 'cancelled' satisfies NotificationStatus : 'requested',
      createdAt: now,
      updatedAt: now,
    };
    this.notifications.set(id, envelope);

    // TODO: publish to bus using notificationEvents.requested contract
    void notificationEvents;
    return envelope;
  }

  async list(): Promise<NotificationEnvelope[]> {
    return [...this.notifications.values()];
  }
}
