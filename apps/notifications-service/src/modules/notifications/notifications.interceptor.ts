import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { MetricsService } from '../metrics/metrics.service';
import { startSpan } from '@opendex/observability';

@Injectable()
export class NotificationsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, route } = request;
    const routePath = route?.path || request.url;
    const startTime = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const duration = (Date.now() - startTime) / 1000;
        const status = context.switchToHttp().getResponse().statusCode || 200;

        this.metrics.recordHttpRequest(method, routePath, status, duration);
      }),
      catchError((error) => {
        const duration = (Date.now() - startTime) / 1000;
        const status = error.status || 500;

        this.metrics.recordHttpRequest(method, routePath, status, duration);

        throw error;
      })
    );
  }
}
