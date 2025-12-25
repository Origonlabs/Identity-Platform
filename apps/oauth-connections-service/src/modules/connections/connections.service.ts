import { Injectable } from '@nestjs/common';
import {
  EventEnvelope,
  OAuthConnection,
  TokenSet,
  oauthConnectionEvents,
} from '@opendex/contracts';
import { ConnectionStatus } from '../../../node_modules/.prisma/oauth-connections-client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { MetricsService } from '../metrics/metrics.service';
import { startSpan } from '@opendex/observability';

type StoredConnection = OAuthConnection & { tokenSet?: TokenSet };

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService
  ) {}

  async link(dto: CreateConnectionDto): Promise<StoredConnection> {
    return startSpan('oauth.connections.link', async (span) => {
      span.setAttributes({
        'oauth.provider_id': dto.providerId,
        'oauth.project_id': dto.projectId,
        'oauth.user_id': dto.userId,
      });

      const now = new Date().toISOString();
      const id = dto.id || `conn_${randomUUID()}`;

      const created = await this.prisma.oAuthConnection.create({
        data: {
          id,
          providerId: dto.providerId,
          projectId: dto.projectId,
          tenantId: dto.tenantId,
          userId: dto.userId,
          scope: dto.scope,
          status: ConnectionStatus.active,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(now),
          updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(now),
          tokenSet: {
            create: {
              accessToken: dto.tokenSet.accessToken,
              refreshToken: dto.tokenSet.refreshToken,
              expiresIn: dto.tokenSet.expiresIn ?? null,
              tokenType: dto.tokenSet.tokenType,
              issuedAt: new Date(dto.tokenSet.issuedAt),
              expiresAt: dto.tokenSet.expiresAt ? new Date(dto.tokenSet.expiresAt) : null,
              idToken: dto.tokenSet.idToken,
            },
          },
        },
        include: {
          tokenSet: true,
        },
      });

      const record: StoredConnection = {
        id: created.id,
        providerId: created.providerId,
        projectId: created.projectId,
        tenantId: created.tenantId ?? undefined,
        userId: created.userId,
        scope: created.scope,
        status: created.status as OAuthConnection['status'],
        expiresAt: created.expiresAt?.toISOString(),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        tokenSet: created.tokenSet
          ? {
              accessToken: created.tokenSet.accessToken,
              refreshToken: created.tokenSet.refreshToken ?? undefined,
              expiresIn: created.tokenSet.expiresIn ?? undefined,
              tokenType: created.tokenSet.tokenType ?? undefined,
              issuedAt: created.tokenSet.issuedAt.toISOString(),
              expiresAt: created.tokenSet.expiresAt?.toISOString(),
              idToken: created.tokenSet.idToken ?? undefined,
            }
          : undefined,
      };

      const event: EventEnvelope<{ connection: StoredConnection }> = {
        id: `evt_${randomUUID()}`,
        type: oauthConnectionEvents.linked.type,
        version: oauthConnectionEvents.linked.version,
        occurredAt: new Date().toISOString(),
        payload: { connection: record },
        meta: { source: 'oauth-connections-service' },
      };

      await this.prisma.outboxEvent.create({
        data: {
          eventType: oauthConnectionEvents.linked.type,
          payload: event as unknown as object,
        },
      });

      this.metrics.recordConnectionLinked(dto.providerId);
      span.addEvent('oauth.connection.linked', {
        'connection.id': created.id,
      });

      return record;
    });
  }

  async list(): Promise<StoredConnection[]> {
    const records = await this.prisma.oAuthConnection.findMany({
      include: {
        tokenSet: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((rec) => this.mapToStoredConnection(rec));
  }

  async getById(id: string): Promise<StoredConnection | null> {
    return startSpan('oauth.connections.get', async (span) => {
      span.setAttributes({ 'connection.id': id });

      const record = await this.prisma.oAuthConnection.findUnique({
        where: { id },
        include: { tokenSet: true },
      });

      if (!record) {
        return null;
      }

      return this.mapToStoredConnection(record);
    });
  }

  async updateTokens(
    id: string,
    tokenSet: TokenSet
  ): Promise<StoredConnection> {
    return startSpan('oauth.connections.update_tokens', async (span) => {
      span.setAttributes({ 'connection.id': id });

      const updated = await this.prisma.oAuthConnection.update({
        where: { id },
        data: {
          status: ConnectionStatus.active,
          updatedAt: new Date(),
          tokenSet: {
            update: {
              accessToken: tokenSet.accessToken,
              refreshToken: tokenSet.refreshToken,
              expiresIn: tokenSet.expiresIn ?? null,
              tokenType: tokenSet.tokenType,
              issuedAt: new Date(tokenSet.issuedAt),
              expiresAt: tokenSet.expiresAt ? new Date(tokenSet.expiresAt) : null,
              idToken: tokenSet.idToken,
            },
          },
        },
        include: { tokenSet: true },
      });

      const record = this.mapToStoredConnection(updated);

      const event: EventEnvelope<{ connection: StoredConnection }> = {
        id: `evt_${randomUUID()}`,
        type: oauthConnectionEvents.tokenRefreshed.type,
        version: oauthConnectionEvents.tokenRefreshed.version,
        occurredAt: new Date().toISOString(),
        payload: { connection: record },
        meta: { source: 'oauth-connections-service' },
      };

      await this.prisma.outboxEvent.create({
        data: {
          eventType: oauthConnectionEvents.tokenRefreshed.type,
          payload: event as unknown as object,
        },
      });

      this.metrics.recordConnectionRefreshed(record.providerId);
      span.addEvent('oauth.connection.refreshed', { 'connection.id': id });

      return record;
    });
  }

  async revoke(id: string): Promise<StoredConnection> {
    return startSpan('oauth.connections.revoke', async (span) => {
      span.setAttributes({ 'connection.id': id });

      const updated = await this.prisma.oAuthConnection.update({
        where: { id },
        data: {
          status: ConnectionStatus.revoked,
          updatedAt: new Date(),
        },
        include: { tokenSet: true },
      });

      const record = this.mapToStoredConnection(updated);

      const event: EventEnvelope<{ connection: StoredConnection }> = {
        id: `evt_${randomUUID()}`,
        type: oauthConnectionEvents.revoked.type,
        version: oauthConnectionEvents.revoked.version,
        occurredAt: new Date().toISOString(),
        payload: { connection: record },
        meta: { source: 'oauth-connections-service' },
      };

      await this.prisma.outboxEvent.create({
        data: {
          eventType: oauthConnectionEvents.revoked.type,
          payload: event as unknown as object,
        },
      });

      this.metrics.recordConnectionRevoked(record.providerId, 'user_request');
      span.addEvent('oauth.connection.revoked', { 'connection.id': id });

      return record;
    });
  }

  async delete(id: string): Promise<void> {
    return startSpan('oauth.connections.delete', async (span) => {
      span.setAttributes({ 'connection.id': id });

      await this.prisma.oAuthConnection.delete({
        where: { id },
      });

      span.addEvent('oauth.connection.deleted', { 'connection.id': id });
    });
  }

  private mapToStoredConnection(rec: any): StoredConnection {
    return {
      id: rec.id,
      providerId: rec.providerId,
      projectId: rec.projectId,
      tenantId: rec.tenantId ?? undefined,
      userId: rec.userId,
      scope: rec.scope,
      status: rec.status as OAuthConnection['status'],
      expiresAt: rec.expiresAt?.toISOString(),
      createdAt: rec.createdAt.toISOString(),
      updatedAt: rec.updatedAt.toISOString(),
      tokenSet: rec.tokenSet
        ? {
            accessToken: rec.tokenSet.accessToken,
            refreshToken: rec.tokenSet.refreshToken ?? undefined,
            expiresIn: rec.tokenSet.expiresIn ?? undefined,
            tokenType: rec.tokenSet.tokenType ?? undefined,
            issuedAt: rec.tokenSet.issuedAt.toISOString(),
            expiresAt: rec.tokenSet.expiresAt?.toISOString(),
            idToken: rec.tokenSet.idToken ?? undefined,
          }
        : undefined,
    };
  }
}
