import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    // Component tests opt into jsdom per file with a `@vitest-environment` docblock.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // Playwright specs need a browser and running servers; they run via test:e2e.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
