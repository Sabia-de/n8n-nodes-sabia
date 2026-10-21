# Security maintenance

`.nvmrc` defines the build and local Node.js version. CI reads this file. New builds stop if their actual Node.js version is older than the pin or uses a different major version. Hosting providers manage their runtime patches; a passing build is not proof of the live function runtime version.

The Node security workflow runs daily and on relevant PRs. It checks the official Node.js release index for a newer security release in the pinned major and fails if one exists. A failure requires a patch update and deployment. Enable workflow failure notifications for the people who own security maintenance. The scheduled workflow starts only after this file reaches the repository default branch.

Enable **Dependency graph**, **Dependabot alerts**, and **Dependabot security updates** in GitHub repository settings. The configuration file alone does not enable these settings. Package security PRs target the default branch and respond to published advisories. Routine version-only updates remain disabled. Dependency conflicts and packages without a patched release still need review.

This PR targets `main`. Merge it through the normal release process. After deployment, verify the production source commit, build Node version, and live runtime patch. A resolved alert on the default branch does not prove that production is patched.

## Known unresolved advisories

`braces` (GHSA-vfj7-8cjw-p6xm) has no upstream patched release. These alerts are not dismissed or treated as fixed by this change. Review or replace their parent dependencies when a supported fix becomes available.

The development release tool `release-it` pins Undici 6.23.0. Its compatible parent release does not yet include the Undici fix. n8n community-package lint forbids dependency overrides, so this PR does not force a different version or claim that this release-tool finding is fixed. The affected dependency is not shipped in the community package.
