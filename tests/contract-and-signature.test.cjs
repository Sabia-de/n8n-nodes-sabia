const { createHash, createHmac, hkdfSync } = require('node:crypto');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');
const { isIntegrationEvent } = require('../dist/nodes/SabiaTrigger/guards.js');
const { hashWebhookTarget, verifySabiaSignature } = require('../dist/nodes/SabiaTrigger/crypto.js');

const fixtures = JSON.parse(readFileSync(new URL('../contract/public-api-v1.fixtures.json', `file://${__filename}`)));
const apiKey = 'sabia_live_60000000-0000-4000-8000-000000000001.abcdefghijklmnopqrstuvwxyzABCDEFGH';
const subscriptionId = '30000000-0000-4000-8000-000000000001';
const deliveryId = '70000000-0000-4000-8000-000000000001';
const timestamp = '1788253200';

test('accepts every generated event fixture and rejects sensitive additions', () => {
	for (const event of Object.values(fixtures.events)) assert.equal(isIntegrationEvent(event), true);
	assert.equal(isIntegrationEvent({ ...fixtures.events.clientUpdated, data: { ...fixtures.events.clientUpdated.data, notes: 'secret' } }), false);
	assert.equal(isIntegrationEvent({ ...fixtures.events.clientUpdated, finance: { income: 1000 } }), false);
});

test('verifies the backend signing contract and rejects replay-window drift', () => {
	const rawBody = JSON.stringify(fixtures.events.clientUpdated);
	const verifier = createHash('sha256').update(apiKey).digest();
	const key = Buffer.from(hkdfSync('sha256', verifier, Buffer.from(subscriptionId), 'sabia/webhook-signing/v1', 32));
	const signature = `v1=${createHmac('sha256', key).update(`${timestamp}.${deliveryId}.${rawBody}`).digest('hex')}`;
	assert.equal(verifySabiaSignature({ apiKey, subscriptionId, deliveryId, timestamp, rawBody, signature, nowSeconds: Number(timestamp) + 299 }), true);
	assert.equal(verifySabiaSignature({ apiKey, subscriptionId, deliveryId, timestamp, rawBody, signature, nowSeconds: Number(timestamp) + 301 }), false);
	assert.equal(verifySabiaSignature({ apiKey, subscriptionId, deliveryId, timestamp, rawBody: `${rawBody} `, signature, nowSeconds: Number(timestamp) }), false);
});

test('uses a URL fingerprint for webhook existence checks', () => {
	assert.equal(hashWebhookTarget('https://n8n.example.com/webhook/sabia'), '9e65ddd942ae863aff480fd3ed454a72a9d6909297498c0b62a7d72bad5e21fc');
});
