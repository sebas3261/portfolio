# Sebastian Sanchez Portfolio

Personal portfolio built with Astro.

## Search notifications

The `Notify search engines of content changes` GitHub workflow checks the production
sitemaps every six hours, after pushes to main, and on manual dispatch. It submits
only new URLs or pages whose title/main text changed to IndexNow. This includes
Notion publications without a new deployment. The ownership text file in `public/`
must be deployed before submissions can succeed; it is intentionally public and is
not a private API credential.

The workflow caches content fingerprints, preserving them only after accepted
submissions. If the cache is evicted, the next run sends a fresh baseline. It skips
redirects, stops on fetch errors, and does not infer deletions from missing sitemap
entries. IndexNow acceptance does not guarantee indexing and does not notify Google.

Validate without sending or saving state: `node scripts/indexnow.mjs --dry-run`.
Run regression checks: `node --test scripts/indexnow.test.mjs`.

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
