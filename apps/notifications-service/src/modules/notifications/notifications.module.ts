import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';
import { NotificationsController } from './notifications.controller';
import { PrismaService } from '../../prisma/prisma.service';

import { SendNotificationHandler } from '../../application/handlers/send-notification.handler';
import { CancelNotificationHandler } from '../../application/handlers/cancel-notification.handler';
import { GetNotificationHandler } from '../../application/handlers/get-notification.handler';
import { ListNotificationsHandler } from '../../application/handlers/list-notifications.handler';

import { NotificationRepository } from '../../domain/ports/notification.repository';
import { TemplateRepository } from '../../domain/ports/template.repository';
import { PrismaNotificationRepository } from '../../infrastructure/repositories/prisma-notification.repository';
import { PrismaTemplateRepository } from '../../infrastructure/repositories/prisma-template.repository';

import { NotificationDispatcherService } from '../../infrastructure/services/notification-dispatcher.service';
import { NotificationWorkerService } from '../../infrastructure/workers/notification-worker.service';

import { SendGridProvider } from '../../infrastructure/providers/email/sendgrid.provider';
import { AwsSesProvider } from '../../infrastructure/providers/email/aws-ses.provider';
import { SmtpProvider } from '../../infrastructure/providers/email/smtp.provider';
import { TwilioProvider } from '../../infrastructure/providers/sms/twilio.provider';
import { AwsSnsProvider } from '../../infrastructure/providers/sms/aws-sns.provider';
import { WebhookProvider } from '../../infrastructure/providers/webhook/webhook.provider';
import { InternalServiceGuard } from '../auth/internal-service.guard';

const CommandHandlers = [
  SendNotificationHandler,
  CancelNotificationHandler,
];

const QueryHandlers = [
  GetNotificationHandler,
  ListNotificationsHandler,
];

const Providers = [
  SendGridProvider,
  AwsSesProvider,
  SmtpProvider,
  TwilioProvider,
  AwsSnsProvider,
  WebhookProvider,
];

@Module({
  imports: [CqrsModule, HttpModule],
  controllers: [NotificationsController],
  providers: [
    PrismaService,
    InternalServiceGuard,
    ...CommandHandlers,
    ...QueryHandlers,
    ...Providers,
    NotificationDispatcherService,
    NotificationWorkerService,
    {
      provide: NotificationRepository,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: TemplateRepository,
      useClass: PrismaTemplateRepository,
    },
  ],
  exports: [NotificationDispatcherService],
})
export class NotificationsModule {
  constructor(
    private readonly dispatcherService: NotificationDispatcherService,
    private readonly sendGridProvider: SendGridProvider,
    private readonly awsSesProvider: AwsSesProvider,
    private readonly smtpProvider: SmtpProvider,
    private readonly twilioProvider: TwilioProvider,
    private readonly awsSnsProvider: AwsSnsProvider,
    private readonly webhookProvider: WebhookProvider,
  ) {
    this.dispatcherService.registerProvider(sendGridProvider);
    this.dispatcherService.registerProvider(awsSesProvider);
    this.dispatcherService.registerProvider(smtpProvider);
    this.dispatcherService.registerProvider(twilioProvider);
    this.dispatcherService.registerProvider(awsSnsProvider);
    this.dispatcherService.registerProvider(webhookProvider);
  }
}
