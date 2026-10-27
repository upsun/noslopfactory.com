import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';

const argument = process.argv[2];
assert(
  argument,
  'Pass a deployed base URL: pnpm check:cache https://example.com',
);
const base = new URL(argument);
assert(
  ['http:', 'https:'].includes(base.protocol),
  'Use an HTTP or HTTPS URL.',
);
assert(
  !base.username && !base.password,
  'Use a URL without embedded credentials.',
);

async function htmlPaths(
  directory = new URL('../dist/', import.meta.url),
  path = '/',
) {
  const paths = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory())
      paths.push(
        ...(await htmlPaths(
          new URL(`${entry.name}/`, directory),
          `${path}${entry.name}/`,
        )),
      );
    else if (entry.name === 'index.html') paths.push(path);
  }
  return paths;
}

const pages = await htmlPaths();
assert(pages.length, 'Run pnpm build before checking deployed cache headers.');
const assets = await readdir(new URL('../dist/_astro/', import.meta.url));
const photos = await readdir(new URL('../dist/products/', import.meta.url));
const checks = pages.map((path) => ({ path, immutable: false }));
checks.push({ path: '/favicon.svg', immutable: false });
const photo = photos.find((name) => name.endsWith('.webp'));
assert(photo, 'No built product photo found.');
checks.push({ path: `/products/${photo}`, immutable: false });
for (const extension of ['.js', '.css', '.woff2']) {
  const file = assets.find((name) => name.endsWith(extension));
  assert(file, `No built ${extension} asset found.`);
  checks.push({ path: `/_astro/${file}`, immutable: true });
}

for (const { path, immutable } of checks) {
  const response = await fetch(new URL(path, base.origin), {
    method: 'HEAD',
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  const policy = response.headers.get('cache-control') ?? '';
  const directives = policy
    .toLowerCase()
    .split(',')
    .map((value) => value.trim());
  if (immutable) {
    assert(
      directives.includes('public') && directives.includes('immutable'),
      `${path}: missing immutable caching: ${policy}`,
    );
    assert(
      directives.includes('max-age=2419200'),
      `${path}: expected four-week caching: ${policy}`,
    );
    assert(
      !directives.includes('no-cache'),
      `${path}: inherited the document cache policy: ${policy}`,
    );
  } else {
    assert(
      directives.includes('no-cache') &&
        directives.includes('max-age=0') &&
        directives.includes('must-revalidate'),
      `${path}: can reuse stale deployment content: ${policy}`,
    );
    assert(
      !directives.includes('immutable'),
      `${path}: stable URL must not be immutable`,
    );
  }
  console.log(`PASS ${path}: ${policy}`);
}
console.log(
  `Verified ${pages.length} HTML routes, two stable assets, and three fingerprinted assets.`,
);
