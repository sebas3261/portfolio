# Sebastian Sanchez Portfolio

Personal portfolio built with Astro.

## Commands

```sh
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## Blog

The blog can read posts from Notion or from local MDX files.

### Notion source

Set these environment variables:

```sh
NOTION_TOKEN=
NOTION_BLOG_DATABASE_ID=
```

The Notion database should include these properties:

- `Title`: title
- `Description`: rich text
- `Date`: date
- `Lang`: select with `en` or `es`
- `Slug`: rich text
- `Tags`: multi-select
- `Draft`: checkbox
- `Cover`: page cover, URL, or file property
- `CoverAlt`: rich text, optional

Supported Notion content blocks include paragraphs, headings, bullet lists, numbered lists, quotes, code, images, and YouTube embeds.

### Local fallback

If Notion variables are missing, the blog uses local files in:

```text
src/content/blog
```

Use `.mdx` when a post needs custom components.
