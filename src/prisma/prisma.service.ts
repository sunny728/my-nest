import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const adapter = new PrismaPg(pool);
    super({ adapter });
  }
  async onModuleInit() {
    // Initialization logic here
    await this.$connect();
    console.log(
      'PrismaService has been initialized and connected to the database.',
    );
  }

  async onModuleDestroy() {
    // Cleanup logic here
    await this.$disconnect();
    console.log(
      'PrismaService has been disconnected from the database and cleaned up.',
    );
  }
}
