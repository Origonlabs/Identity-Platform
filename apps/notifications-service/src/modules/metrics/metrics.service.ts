import { Injectable } from '@nestjs/common';
import { createCounter, createHistogram, createGauge } from '@opendex/observability';

@Injectable()
export class MetricsService {
  readonly httpRequests = createCounter('http_requests_total', 'Total HTTP requests');
  readonly httpRequestDuration = createHistogram('http_request_duration_seconds', 'HTTP request duration');
  readonly activeConnections = createGauge('active_connections', 'Active database connections');
  readonly notificationsEnqueued = createCounter('notifications_enqueued_total', 'Total notifications enqueued');
  readonly notificationsProcessed = createCounter('notifications_processed_total', 'Total notifications processed');
  readonly notificationsFailed = createCounter('notifications_failed_total', 'Total notifications failed');
  readonly outboxEventsProcessed = createCounter('outbox_events_processed_total', 'Total outbox events processed');

  recordHttpRequest(method: string, route: string, status: number, duration: number): void {
    this.httpRequests.add(1, { method, route, status: status.toString() });
    this.httpRequestDuration.record(duration, { method, route, status: status.toString() });
  }

  recordNotificationEnqueued(channel: string): void {
    this.notificationsEnqueued.add(1, { channel });
  }

  recordNotificationProcessed(channel: string, status: string): void {
    this.notificationsProcessed.add(1, { channel, status });
  }

  recordNotificationFailed(channel: string, error: string): void {
    this.notificationsFailed.add(1, { channel, error });
  }

  recordOutboxEventProcessed(eventType: string): void {
    this.outboxEventsProcessed.add(1, { event_type: eventType });
  }

  setActiveConnections(count: number): void {
    this.activeConnections.add(count);
  }
}
