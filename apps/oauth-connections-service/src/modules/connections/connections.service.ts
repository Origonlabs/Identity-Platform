import { Injectable } from '@nestjs/common';
import {
  OAuthConnection,
  TokenSet,
  oauthConnectionEvents,
} from '@opendex/contracts';
import { randomUUID } from 'crypto';
import { CreateConnectionDto } from './dto/create-connection.dto';

type StoredConnection = OAuthConnection & { tokenSet?: TokenSet };

@Injectable()
export class ConnectionsService {
  private readonly connections = new Map<string, StoredConnection>();

  async link(dto: CreateConnectionDto): Promise<StoredConnection> {
    const now = new Date().toISOString();
    const id = dto.id || `conn_${randomUUID()}`;
    const record: StoredConnection = {
      id,
      providerId: dto.providerId,
      projectId: dto.projectId,
      tenantId: dto.tenantId,
      userId: dto.userId,
      scope: dto.scope,
      status: 'active',
      createdAt: dto.createdAt ?? now,
      updatedAt: dto.updatedAt ?? now,
      expiresAt: dto.expiresAt,
      tokenSet: dto.tokenSet,
    };
    this.connections.set(id, record);

    // TODO: publish oauthConnectionEvents.linked to bus
    void oauthConnectionEvents;
    return record;
  }

  async list(): Promise<StoredConnection[]> {
    return [...this.connections.values()];
  }
}
