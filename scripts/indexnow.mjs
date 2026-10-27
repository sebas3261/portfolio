import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
export function locations(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => decode(m[1]));
}
export function fingerprint(html) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!main) throw new Error('Page has no main content; refusing to notify IndexNow.');
  const content = main.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!content) throw new Error('Page has empty main content.');
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  return createHash('sha256').update(title + '\n' + content).digest('hex');
}

export async function run({ origin, key, sitemaps, stateFile = '.indexnow-state.json', dryRun = false, fetcher = fetch }) {
  const site = new URL(origin);
  const checkedUrl = (value) => {
    const url = new URL(value);
    if (url.origin !== site.origin) throw new Error(`Unexpected sitemap host: ${url.host}`);
    return url.href;
  };
  async function get(url, skipRedirects = false) {
    const response = await fetcher(checkedUrl(url), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    if (skipRedirects && [301, 302, 303, 307, 308].includes(response.status)) {
      console.log(`Skipping redirected URL: ${url}`);
      return null;
    }
    if (!response.ok) throw new Error(`Fetch failed (${response.status}): ${url}`);
    return response;
  }
  // Verify the deployed ownership file before sending anything externally.
  if (!dryRun && (await (await get(new URL(`/${key}.txt`, site).href)).text()).trim() !== key) {
    throw new Error('Deploy the IndexNow verification file before submitting URLs.');
  }
  const visited = new Set();
  const pages = new Set();
  async function collect(url) {
    url = checkedUrl(url);
    if (visited.has(url)) return;
    if (visited.size >= 50) throw new Error('Sitemap limit exceeded.');
    visited.add(url);
    const xml = await (await get(url)).text();
    if (!/<(?:sitemapindex|urlset)\b/.test(xml)) throw new Error(`Invalid sitemap: ${url}`);
    const urls = locations(xml);
    if (/<sitemapindex\b/.test(xml)) {
      for (const child of urls) await collect(child);
    } else {
      for (const page of urls) pages.add(checkedUrl(page));
    }
  }
  for (const path of sitemaps) await collect(new URL(path, site).href);
  if (!pages.size || pages.size > 1000) throw new Error('Unexpected page count; no submission made.');
  let previous = {};
  try { previous = JSON.parse(await readFile(stateFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const current = {};
  // Fetch all pages before submitting; transient errors never replace the saved state.
  for (const url of pages) {
    const response = await get(url, true);
    if (!response) continue;
    if (!response.headers.get('content-type')?.includes('text/html')) throw new Error(`Not HTML: ${url}`);
    const html = await response.text();
    if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) || /noindex/i.test(response.headers.get('x-robots-tag') ?? '')) {
      throw new Error(`Sitemap includes a noindex page: ${url}`);
    }
    current[url] = fingerprint(html);
  }
  const changed = Object.keys(current).filter((url) => current[url] !== previous[url]);
  console.log(`${pages.size} pages checked; ${changed.length} new or changed URLs${dryRun ? ' (dry run)' : ''}.`);
  if (dryRun) return changed;
  if (changed.length) {
    const response = await fetcher('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host: site.host, key, keyLocation: new URL(`/${key}.txt`, site).href, urlList: changed }),
      signal: AbortSignal.timeout(30000),
    });
    if (![200, 202].includes(response.status)) throw new Error(`IndexNow rejected submission: ${response.status}`);
    console.log(`IndexNow received ${changed.length} URLs.${response.status === 202 ? ' Ownership validation pending (202).' : ' Accepted (200).'}`);
  }
  // Keep missing URLs in state: an incomplete Notion response must not imply deletions.
  await writeFile(stateFile, JSON.stringify({ ...previous, ...current }, null, 2) + '\n');
  return changed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const config = JSON.parse(await readFile(new URL('../indexnow.json', import.meta.url), 'utf8'));
  await run({ ...config, dryRun: process.argv.includes('--dry-run') });
}
