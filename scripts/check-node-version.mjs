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
  // Hosting providers select a major version. Stop a new build if the actual
  // build runtime has not received this repository's required security patch.
  if (!runtimeIsSupported(process.versions.node, minimum)) {
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
