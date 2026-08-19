import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { createSeedClient } from './seed-client';

export const BASE_USER = {
  id: 'b4f1c4c2-2f96-4d33-a9cb-6a0cc84f9c21',
  name: 'Base Seed User',
  email: 'base.seed@example.com',
} as const;

export async function seedBaseData(prisma: PrismaClient): Promise<void> {
  await prisma.user.upsert({
    where: { id: BASE_USER.id },
    update: {
      name: BASE_USER.name,
      email: BASE_USER.email,
    },
    create: BASE_USER,
  });
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const prisma = createSeedClient(databaseUrl);

  try {
    await seedBaseData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
