import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/blog",
    generateId: ({ data, entry }) => {
      const lang = typeof data.lang === "string" ? data.lang : entry.split("/")[0];
      const slug = typeof data.slug === "string" ? data.slug : entry.replace(/\.(md|mdx)$/, "").split("/").pop();
      return `${lang}/${slug}`;
    },
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    lang: z.enum(["en", "es"]),
    slug: z.string(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
