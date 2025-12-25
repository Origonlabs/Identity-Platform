import type { PrismaClient } from '@prisma/client';
import type { OutboxRepository, OutboxEvent } from './types';

export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUnprocessed(limit: number): Promise<OutboxEvent[]> {
    const records = await this.prisma.outboxEvent.findMany({
      where: {
        processedAt: null,
      },
      orderBy: {
        occurredAt: 'asc',
      },
      take: limit,
    });

    return records.map((record) => ({
      id: record.id,
      eventType: record.eventType,
      payload: record.payload,
      occurredAt: record.occurredAt,
      processedAt: record.processedAt ?? undefined,
    }));
  }

  async markAsProcessed(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  async markAsFailed(id: string, error: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        processedAt: new Date(),
        payload: {
          ...((await this.prisma.outboxEvent.findUnique({ where: { id } }))?.payload as any),
          _error: error,
          _failedAt: new Date().toISOString(),
        },
      },
    });
  }
}
