import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectionStatus } from '../../../node_modules/.prisma/oauth-connections-client';
import { startSpan } from '@opendex/observability';

@Injectable()
export class TokenRefreshWorker {
  private readonly logger = new Logger(TokenRefreshWorker.name);
  private isProcessing = false;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Mark connections as expired if their tokens have expired
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async markExpiredConnections(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Skipping expired connections check - already processing');
      return;
    }

    return startSpan('oauth.token_refresh.mark_expired', async (span) => {
      this.isProcessing = true;

      try {
        const now = new Date();
        const result = await this.prisma.$transaction(async (tx) => {
          // Find connections with expired tokens
          const expiredConnections = await tx.oAuthConnection.findMany({
            where: {
              status: {
                in: [ConnectionStatus.active, ConnectionStatus.refreshing],
              },
              tokenSet: {
                expiresAt: {
                  lte: now,
                },
              },
            },
            include: {
              tokenSet: true,
            },
          });

          if (expiredConnections.length === 0) {
            return { updated: 0 };
          }

          // Mark them as expired
          const updated = await tx.oAuthConnection.updateMany({
            where: {
              id: {
                in: expiredConnections.map((c) => c.id),
              },
            },
            data: {
              status: ConnectionStatus.expired,
              updatedAt: now,
            },
          });

          return { updated: updated.count, connections: expiredConnections };
        });

        if (result.updated > 0) {
          this.logger.log(`Marked ${result.updated} connections as expired`);
          span.setAttributes({
            'connections.expired': result.updated,
          });
        }
      } catch (error) {
        this.logger.error('Failed to mark expired connections', error);
        span.recordException(error as Error);
        throw error;
      } finally {
        this.isProcessing = false;
      }
    });
  }

  /**
   * Get connections that need token refresh
   * (tokens expiring within the next hour and have refresh token)
   */
  async getConnectionsNeedingRefresh(): Promise<
    Array<{
      id: string;
      providerId: string;
      projectId: string;
      userId: string;
      refreshToken: string;
    }>
  > {
    return startSpan('oauth.token_refresh.get_needing_refresh', async (span) => {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

      const connections = await this.prisma.oAuthConnection.findMany({
        where: {
          status: ConnectionStatus.active,
          tokenSet: {
            expiresAt: {
              lte: oneHourFromNow,
            },
            refreshToken: {
              not: null,
            },
          },
        },
        include: {
          tokenSet: true,
        },
      });

      const result = connections
        .filter((c) => c.tokenSet?.refreshToken)
        .map((c) => ({
          id: c.id,
          providerId: c.providerId,
          projectId: c.projectId,
          userId: c.userId,
          refreshToken: c.tokenSet!.refreshToken!,
        }));

      span.setAttributes({
        'connections.needing_refresh': result.length,
      });

      return result;
    });
  }
}
