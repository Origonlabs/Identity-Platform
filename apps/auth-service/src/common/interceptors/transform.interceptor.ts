import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();
    const path = request.url;

    // Don't transform OAuth responses (they have specific formats)
    if (path.includes('/oauth/') || path.includes('/health')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        data,
        timestamp: new Date().toISOString(),
        path,
      })),
    );
  }
}
