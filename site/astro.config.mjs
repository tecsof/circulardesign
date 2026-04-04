// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import netlify from '@astrojs/netlify';

const integrations = [react()];

// Keystatic only works locally (peer dep doesn't support Astro 6 yet)
if (!process.env.NETLIFY) {
  const { default: keystatic } = await import('@keystatic/astro');
  integrations.push(keystatic());
}

export default defineConfig({
  integrations,
  output: 'static',
  adapter: netlify(),
  vite: {
    plugins: [tailwindcss()],
  },
});
