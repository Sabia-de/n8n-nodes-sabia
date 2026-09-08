# Release and n8n verification

This is a preparation checklist, not a record of completed live tests. The first release remains 0.1.0 until it is published.

## Package summary for the Creator Portal

- Package: `n8n-nodes-sabia`
- Public source: https://github.com/Sabia-de/n8n-nodes-sabia
- Service: Sabia, a client management application.
- Nodes: Sabia (Create, Get, Get Many, Update client) and Sabia Trigger (Client Created, Client Updated, Client Stage Changed).
- Authentication: organization-scoped API key, issued by a Sabia platform administrator. Organization API access must be enabled separately.
- Permissions: request only the required client actions and webhook permissions. No finance, documents, portal invitations, or stage writes are exposed.
- Endpoint: `https://app.sabia.de/api/v1`. The released package has no custom-host field.
- Security: password credential field; signed webhook verification; timestamp, event schema, and event-type validation; no runtime dependencies.
- License: MIT. Interface and documentation: English.

Do not include API keys in the submission text, source, example workflows, screenshots, or test evidence. If reviewers request access, arrange a dedicated test organization with synthetic data and a short-lived key through their designated secure channel.

## Before publishing

- [ ] Merge the reviewed backend and package changes.
- [ ] Deploy the backend to the fixed endpoint above, including migrations and scheduled webhook delivery.
- [ ] Enable a dedicated test organization and issue a short-lived test key.
- [ ] Run `npm ci`, `npm run lint`, and `npm test` with Node.js 24.
- [ ] Run `npm pack --dry-run`; inspect the credential, both nodes, icons, README, license, and examples.
- [ ] Run the real n8n tests below and record versions, commit, date, and results without secrets or client data.
- [ ] Confirm the npm package owner has publishing rights and matches the public repository maintainer.
- [ ] Configure npm trusted publishing for owner `Sabia-de`, repository `n8n-nodes-sabia`, workflow `publish.yml`.

For a first publication, confirm how the package will be created under the npm owner's account before tagging. If a bootstrap token is required, use a narrowly scoped granular token in GitHub Actions and wire `NODE_AUTH_TOKEN` only to the publish step. The workflow currently expects trusted publishing. Never publish the verification release from a local machine.

## Live n8n test record

Run the actual package in self-hosted n8n 2.x. `npm run dev` starts the development workflow; configure a public HTTPS webhook endpoint for inbound events. Use the production endpoint only after the backend is deployed. A staging test requires a separate local build directed at staging; do not publish that build.

| Test | Expected result | Result / evidence |
| --- | --- | --- |
| Credential | Correct organization and permissions; wrong, expired, revoked keys fail | Pending |
| Create | One unassigned client; no portal account or invitation | Pending |
| Get | Created client returned; another organization's client denied | Pending |
| Get Many | Search and pagination work | Pending |
| Update | Selected fields change; selected empty fields clear; other fields stay unchanged | Pending |
| Client Created | Published workflow registers a subscription and receives the event | Pending |
| Client Updated | Supported contact edit starts the correct workflow | Pending |
| Client Stage Changed | Stage change in Sabia starts the correct workflow | Pending |
| Trigger lifecycle | Deactivation removes the subscription; reactivation restores it | Pending |
| Signature rejection | Invalid signature, stale timestamp, and wrong event do not start workflow | Pending |
| Duplicate delivery | Same delivery ID is suppressed in the tested instance; downstream uses event ID for idempotency | Pending |
| Replacement key | Follow README procedure; new subscriptions work; old key fails after revocation | Pending |
| Organization lock | API denied and queued delivery cancelled; unlock resumes future events only | Pending |

Automated helper tests and mocked HTTP tests do not replace this record. A plain n8n Webhook node does not test the Sabia Trigger's signature verification or registration lifecycle.

## Dependency audit note

The September 8, 2026 lockfile audit reports 12 findings (10 moderate, 2 high) in development tooling, including `release-it` / `undici` and the n8n CLI dependency tree. The package declares no runtime dependencies and does not bundle these tools. Review upstream fixes before release; do not use `npm audit fix --force`, which currently proposes a downgrade of the n8n CLI. This audit is separate from n8n source and distribution checks.

## Publish and submit

1. Confirm the release commit is on `main`, all gates above pass, and the package version is unused on npm.
2. Create and push a tag exactly matching `package.json` (for example `0.1.0`, without a `v` prefix). This starts the Publish workflow. Tagging is a publication action.
3. Confirm GitHub Actions publishes successfully with provenance and the published-package scanner passes. If scanning fails after upload, the version is already public: fix the issue and publish a new version instead of reusing the tag.
4. Verify the npm package's source link, README, ownership, and provenance. Install the published version in a fresh self-hosted n8n instance and repeat the action and trigger smoke tests.
5. Sign in to https://creators.n8n.io/nodes and submit the published package for verification. Use the package summary above and provide any additional information the portal requests.
6. Address review feedback and publish a new version if needed. Record approval before claiming n8n Cloud availability.

n8n fetches the published npm package for review. GitHub Actions publication with provenance is required for Creator Portal submissions from May 1, 2026. Review includes technical and UX standards; publication does not guarantee approval.

Sources: [submission requirements](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/), [verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/).
