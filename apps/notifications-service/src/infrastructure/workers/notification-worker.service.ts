import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationRepository } from '../../domain/ports/notification.repository';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service';
import { NotificationStatus } from '../../domain/value-objects';

@Injectable()
export class NotificationWorkerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorkerService.name);
  private isProcessing = false;

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly dispatcherService: NotificationDispatcherService,
  ) {}

  async onModuleInit() {
    this.logger.log('Notification worker service initialized');
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processScheduledNotifications() {
    if (this.isProcessing) {
      this.logger.debug('Worker is already processing, skipping this cycle');
      return;
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      const notifications = await this.notificationRepository.findScheduledNotifications(now);

      this.logger.log(`Found ${notifications.length} scheduled notifications to process`);

      for (const notification of notifications) {
        if (notification.isExpired()) {
          this.logger.warn(`Notification ${notification.id} has expired, cancelling`);
          notification.markAsCancelled();
          await this.notificationRepository.update(notification);
          continue;
        }

        if (notification.isScheduled()) {
          this.logger.log(`Notification ${notification.id} is scheduled for future, skipping`);
          continue;
        }

        try {
          await this.dispatcherService.dispatch(notification);
          await this.notificationRepository.update(notification);
          this.logger.log(`Successfully processed notification ${notification.id}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to dispatch notification ${notification.id}: ${error.message}`,
            error.stack,
          );
          await this.notificationRepository.update(notification);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error processing scheduled notifications: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedNotifications() {
    if (this.isProcessing) {
      return;
    }

    try {
      const notifications = await this.notificationRepository.findFailedRetriableNotifications();

      this.logger.log(`Found ${notifications.length} failed notifications to retry`);

      for (const notification of notifications) {
        if (!notification.canRetry()) {
          this.logger.warn(
            `Notification ${notification.id} exceeded max retry attempts, marking as failed`,
          );
          notification.markAsFailed({
            code: 'MAX_RETRIES_EXCEEDED',
            message: 'Maximum retry attempts exceeded',
            retriable: false,
          });
          await this.notificationRepository.update(notification);
          continue;
        }

        const backoffDelay = notification.getBackoffDelay();
        const lastError = notification.getLastError();
        const timeSinceLastAttempt = lastError
          ? Date.now() - lastError.occurredAt.getTime()
          : Infinity;

        if (timeSinceLastAttempt < backoffDelay) {
          this.logger.debug(
            `Notification ${notification.id} is in backoff period, waiting ${backoffDelay - timeSinceLastAttempt}ms`,
          );
          continue;
        }

        try {
          notification.markAsScheduled();
          await this.notificationRepository.update(notification);

          await this.dispatcherService.dispatch(notification);
          await this.notificationRepository.update(notification);

          this.logger.log(`Successfully retried notification ${notification.id}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to retry notification ${notification.id}: ${error.message}`,
            error.stack,
          );
          await this.notificationRepository.update(notification);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error retrying failed notifications: ${error.message}`, error.stack);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processRequestedNotifications() {
    if (this.isProcessing) {
      return;
    }

    try {
      const notifications = await this.notificationRepository.findMany({
        status: [NotificationStatus.Requested],
        limit: 100,
      });

      this.logger.log(`Found ${notifications.length} requested notifications to process`);

      for (const notification of notifications) {
        try {
          await this.dispatcherService.dispatch(notification);
          await this.notificationRepository.update(notification);
          this.logger.log(`Successfully processed requested notification ${notification.id}`);
        } catch (error: any) {
          this.logger.error(
            `Failed to dispatch requested notification ${notification.id}: ${error.message}`,
            error.stack,
          );
          await this.notificationRepository.update(notification);
        }
      }
    } catch (error: any) {
      this.logger.error(`Error processing requested notifications: ${error.message}`, error.stack);
    }
  }
}
