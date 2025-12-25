import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GetNotificationQuery } from '../queries/get-notification.query';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationRepository } from '../../domain/ports/notification.repository';

@Injectable()
@QueryHandler(GetNotificationQuery)
export class GetNotificationHandler implements IQueryHandler<GetNotificationQuery> {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(query: GetNotificationQuery): Promise<Notification> {
    const notification = await this.notificationRepository.findById(query.notificationId);

    if (!notification) {
      throw new NotFoundException(`Notification ${query.notificationId} not found`);
    }

    return notification;
  }
}
