import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'dist-android');

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    // Android's asset packager omits source-control directory markers.
    if (entry.name === '.gitkeep') return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

// Compare every public file, including speech, images, and asset credits, byte for byte.
const publicRoot = join(root, 'public');
for (const path of files(publicRoot)) {
  const name = relative(publicRoot, path);
  assert.deepEqual(
    readFileSync(join(output, name)),
    readFileSync(path),
    `Missing/changed: ${name}`,
  );
}
const html = readFileSync(join(output, 'index.html'), 'utf8');
assert.match(html, /src="\/assets\/assets\/[^" ]+\.js"/);
assert.doesNotMatch(html, /registerSW|manifest\.webmanifest|https?:\/\//);
assert(!files(output).some((path) => /(?:^|[/\\])(sw\.js|workbox-[^/\\]+\.js)$/.test(path)));

// Optional APK/AAB verification checks the actual archive, including every lazy chunk.
const archive = process.argv[2];
if (archive) {
  const prefix = archive.endsWith('.aab') ? 'base/assets/' : 'assets/';
  for (const path of files(output)) {
    const name = relative(output, path).replaceAll('\\', '/');
    const packaged = execFileSync('unzip', ['-p', resolve(archive), `${prefix}${name}`], {
      maxBuffer: 64 * 1024 * 1024,
    });
    assert.deepEqual(packaged, readFileSync(path), `Archive missing/changed: ${name}`);
  }
}
console.log(`Verified local Android assets${archive ? ` in ${archive}` : ''}.`);
