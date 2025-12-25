import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Injectable } from '@nestjs/common';
import { SendNotificationCommand } from '../commands/send-notification.command';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { TemplateRepository } from '../../domain/ports/template.repository';
import { NotificationStatus } from '../../domain/value-objects';
import { NotificationCreatedEvent } from '../events/notification-created.event';
import { randomUUID } from 'crypto';

@Injectable()
@CommandHandler(SendNotificationCommand)
export class SendNotificationHandler implements ICommandHandler<SendNotificationCommand> {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly templateRepository: TemplateRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: SendNotificationCommand): Promise<Notification> {
    let finalPayload = command.payload;

    if (command.templateName) {
      const template = await this.templateRepository.findByName(command.templateName);
      if (!template) {
        throw new Error(`Template '${command.templateName}' not found`);
      }

      if (!template.active) {
        throw new Error(`Template '${command.templateName}' is not active`);
      }

      if (template.channel !== command.channel) {
        throw new Error(
          `Template '${command.templateName}' is for ${template.channel}, not ${command.channel}`,
        );
      }

      const renderedContent = template.render(command.templateVariables || {});

      finalPayload = {
        ...finalPayload,
        ...(renderedContent.subject && { subject: renderedContent.subject }),
        body: renderedContent.body,
        ...(renderedContent.htmlBody && { htmlBody: renderedContent.htmlBody }),
      } as any;
    }

    const notification = new Notification({
      id: randomUUID(),
      channel: command.channel,
      status: command.scheduledFor
        ? NotificationStatus.Scheduled
        : NotificationStatus.Requested,
      payload: finalPayload,
      metadata: {
        projectId: command.projectId,
        tenantId: command.tenantId,
        userId: command.userId,
        priority: command.priority || 'normal',
        scheduledFor: command.scheduledFor,
        expiresAt: command.expiresAt,
        tags: command.tags,
      },
    });

    const savedNotification = await this.notificationRepository.create(notification);

    this.eventBus.publish(
      new NotificationCreatedEvent(
        savedNotification.id,
        savedNotification.channel,
        savedNotification.metadata.projectId,
      ),
    );

    return savedNotification;
  }
}
