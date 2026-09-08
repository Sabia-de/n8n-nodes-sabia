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
2. Select the **Integrations** tab (labelled **Integrationen** in German) and enable API access for the organization. Only platform administrators can see and change these controls.
3. Select only the client and trigger permissions that the workflow needs.
4. Select a validity period and create the key. Sabia shows the full key once.
5. In n8n, create **Sabia API** credentials and paste that key.

The credential connects to `https://app.sabia.de/api/v1`. It asks only for the API key. The credential test returns the linked organization and available capabilities.

Treat the API key as a secret. Replace it before its expiry date. Revoke it in Sabia to stop API access and disable all webhook subscriptions linked to that key.

### Replace a lost or expiring key

The full key cannot be recovered. A platform administrator can prepare a replacement in the Integrations tab, then create it with the required permissions.

1. Keep the old key active while you prepare the replacement, unless it is compromised.
2. Deactivate affected n8n workflows while their old credentials still work, so n8n can remove the old subscriptions.
3. Replace the key in each affected n8n credential and test the credential.
4. Reactivate the workflows. This registers new subscriptions for the replacement key.
5. Confirm delivery, then revoke the old key in Sabia.

Plan a short maintenance window: changes made while triggers are inactive are not automatically replayed. If the old key is lost or revoked, remove any remaining old subscriptions through Sabia's admin UI.

### Stop access for an organization

A platform administrator can disable API access in the Integrations tab. This blocks API calls and new keys, stops event capture, and cancels queued deliveries. A request already sent cannot be recalled. Enabling access again allows valid keys and active subscriptions to work for future events; cancelled events are not replayed.

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

Use a public HTTPS webhook URL reachable by Sabia. For self-hosted n8n, configure its external webhook URL before activating a trigger. You do not need to register the same URL manually in Sabia.

n8n registers and removes the remote webhook when you activate or deactivate the workflow. The trigger checks the HMAC signature, five-minute timestamp window, event schema, selected event type, and duplicate delivery ID before it starts the workflow.

Delivery is at least once. The duplicate check uses workflow static data; it is not a global atomic lock across n8n workers or restarts. Make downstream writes idempotent using the event `id`. Retrying a failed n8n execution as a new execution also creates a new client-request idempotency key; use Find/Get Many before Create if you need deduplication across separate executions.

## Example workflows

Import the examples from [`examples/`](examples/):

- `create-client.json` creates a Sabia client from incoming workflow data.
- `client-updated-trigger.json` starts when a supported Sabia client contact field changes.

## Compatibility

This package supports n8n 2.x and Node.js 22 or newer. CI tests n8n 2.0.0 and the current stable release.

## Contract

The generated files in [`contract/`](contract/) come from Sabia's canonical Zod schemas. `contract.json` records contract version `1.1.1` and its SHA-256 checksum. The node has no runtime dependencies; Sabia remains the runtime validation authority and the trigger uses focused zero-dependency guards.

## License

[MIT](LICENSE)

## Release and verification

Maintainers: follow the [release checklist](docs/release.md) for the live workflow tests, npm publication, and n8n verification submission. npm publication and n8n verification are separate steps.
