import { config } from 'dotenv';

config({ path: '.env', quiet: true });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is not set');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
