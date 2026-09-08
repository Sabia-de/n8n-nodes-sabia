const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { name, version } = require('../package.json');

for (const [label, output, exitCode, expected] of [
  ['explicit pass', `✅ Package ${name}@${version} has passed all security checks`, 0, 0],
  ['scanner failure with exit zero', '❌ Package has failed security checks', 0, 1],
  ['different version', `✅ Package ${name}@999.0.0 has passed all security checks`, 0, 1],
  ['nonzero exit despite pass text', `✅ Package ${name}@${version} has passed all security checks`, 1, 1],
]) {
  test(`published scan requires ${label}`, { skip: process.platform === 'win32' }, () => {
    const dir = mkdtempSync(join(tmpdir(), 'sabia-scan-'));
    try {
      writeFileSync(join(dir, 'npm'), `#!${process.execPath}\nconsole.log(${JSON.stringify(output)});process.exit(${exitCode});\n`, { mode: 0o700 });
      const result = spawnSync(process.execPath, [join(__dirname, '../scripts/scan-published.mjs')], {
        env: { ...process.env, PATH: `${dir}:${process.env.PATH}` }, encoding: 'utf8',
      });
      assert.equal(result.status, expected, result.stderr);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
}
