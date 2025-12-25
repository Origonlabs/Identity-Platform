import { Injectable } from '@nestjs/common';
import {
  EventEnvelope,
  NotificationEnvelope,
  NotificationRequest,
  NotificationStatus,
  notificationEvents,
} from '@opendex/contracts';
import {
  NotificationChannel as PrismaChannel,
  NotificationStatus as PrismaStatus,
} from '../../../node_modules/.prisma/notifications-client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { startSpan } from '@opendex/observability';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService
  ) {}

  async enqueue(request: NotificationRequest, dryRun: boolean): Promise<NotificationEnvelope> {
    return startSpan('notifications.enqueue', async (span) => {
      span.setAttributes({
        'notification.channel': request.channel,
        'notification.project_id': request.projectId,
        'notification.dry_run': dryRun,
      });

      const status: NotificationStatus = dryRun ? 'cancelled' : 'requested';
      const created = await this.prisma.notification.create({
        data: {
          projectId: request.projectId,
          tenantId: request.tenantId,
          channel: request.channel as PrismaChannel,
          status: status as PrismaStatus,
          payload: request as unknown as object,
        },
      });

      const envelope: NotificationEnvelope = {
        id: created.id,
        request,
        status,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };

      if (!dryRun) {
        const event: EventEnvelope<{ notification: NotificationEnvelope }> = {
          id: `evt_${randomUUID()}`,
          type: notificationEvents.requested.type,
          version: notificationEvents.requested.version,
          occurredAt: new Date().toISOString(),
          payload: { notification: envelope },
          meta: { source: 'notifications-service' },
        };
        await this.prisma.outboxEvent.create({
          data: {
            eventType: notificationEvents.requested.type,
            payload: event as unknown as object,
          },
        });

        this.metrics.recordNotificationEnqueued(request.channel);
        span.addEvent('notification.enqueued', {
          'notification.id': created.id,
        });
      }

      return envelope;
    });
  }

  async list(): Promise<NotificationEnvelope[]> {
    const records = await this.prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map((rec) => ({
      id: rec.id,
      request: rec.payload as NotificationRequest,
      status: rec.status as NotificationStatus,
      createdAt: rec.createdAt.toISOString(),
      updatedAt: rec.updatedAt.toISOString(),
      lastError: rec.lastErrorCode
        ? {
            code: rec.lastErrorCode,
            message: rec.lastErrorMessage ?? '',
            retriable: rec.lastErrorRetriable ?? false,
          }
        : undefined,
      providerResponseId: rec.providerMessageId ?? undefined,
    }));
  }
}
