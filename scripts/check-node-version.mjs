import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function parts(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid Node.js version: ${version}`);
  return version.split('.').map(Number);
}

function compare(left, right) {
  const a = parts(left);
  const b = parts(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function runtimeIsSupported(current, minimum) {
  return parts(current)[0] === parts(minimum)[0] && compare(current, minimum) >= 0;
}

export function runtimeCheckResult(current, minimum, { vercel = false, githubActions = false } = {}) {
  if (runtimeIsSupported(current, minimum)) return 'ok';
  if (vercel && !githubActions && parts(current)[0] === parts(minimum)[0]) return 'warning';
  return 'error';
}

export function missingSecurityRelease(minimum, releases) {
  const major = parts(minimum)[0];
  return releases
    .filter((release) => release.security)
    .map((release) => release.version.replace(/^v/, ''))
    .filter((version) => parts(version)[0] === major && compare(version, minimum) > 0)
    .sort(compare)
    .at(-1);
}

async function main() {
  const minimum = readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim();
  if (process.argv.includes('--security')) {
    const response = await fetch('https://nodejs.org/dist/index.json', {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Node.js release index returned HTTP ${response.status}`);
    const releases = await response.json();
    if (!Array.isArray(releases) || releases.length === 0) throw new Error('Node.js release index is empty or invalid');
    if (!releases.some((release) => release.version === `v${minimum}`)) throw new Error(`Pinned Node.js ${minimum} is absent from the release index`);
    const missing = missingSecurityRelease(minimum, releases);
    if (missing) throw new Error(`Node.js security release ${missing} is available. Update .nvmrc, package engines, and the deployed runtime; current pin is ${minimum}.`);
    console.log(`Node.js ${minimum} includes the published security releases for this major.`);
    return;
  }
  // Vercel controls managed patches. Keep package fixes deployable while its
  // patch rolls out; local builds and GitHub Actions still require the pin.
  const result = runtimeCheckResult(process.versions.node, minimum, {
    vercel: process.env.VERCEL === '1',
    githubActions: process.env.GITHUB_ACTIONS === 'true',
  });
  if (result === 'warning') {
    console.warn(`WARNING: Vercel build Node.js ${process.versions.node} is below ${minimum}. Vercel manages this patch rollout. Continuing the package build; the live function runtime patch is not verified.`);
    return;
  }
  if (result === 'error') {
    throw new Error(`Node.js ${process.versions.node} is unsupported. Use >=${minimum} <${parts(minimum)[0] + 1}.`);
  }
  console.log(`Node.js ${process.versions.node} meets the security minimum ${minimum}.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
