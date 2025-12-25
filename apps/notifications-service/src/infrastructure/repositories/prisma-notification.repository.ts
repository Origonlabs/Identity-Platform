import { Injectable } from '@nestjs/common';
import { NotificationRepository, NotificationFilters } from '../../domain/ports/notification.repository';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationStatus } from '../../domain/value-objects';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationChannel as PrismaChannel,
  NotificationStatus as PrismaStatus,
} from '../../../node_modules/.prisma/notifications-client';

@Injectable()
export class PrismaNotificationRepository extends NotificationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(notification: Notification): Promise<Notification> {
    const created = await this.prisma.notification.create({
      data: {
        id: notification.id,
        projectId: notification.metadata.projectId,
        tenantId: notification.metadata.tenantId,
        channel: notification.channel as unknown as PrismaChannel,
        status: notification.status as unknown as PrismaStatus,
        payload: notification.payload as any,
        provider: notification.provider,
        providerMessageId: notification.providerMessageId,
      },
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<Notification | null> {
    const record = await this.prisma.notification.findUnique({
      where: { id },
    });

    return record ? this.toDomain(record) : null;
  }

  async findMany(filters: NotificationFilters): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: {
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.tenantId && { tenantId: filters.tenantId }),
        ...(filters.status && {
          status: { in: filters.status as unknown as PrismaStatus[] },
        }),
        ...(filters.channel && {
          channel: { in: filters.channel as unknown as PrismaChannel[] },
        }),
        ...(filters.createdAfter && { createdAt: { gte: filters.createdAfter } }),
        ...(filters.createdBefore && { createdAt: { lte: filters.createdBefore } }),
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    });

    return records.map((record) => this.toDomain(record));
  }

  async update(notification: Notification): Promise<Notification> {
    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: notification.status as unknown as PrismaStatus,
        payload: notification.payload as any,
        provider: notification.provider,
        providerMessageId: notification.providerMessageId,
        lastErrorCode: notification.getLastError()?.code,
        lastErrorMessage: notification.getLastError()?.message,
        lastErrorRetriable: notification.getLastError()?.retriable,
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.notification.delete({
      where: { id },
    });
  }

  async findScheduledNotifications(beforeDate: Date): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: {
        status: 'scheduled',
        createdAt: { lte: beforeDate },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return records.map((record) => this.toDomain(record));
  }

  async findFailedRetriableNotifications(): Promise<Notification[]> {
    const records = await this.prisma.notification.findMany({
      where: {
        status: 'failed',
        lastErrorRetriable: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });

    return records.map((record) => this.toDomain(record));
  }

  async count(filters: NotificationFilters): Promise<number> {
    return this.prisma.notification.count({
      where: {
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.tenantId && { tenantId: filters.tenantId }),
        ...(filters.status && {
          status: { in: filters.status as unknown as PrismaStatus[] },
        }),
        ...(filters.channel && {
          channel: { in: filters.channel as unknown as PrismaChannel[] },
        }),
        ...(filters.createdAfter && { createdAt: { gte: filters.createdAfter } }),
        ...(filters.createdBefore && { createdAt: { lte: filters.createdBefore } }),
      },
    });
  }

  private toDomain(record: any): Notification {
    const payload = record.payload as any;

    return new Notification({
      id: record.id,
      channel: record.channel,
      status: record.status,
      payload,
      metadata: {
        projectId: record.projectId,
        tenantId: record.tenantId,
        userId: payload.metadata?.userId,
        source: payload.metadata?.source,
        priority: payload.metadata?.priority,
        scheduledFor: payload.metadata?.scheduledFor
          ? new Date(payload.metadata.scheduledFor)
          : undefined,
        expiresAt: payload.metadata?.expiresAt
          ? new Date(payload.metadata.expiresAt)
          : undefined,
        tags: payload.metadata?.tags,
      },
      provider: record.provider,
      providerMessageId: record.providerMessageId,
      errors: record.lastErrorCode
        ? [
            {
              code: record.lastErrorCode,
              message: record.lastErrorMessage || '',
              retriable: record.lastErrorRetriable || false,
              occurredAt: record.updatedAt,
            },
          ]
        : [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
