import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService) {
    const connectionString = config.getOrThrow<string>('DATABASE_URL');
    // Keep the pool small: the production droplet has very little RAM and every
    // idle connection costs memory on both the client and Postgres.
    const poolMax = Number(config.get<string>('DATABASE_POOL_MAX') ?? 5);
    const adapter = new PrismaPg({
      connectionString,
      max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
