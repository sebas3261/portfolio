import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { run } from './indexnow.mjs';

test('submits new and changed content once and preserves state on failures', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'indexnow-'));
  try {
    let text = 'First article';
    let submissionStatus = 200;
    let pageStatus = 200;
    const submissions = [];
    const config = {
      origin: 'https://example.com', key: '12345678', sitemaps: ['/sitemap.xml'],
      stateFile: join(dir, 'state.json'),
      fetcher: async (url, options) => {
        if (options.method === 'POST') {
          submissions.push(JSON.parse(options.body));
          return new Response(null, { status: submissionStatus });
        }
        if (url.endsWith('.txt')) return new Response('12345678');
        if (url.endsWith('.xml')) return new Response('<urlset><url><loc>https://example.com/article/</loc></url></urlset>');
        return new Response(`<title>Article</title><main>${text}</main>`, { status: pageStatus, headers: { 'Content-Type': 'text/html' } });
      },
    };
    await run(config);
    assert.deepEqual(submissions[0].urlList, ['https://example.com/article/']);
    await run(config);
    assert.equal(submissions.length, 1);
    const saved = await readFile(config.stateFile, 'utf8');
    text = 'Updated article';
    submissionStatus = 429;
    await assert.rejects(run(config), /429/);
    assert.equal(await readFile(config.stateFile, 'utf8'), saved);
    submissionStatus = 202;
    await assert.rejects(run(config), /validation pending/);
    assert.equal(await readFile(config.stateFile, 'utf8'), saved);
    submissionStatus = 200;
    await run(config);
    assert.notEqual(await readFile(config.stateFile, 'utf8'), saved);
    pageStatus = 503;
    const updated = await readFile(config.stateFile, 'utf8');
    await assert.rejects(run(config), /503/);
    assert.equal(await readFile(config.stateFile, 'utf8'), updated);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
