import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
    env: {
      MONGO_URI: '', // impede que o MONGO_URI do .env (Atlas) chegue aos testes
      JWT_SECRET_KEY: 'test-secret',
      JWT_REFRESH_SECRET_KEY: 'test-refresh-secret',
      GOOGLE_CLIENT_ID: 'test-client-id',
    },
  },
});
