import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { devApi } from './build/dev-api.ts';
import { swAssets } from './build/sw-assets.ts';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [preact(), tailwindcss(), swAssets(), devApi()],
  build: { target: 'es2022', sourcemap: false },
});
