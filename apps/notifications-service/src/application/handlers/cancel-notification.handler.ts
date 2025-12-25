import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable, NotFoundException } from '@nestjs/common';
import { CancelNotificationCommand } from '../commands/cancel-notification.command';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { NotificationCancelledEvent } from '../events/notification-cancelled.event';

@Injectable()
@CommandHandler(CancelNotificationCommand)
export class CancelNotificationHandler implements ICommandHandler<CancelNotificationCommand> {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CancelNotificationCommand): Promise<void> {
    const notification = await this.notificationRepository.findById(command.notificationId);

    if (!notification) {
      throw new NotFoundException(`Notification ${command.notificationId} not found`);
    }

    if (notification.isProcessed()) {
      throw new Error(`Cannot cancel notification ${command.notificationId} - already processed`);
    }

    notification.markAsCancelled();
    await this.notificationRepository.update(notification);

    this.eventBus.publish(
      new NotificationCancelledEvent(notification.id, command.reason),
    );
  }
}
