import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, inject } from 'vitest';

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), {
    dbName: `test_${randomUUID()}`,
  });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
});

beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.models).map((m) => m.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
