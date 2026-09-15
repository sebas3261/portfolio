import { Client } from "@notionhq/client";
import { getCollection, type CollectionEntry } from "astro:content";

type Lang = "en" | "es";

type BlogSource = "mdx" | "notion";

type NotionBlock = Record<string, any>;
type NotionQueryResponse = Awaited<ReturnType<Client["dataSources"]["query"]>>;

export interface BlogPostSummary {
  id: string;
  source: BlogSource;
  lang: Lang;
  slug: string;
  title: string;
  description: string;
  date: Date;
  cover?: string;
  coverAlt?: string;
  tags: string[];
  draft: boolean;
}

export interface MdxBlogPost extends BlogPostSummary {
  source: "mdx";
  entry: CollectionEntry<"blog">;
}

export interface NotionBlogPost extends BlogPostSummary {
  source: "notion";
  notionPageId: string;
  blocks: NotionBlock[];
}

export type BlogPost = MdxBlogPost | NotionBlogPost;

const notionToken = import.meta.env.NOTION_TOKEN;
const notionDatabaseId = import.meta.env.NOTION_BLOG_DATABASE_ID;
const notionCacheMs = 30_000;

const notion = notionToken ? new Client({ auth: notionToken }) : null;
let cachedNotionPosts: { expiresAt: number; posts: NotionBlogPost[] } | null = null;

function plainText(value: any[] | undefined): string {
  return value?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
}

function getProperty(properties: Record<string, any>, name: string): any {
  return properties[name] ?? properties[name.toLowerCase()] ?? properties[name.toUpperCase()];
}

function pageCover(page: any): string | undefined {
  if (page.cover?.type === "external") return page.cover.external.url;
  if (page.cover?.type === "file") return page.cover.file.url;

  const cover = getProperty(page.properties, "Cover");
  if (!cover) return undefined;

  if (cover.type === "url") return cover.url ?? undefined;
  if (cover.type === "files") {
    const file = cover.files?.[0];
    if (file?.type === "external") return file.external.url;
    if (file?.type === "file") return file.file.url;
  }

  return undefined;
}

function propertyText(properties: Record<string, any>, name: string): string {
  const property = getProperty(properties, name);

  if (!property) return "";
  if (property.type === "title") return plainText(property.title);
  if (property.type === "rich_text") return plainText(property.rich_text);
  if (property.type === "select") return property.select?.name ?? "";
  if (property.type === "status") return property.status?.name ?? "";
  if (property.type === "url") return property.url ?? "";

  return "";
}

function propertyDate(properties: Record<string, any>, name: string): Date {
  const property = getProperty(properties, name);
  const value = property?.type === "date" ? property.date?.start : undefined;
  return value ? new Date(value) : new Date();
}

function propertyTags(properties: Record<string, any>, name: string): string[] {
  const property = getProperty(properties, name);
  return property?.type === "multi_select" ? property.multi_select.map((tag: any) => tag.name) : [];
}

function propertyCheckbox(properties: Record<string, any>, name: string): boolean {
  const property = getProperty(properties, name);
  return property?.type === "checkbox" ? Boolean(property.checkbox) : false;
}

async function getNotionBlocks(pageId: string): Promise<NotionBlock[]> {
  if (!notion) return [];

  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    blocks.push(...(response.results as NotionBlock[]));
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return blocks;
}

async function queryNotionPosts(startCursor?: string): Promise<NotionQueryResponse> {
  if (!notion || !notionDatabaseId) {
    throw new Error("Missing Notion configuration.");
  }

  const query = {
    start_cursor: startCursor,
    page_size: 100,
    sorts: [{ property: "Date", direction: "descending" as const }],
  };

  try {
    const database = await notion.databases.retrieve({ database_id: notionDatabaseId });
    const dataSourceId = (database as any).data_sources?.[0]?.id;

    if (dataSourceId) {
      return notion.dataSources.query({
        data_source_id: dataSourceId,
        ...query,
      });
    }
  } catch {
    // If the configured ID is already a data source ID, database retrieval will fail.
  }

  try {
    return await notion.dataSources.query({
      data_source_id: notionDatabaseId,
      ...query,
    });
  } catch (error: any) {
    throw error;
  }
}

async function getNotionPosts(): Promise<NotionBlogPost[]> {
  if (!notion || !notionDatabaseId) return [];
  if (cachedNotionPosts && cachedNotionPosts.expiresAt > Date.now()) {
    return cachedNotionPosts.posts;
  }

  const posts: NotionBlogPost[] = [];
  let cursor: string | undefined;

  try {
    do {
      const response = await queryNotionPosts(cursor);

      for (const page of response.results as any[]) {
        const properties = page.properties;
        const lang = propertyText(properties, "Lang") === "es" ? "es" : "en";
        const slug = propertyText(properties, "Slug");
        const title = propertyText(properties, "Title");

        if (!slug || !title) continue;

        posts.push({
          id: `notion:${page.id}`,
          source: "notion",
          notionPageId: page.id,
          lang,
          slug,
          title,
          description: propertyText(properties, "Description"),
          date: propertyDate(properties, "Date"),
          cover: pageCover(page),
          coverAlt: propertyText(properties, "CoverAlt") || title,
          tags: propertyTags(properties, "Tags"),
          draft: propertyCheckbox(properties, "Draft"),
          blocks: await getNotionBlocks(page.id),
        });
      }

      cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);
  } catch (error) {
    console.warn("Notion blog source failed. Falling back to local MDX posts.", error);
    return [];
  }

  cachedNotionPosts = {
    expiresAt: Date.now() + notionCacheMs,
    posts,
  };

  return posts;
}

async function getMdxPosts(): Promise<MdxBlogPost[]> {
  const posts = await getCollection("blog");

  return posts.map((entry) => ({
    id: `mdx:${entry.id}`,
    source: "mdx",
    entry,
    lang: entry.data.lang,
    slug: entry.data.slug,
    title: entry.data.title,
    description: entry.data.description,
    date: entry.data.date,
    cover: entry.data.cover,
    coverAlt: entry.data.coverAlt,
    tags: entry.data.tags,
    draft: entry.data.draft,
  }));
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  const [notionPosts, mdxPosts] = await Promise.all([getNotionPosts(), getMdxPosts()]);
  const posts = notionPosts.length > 0 ? notionPosts : mdxPosts;

  return posts
    .filter((post) => !post.draft)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getBlogPost(lang: Lang, slug: string): Promise<BlogPost | undefined> {
  return (await getBlogPosts()).find((post) => post.lang === lang && post.slug === slug);
}
