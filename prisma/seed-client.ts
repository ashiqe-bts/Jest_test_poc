import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client';

export function createSeedClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaMariaDb(databaseUrl),
  });
}
