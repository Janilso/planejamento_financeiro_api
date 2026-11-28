import { defineConfig } from 'vitest/config';
import base from './vitest.config.mjs';

// Medições de desempenho (`npm run perf`): mesmo ambiente da suíte, mas só os
// arquivos *.perf.ts, que `npm test` não roda.
export default defineConfig({
  test: {
    ...base.test,
    include: ['test/perf/**/*.perf.ts'],
    testTimeout: 300000,
    hookTimeout: 300000,
  },
});
