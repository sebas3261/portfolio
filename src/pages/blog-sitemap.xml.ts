import type { APIRoute } from "astro";
import { getBlogPosts } from "../lib/blog";

export const prerender = false;

const site = "https://sebas3261.com";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function urlEntry(path: string, lastmod?: Date): string {
  const url = new URL(path, site);

  return [
    "  <url>",
    `    <loc>${escapeXml(url.toString())}</loc>`,
    lastmod ? `    <lastmod>${lastmod.toISOString()}</lastmod>` : "",
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

export const GET: APIRoute = async () => {
  const posts = await getBlogPosts();
  const entries = [
    urlEntry("/en/blog/"),
    urlEntry("/es/blog/"),
    ...posts.map((post) => urlEntry(`/${post.lang}/blog/${post.slug}/`, post.date)),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
    },
  });
};
