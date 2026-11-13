// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),
  markdown: {
    shikiConfig: { theme: "github-dark-default" },
  },

  integrations: [
    mdx(),
    react(),
    sitemap({
      // Only canonical localized pages belong in the sitemap, not redirect aliases.
      filter: (page) => {
        const path = new URL(page).pathname;
        return /^\/(en|es)\//.test(path) && !/\/404\/?$/.test(path);
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()]
  },

  i18n: {
    locales: ["en", "es"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: true,
    },
  },

  site: "https://www.sebas3261.com",
});
