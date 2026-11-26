import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    restoreMocks: true,
    env: {
      TZ: 'UTC', // o fuso da máquina não pode esconder erro de fuso
      MONGO_URI: 'mongodb://127.0.0.1:1/nunca-usar', // impede que o MONGO_URI do .env (Atlas) chegue aos testes
      JWT_SECRET_KEY: 'test-secret',
      JWT_REFRESH_SECRET_KEY: 'test-refresh-secret',
      GOOGLE_CLIENT_ID: 'test-client-id',
    },
  },
});
