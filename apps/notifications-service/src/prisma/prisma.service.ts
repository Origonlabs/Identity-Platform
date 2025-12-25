import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../node_modules/.prisma/notifications-client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // @ts-ignore - Prisma v6 type issue with $on event
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
