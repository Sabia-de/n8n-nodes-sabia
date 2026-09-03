const { createHash, createHmac, hkdfSync } = require('node:crypto');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareCreateRequest, prepareUpdateRequest, unwrapClientList } = require('../dist/nodes/Sabia/transport.js');
const { SabiaTrigger } = require('../dist/nodes/SabiaTrigger/SabiaTrigger.node.js');
const { isIntegrationEvent } = require('../dist/nodes/SabiaTrigger/guards.js');
const fixtures = JSON.parse(readFileSync(new URL('../contract/public-api-v1.fixtures.json', `file://${__filename}`)));
const apiKey = 'sabia_live_60000000-0000-4000-8000-000000000001.abcdefghijklmnopqrstuvwxyzABCDEFGH';
const node = { id: 'node-1', name: 'Sabia', type: 'n8n-nodes-sabia.sabia', typeVersion: 1, position: [0, 0], parameters: {} };
const baseContext = {
  getNode: () => node, getInstanceId: () => 'instance-1', getWorkflow: () => ({ id: 'workflow-1' }), getExecutionId: () => '1',
  getItemIndex: () => 0, getWorkflowDataProxy: () => ({ $thisRunIndex: 0 }),
};

test('create idempotency is stable per instance, workflow, execution, node, run and item', async () => {
  const request = { method: 'POST', url: '/clients', body: fixtures.requests.createClient };
  const first = await prepareCreateRequest.call(baseContext, request);
  assert.match(first.headers['Idempotency-Key'], /^n8n:[a-f0-9]{64}$/);
  assert.equal((await prepareCreateRequest.call(baseContext, request)).headers['Idempotency-Key'], first.headers['Idempotency-Key']);
  for (const change of [
    { getInstanceId: () => 'instance-2' }, { getWorkflow: () => ({ id: 'workflow-2' }) }, { getExecutionId: () => '2' },
    { getNode: () => ({ ...node, id: 'node-2' }) }, { getWorkflowDataProxy: () => ({ $thisRunIndex: 1 }) }, { getItemIndex: () => 1 },
  ]) assert.notEqual((await prepareCreateRequest.call({ ...baseContext, ...change }, request)).headers['Idempotency-Key'], first.headers['Idempotency-Key']);
  assert.deepEqual(first.body, fixtures.requests.createClient);
});

test('update preserves null clears, ignores absent fields and rejects empty updates', async () => {
  const result = await prepareUpdateRequest.call(baseContext, { body: { updateFields: { phone: null, firstName: '', email: ' TEST@EXAMPLE.COM ', notes: 'private' } } });
  assert.deepEqual(result.body, { firstName: null, email: 'test@example.com', phone: null });
  await assert.rejects(() => prepareUpdateRequest.call(baseContext, { body: {} }), /at least one contact field/);
  await assert.rejects(() => prepareCreateRequest.call(baseContext, { body: { phone: '123' } }), /at least one name field/);
});

test('get-many preserves item links and rejects sensitive response fields', async () => {
  const result = await unwrapClientList.call(baseContext, [{ json: fixtures.responses.clients, pairedItem: { item: 2 } }]);
  assert.deepEqual(result, [{ json: fixtures.responses.client, pairedItem: { item: 2 } }]);
  await assert.rejects(() => unwrapClientList.call(baseContext, [{ json: { data: [{ ...fixtures.responses.client, notes: 'private' }] } }]), /invalid client/);
});

test('guards reject duplicate contact changes, oversized values and unchanged phases', () => {
  const event = fixtures.events.clientUpdated;
  assert.equal(isIntegrationEvent({ ...event, data: { ...event.data, changedFields: ['phone', 'phone'] } }), false);
  assert.equal(isIntegrationEvent({ ...event, data: { ...event.data, client: { ...event.data.client, firstName: 'a'.repeat(256) } } }), false);
  const stage = fixtures.events.clientStageChanged;
  assert.equal(isIntegrationEvent({ ...stage, data: { ...stage.data, toStage: stage.data.fromStage } }), false);
});

test('webhook lifecycle looks up, creates and deletes the matching subscription', async () => {
  const trigger = new SabiaTrigger();
  const data = {};
  const requests = [];
  let missing = true;
  const context = {
    getNode: () => node,
    getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/sabia',
    getNodeParameter: () => 'client.updated',
    getWorkflowStaticData: () => data,
    helpers: { httpRequestWithAuthentication: async (_credential, request) => {
      requests.push(request);
      if (request.method === 'GET' && missing) throw { statusCode: 404 };
      return fixtures.responses.webhook;
    } },
  };
  assert.equal(await trigger.webhookMethods.default.checkExists.call(context), false);
  assert.equal(await trigger.webhookMethods.default.create.call(context), true);
  assert.equal(data.subscriptionId, fixtures.responses.webhook.id);
  missing = false;
  assert.equal(await trigger.webhookMethods.default.checkExists.call(context), true);
  assert.equal(await trigger.webhookMethods.default.delete.call(context), true);
  assert.equal(data.subscriptionId, undefined);
  assert.equal(data.seenDeliveries, undefined);
  assert.equal(requests[0].qs.targetUrlHash, createHash('sha256').update(context.getNodeWebhookUrl()).digest('hex'));
  assert.equal(requests[1].body.targetUrl, context.getNodeWebhookUrl());
  assert.equal(requests[3].url, `https://app.sabia.de/api/v1/webhooks/${fixtures.responses.webhook.id}`);
});

test('webhook lifecycle does not hide authorization or network failures', async () => {
  const trigger = new SabiaTrigger();
  const data = { subscriptionId: fixtures.responses.webhook.id };
  const context = { getNode: () => node, getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/sabia', getNodeParameter: () => 'client.updated', getWorkflowStaticData: () => data,
    helpers: { httpRequestWithAuthentication: async () => { throw { statusCode: 403, message: 'Forbidden' }; } } };
  await assert.rejects(() => trigger.webhookMethods.default.checkExists.call(context));
  await assert.rejects(() => trigger.webhookMethods.default.delete.call(context));
  assert.equal(data.subscriptionId, fixtures.responses.webhook.id);
});

test('all three signed events execute; duplicate, invalid and stale signatures do not', async () => {
  for (const event of Object.values(fixtures.events)) {
    const trigger = new SabiaTrigger();
    const rawBody = JSON.stringify(event);
    const subscriptionId = fixtures.responses.webhook.id;
    const deliveryId = '70000000-0000-4000-8000-000000000001';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const verifier = createHash('sha256').update(apiKey).digest();
    const signingKey = Buffer.from(hkdfSync('sha256', verifier, Buffer.from(subscriptionId), 'sabia/webhook-signing/v1', 32));
    const signature = `v1=${createHmac('sha256', signingKey).update(`${timestamp}.${deliveryId}.${rawBody}`).digest('hex')}`;
    const headers = { 'x-sabia-timestamp': timestamp, 'x-sabia-delivery-id': deliveryId, 'x-sabia-signature-256': signature };
    const data = { subscriptionId };
    let rejectedStatus;
    const response = { status: (status) => { rejectedStatus = status; return response; }, json: () => {} };
    const context = { getNode: () => node, getRequestObject: () => ({ rawBody: Buffer.from(rawBody) }), getHeaderData: () => headers,
      getWorkflowStaticData: () => data, getCredentials: async () => ({ apiKey }), getNodeParameter: () => event.type,
      getResponseObject: () => response, helpers: { returnJsonArray: (events) => events.map((json) => ({ json })) } };
    assert.deepEqual((await trigger.webhook.call(context)).workflowData, [[{ json: event }]]);
    assert.equal((await trigger.webhook.call(context)).noWebhookResponse, true);
    assert.equal(rejectedStatus, 409);
    headers['x-sabia-signature-256'] = 'v1=' + '0'.repeat(64);
    assert.equal((await trigger.webhook.call(context)).noWebhookResponse, true);
    assert.equal(rejectedStatus, 401);
    headers['x-sabia-signature-256'] = signature;
    headers['x-sabia-timestamp'] = String(Number(timestamp) - 301);
    assert.equal((await trigger.webhook.call(context)).noWebhookResponse, true);
    assert.equal(rejectedStatus, 401);
  }
});
