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

## Videos

Videos and their technical explanations use a separate Notion database with the
same properties and supported content blocks as Blog. The **Videos** database is
`3d2dec1e5a7582639ca501c520366416`; it is connected to the existing `blog`
Notion integration. The English and Spanish Two Sum pages were moved there,
preserving their page IDs, content, covers, and metadata.

Set `NOTION_VIDEOS_DATABASE_ID` to override this database. Both sections use the
existing `NOTION_TOKEN`. A video is published by clearing `Draft`, selecting
`Lang`, and setting `Slug`, just like a blog post. Put the video embed and its
technical explanation in the page body.

Public routes: `/en/videos/`, `/es/videos/`, and `/{lang}/videos/{slug}/`.
Old blog URLs permanently redirect when the matching slug is found in Videos.
The dynamic `blog-sitemap.xml` includes both sections. Local MDX entries can use
`section: videos` in their frontmatter; the default is `blog`.

### Configurable sandbox

In a video page in Notion, add a toggle titled `Sandbox: Your title`. Inside,
add a Java code block (a `Solution` class or a method) and a JSON settings block:

```json
{
  "language": "java",
  "functionName": "twoSum",
  "parameterTypes": ["int[]", "int"],
  "cases": [
    { "label": "Classic", "args": [[2, 7, 11, 15], 9], "expected": [0, 1] },
    { "label": "Duplicates", "args": [[3, 3], 6], "expected": [0, 1] }
  ]
}
```

The code editor uses CodeMirror with Java syntax highlighting, line numbers,
automatic indentation, bracket matching, Tab/Shift+Tab indentation, and undo.
Java arguments support primitives, strings, and typed arrays. `expected` is optional;
results are compared as JSON, including array order. `java.util.*` is available.
The Spanish Two Sum page and its local fallback use Java consistently.

Java runs on the visitor's device through CheerpJ 5 and Java 21, downloaded lazily
from the official CDN. The UI includes the required CheerpJ attribution. No Java
code is submitted to a remote compilation service. The runtime lives in an
opaque-origin sandboxed iframe, cannot read the portfolio's DOM or storage, and
uses a dedicated Web Worker plus an in-memory IndexedDB implementation for its virtual filesystem. Its CSP
permits only the runtime CDN, not arbitrary network access. Stop resets the entire
runtime. Initial JVM startup can take longer than subsequent compilations.

The Java compiler bridge is prebuilt at `public/java/playground-runner.jar`.
Rebuild it and the bundled memory filesystem with `node scripts/build-java-runtime.mjs`
(requires a JDK). Normal site builds use the checked-in outputs and do not require
Java on the build server. The compiler disables annotation processing and captures
up to 64 KB of output. Local state is ephemeral.

Existing JavaScript configurations remain supported with `language: javascript`.
Validate parsing and real Java harness execution with
`node --test scripts/playground.test.mjs` (requires a local JDK).
