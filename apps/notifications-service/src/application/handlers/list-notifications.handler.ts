import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { ListNotificationsQuery } from '../queries/list-notifications.query';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationRepository } from '../../domain/ports/notification.repository';

@Injectable()
@QueryHandler(ListNotificationsQuery)
export class ListNotificationsHandler implements IQueryHandler<ListNotificationsQuery> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(query: ListNotificationsQuery): Promise<Notification[]> {
    return this.notificationRepository.findMany({
      projectId: query.projectId,
      tenantId: query.tenantId,
      userId: query.userId,
      status: query.status,
      channel: query.channel,
      createdAfter: query.createdAfter,
      createdBefore: query.createdBefore,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
