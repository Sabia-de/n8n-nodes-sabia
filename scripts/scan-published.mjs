import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { name, version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const spec = `${name}@${version}`;
const result = spawnSync('npm', ['exec', '--yes', '--package=@n8n/scan-community-package@0.35.0', '--', 'scan-community-package', spec], {
  cwd: root,
  encoding: 'utf8',
  timeout: 600_000,
  maxBuffer: 10 * 1024 * 1024,
});
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
// Scanner 0.35.0 can exit 0 when its checks fail. Require its positive result.
const passed = result.stdout?.split(/\r?\n/).includes(`✅ Package ${spec} has passed all security checks`);
if (result.error || result.status !== 0 || !passed) {
  console.error(`Published-package verification failed for ${spec}.`);
  process.exitCode = 1;
}
