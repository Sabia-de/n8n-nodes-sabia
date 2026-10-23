import assert from 'node:assert/strict';
import test from 'node:test';
import { missingSecurityRelease, runtimeCheckResult, runtimeIsSupported } from './check-node-version.mjs';

test('builds reject old security patches and unsupported major versions', () => {
  assert.equal(runtimeIsSupported('24.16.0', '24.22.1'), false);
  assert.equal(runtimeIsSupported('24.22.0', '24.22.1'), false);
  assert.equal(runtimeIsSupported('22.23.4', '24.22.1'), false);
  assert.equal(runtimeIsSupported('26.12.1', '24.22.1'), false);
  assert.equal(runtimeIsSupported('24.22.1', '24.22.1'), true);
  assert.equal(runtimeIsSupported('24.23.0', '24.22.1'), true);
});

test('only managed Vercel builds warn on patch lag; local builds and GitHub Actions fail', () => {
  assert.equal(runtimeCheckResult('24.22.0', '24.22.1', { vercel: true }), 'warning');
  assert.equal(runtimeCheckResult('24.22.0', '24.22.1'), 'error');
  assert.equal(runtimeCheckResult('24.22.0', '24.22.1', { vercel: true, githubActions: true }), 'error');
  assert.equal(runtimeCheckResult('22.23.4', '24.22.1', { vercel: true }), 'error');
  assert.equal(runtimeCheckResult('24.22.1', '24.22.1', { vercel: true }), 'ok');
});

test('the scheduled check finds the latest missing security release in the pinned major', () => {
  const releases = [
    { version: 'v26.12.1', security: true },
    { version: 'v24.23.0', security: false },
    { version: 'v24.22.1', security: true },
    { version: 'v24.17.0', security: true },
  ];
  assert.equal(missingSecurityRelease('24.16.0', releases), '24.22.1');
  assert.equal(missingSecurityRelease('24.22.1', releases), undefined);
});

test('invalid or partial version pins fail instead of passing silently', () => {
  assert.throws(() => runtimeIsSupported('24.22.1', '24'), /Invalid/);
  assert.throws(() => missingSecurityRelease('24.22.1', [{ version: 'broken', security: true }]), /Invalid/);
});
