import { PrismaClient } from '@prisma/client';

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_EXPIRES_IN = '1h';
});

afterAll(async () => {
  // Clean up after all tests
  const prisma = new PrismaClient();
  await prisma.$disconnect();
});

// Increase timeout for database operations
jest.setTimeout(30000);
