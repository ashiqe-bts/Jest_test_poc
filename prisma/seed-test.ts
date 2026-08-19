import { config } from 'dotenv';
import { PrismaClient } from '../generated/prisma/client';
import { createSeedClient } from './seed-client';

export const TEST_FIXTURE = {
  user: {
    id: '7c3c25af-64a7-4df2-9c84-8e8892f32a61',
    name: 'Test Fixture User',
    email: 'test.fixture@example.com',
  },
  project: {
    id: 'f37561bb-2cf6-4a2f-a9e2-d9ef9c58f301',
    name: 'Test Fixture Project',
  },
} as const;

export async function seedTestFixture(prisma: PrismaClient): Promise<void> {
  await prisma.user.upsert({
    where: { id: TEST_FIXTURE.user.id },
    update: {
      name: TEST_FIXTURE.user.name,
      email: TEST_FIXTURE.user.email,
    },
    create: TEST_FIXTURE.user,
  });

  await prisma.project.upsert({
    where: { id: TEST_FIXTURE.project.id },
    update: { name: TEST_FIXTURE.project.name },
    create: TEST_FIXTURE.project,
  });

  await prisma.userProject.upsert({
    where: {
      userId_projectId: {
        userId: TEST_FIXTURE.user.id,
        projectId: TEST_FIXTURE.project.id,
      },
    },
    update: {},
    create: {
      userId: TEST_FIXTURE.user.id,
      projectId: TEST_FIXTURE.project.id,
    },
  });
}

async function main(): Promise<void> {
  config({ path: '.env', quiet: true });

  const testDatabaseUrl = process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is not set');
  }

  const prisma = createSeedClient(testDatabaseUrl);

  try {
    await seedTestFixture(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
