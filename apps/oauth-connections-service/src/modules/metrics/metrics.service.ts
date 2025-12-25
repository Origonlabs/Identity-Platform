import { Injectable } from '@nestjs/common';
import { createCounter, createHistogram, createGauge } from '@opendex/observability';

@Injectable()
export class MetricsService {
  readonly httpRequests = createCounter('http_requests_total', 'Total HTTP requests');
  readonly httpRequestDuration = createHistogram('http_request_duration_seconds', 'HTTP request duration');
  readonly activeConnections = createGauge('active_connections', 'Active database connections');
  readonly connectionsLinked = createCounter('oauth_connections_linked_total', 'Total OAuth connections linked');
  readonly connectionsRefreshed = createCounter('oauth_connections_refreshed_total', 'Total OAuth connections refreshed');
  readonly connectionsRevoked = createCounter('oauth_connections_revoked_total', 'Total OAuth connections revoked');
  readonly tokenRefreshErrors = createCounter('oauth_token_refresh_errors_total', 'Total token refresh errors');
  readonly outboxEventsProcessed = createCounter('outbox_events_processed_total', 'Total outbox events processed');

  recordHttpRequest(method: string, route: string, status: number, duration: number): void {
    this.httpRequests.add(1, { method, route, status: status.toString() });
    this.httpRequestDuration.record(duration, { method, route, status: status.toString() });
  }

  recordConnectionLinked(providerId: string): void {
    this.connectionsLinked.add(1, { provider_id: providerId });
  }

  recordConnectionRefreshed(providerId: string): void {
    this.connectionsRefreshed.add(1, { provider_id: providerId });
  }

  recordConnectionRevoked(providerId: string, reason: string): void {
    this.connectionsRevoked.add(1, { provider_id: providerId, reason });
  }

  recordTokenRefreshError(providerId: string, error: string): void {
    this.tokenRefreshErrors.add(1, { provider_id: providerId, error });
  }

  recordOutboxEventProcessed(eventType: string): void {
    this.outboxEventsProcessed.add(1, { event_type: eventType });
  }

  setActiveConnections(count: number): void {
    this.activeConnections.add(count);
  }
}
