import type { EventBus } from './types';

export abstract class BaseEventBus implements EventBus {
  abstract publish<T>(topic: string, event: any): Promise<void>;
  abstract subscribe<T>(
    topic: string,
    handler: (event: T) => Promise<void>,
    options?: any
  ): Promise<any>;
  abstract close(): Promise<void>;

  protected validateEvent(event: any): void {
    if (!event.id) {
      throw new Error('Event must have an id');
    }
    if (!event.type) {
      throw new Error('Event must have a type');
    }
    if (!event.version) {
      throw new Error('Event must have a version');
    }
    if (!event.occurredAt) {
      throw new Error('Event must have an occurredAt timestamp');
    }
    if (!event.payload) {
      throw new Error('Event must have a payload');
    }
  }
}
