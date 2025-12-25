import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '../../domain/entities/notification.entity';
import { NotificationProvider } from '../../domain/ports/notification-provider.interface';
import { NotificationChannel } from '../../domain/value-objects';

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);
  private readonly providersByChannel: Map<NotificationChannel, NotificationProvider[]> = new Map();

  registerProvider(provider: NotificationProvider): void {
    const providers = this.providersByChannel.get(provider.channel) || [];
    providers.push(provider);
    providers.sort((a, b) => a.config.priority - b.config.priority);
    this.providersByChannel.set(provider.channel, providers);

    this.logger.log(
      `Registered provider '${provider.name}' for channel '${provider.channel}' with priority ${provider.config.priority}`,
    );
  }

  async dispatch(notification: Notification): Promise<void> {
    const providers = this.providersByChannel.get(notification.channel) || [];
    const enabledProviders = providers.filter((p) => p.config.enabled);

    if (enabledProviders.length === 0) {
      throw new Error(`No enabled providers found for channel '${notification.channel}'`);
    }

    for (const provider of enabledProviders) {
      if (!provider.validatePayload(notification.payload)) {
        this.logger.warn(
          `Provider '${provider.name}' rejected invalid payload for notification ${notification.id}`,
        );
        continue;
      }

      this.logger.log(
        `Attempting to send notification ${notification.id} via provider '${provider.name}'`,
      );

      notification.markAsDispatched(provider.name);

      const result = await provider.send(notification.payload as any);

      if (result.success) {
        notification.markAsDelivered(result.providerMessageId || 'unknown');
        this.logger.log(
          `Notification ${notification.id} delivered successfully via '${provider.name}': ${result.providerMessageId}`,
        );
        return;
      }

      notification.markAsFailed({
        code: result.error?.code || 'UNKNOWN_ERROR',
        message: result.error?.message || 'Unknown error',
        retriable: result.error?.retriable || false,
      });

      this.logger.warn(
        `Provider '${provider.name}' failed for notification ${notification.id}: ${result.error?.message}`,
      );

      if (!result.error?.retriable) {
        this.logger.error(
          `Non-retriable error for notification ${notification.id}, stopping dispatch attempts`,
        );
        throw new Error(result.error?.message || 'Failed to dispatch notification');
      }
    }

    throw new Error(
      `All providers failed for notification ${notification.id} on channel '${notification.channel}'`,
    );
  }

  getProviders(channel: NotificationChannel): NotificationProvider[] {
    return this.providersByChannel.get(channel) || [];
  }

  getAllProviders(): NotificationProvider[] {
    const allProviders: NotificationProvider[] = [];
    this.providersByChannel.forEach((providers) => {
      allProviders.push(...providers);
    });
    return allProviders;
  }
}
