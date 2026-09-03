# n8n-nodes-sabia

This community package connects [Sabia](https://sabia.de) to n8n. It lets a workflow manage Sabia clients and start from Sabia client events.

The package contains two node types:

- **Sabia** for client actions.
- **Sabia Trigger** for signed webhook events.

## Installation

After npm publication, self-hosted operators can install `n8n-nodes-sabia` from **Settings → Community Nodes**. See the [community node installation guide](https://docs.n8n.io/integrations/community-nodes/installation/). n8n Cloud requires community-node verification; publication alone does not make the package available there.

## Credentials

Ask a Sabia platform administrator to create a named integration key for your organization:

1. Open the organization in Sabia platform admin.
2. Select **Integrationen**.
3. Select only the client and trigger permissions that the workflow needs.
4. Select a validity period and create the key. Sabia shows the full key once.
5. In n8n, create **Sabia API** credentials and paste that key.

The credential connects to `https://app.sabia.de/api/v1`. It asks only for the API key. The credential test returns the linked organization and available capabilities.

Treat the API key as a secret. Replace it before its expiry date. Revoke it in Sabia to stop API access and disable all webhook subscriptions linked to that key.

## Operations

The **Sabia** node supports the Client resource:

- Create an unassigned client.
- Get one client.
- Get many clients with search and cursor pagination.
- Update supplied contact fields. An empty selected field clears it.

Creating a client does not create a portal user, send an invitation, or assign an advisor.

The **Sabia Trigger** node supports:

- Client Created
- Client Updated
- Client Stage Changed

n8n registers and removes the remote webhook when you activate or deactivate the workflow. The trigger checks the HMAC signature, five-minute timestamp window, event schema, selected event type, and duplicate delivery ID before it starts the workflow.

Delivery is at least once. The duplicate check uses workflow static data; it is not a global atomic lock across n8n workers or restarts. Make downstream writes idempotent using the event `id`. Retrying a failed n8n execution as a new execution also creates a new client-request idempotency key; use Find/Get Many before Create if you need deduplication across separate executions.

## Example workflows

Import the examples from [`examples/`](examples/):

- `create-client.json` creates a Sabia client from incoming workflow data.
- `client-updated-trigger.json` starts when a supported Sabia client contact field changes.

## Compatibility

This package supports n8n 2.x and Node.js 22 or newer. CI tests n8n 2.0.0 and the current stable release.

## Contract

The generated files in [`contract/`](contract/) come from Sabia's canonical Zod schemas. `contract.json` records contract version `1.1.0` and its SHA-256 checksum. The node has no runtime dependencies; Sabia remains the runtime validation authority and the trigger uses focused zero-dependency guards.

## License

[MIT](LICENSE)
