import { createHash, createHmac, hkdfSync, timingSafeEqual } from 'node:crypto';

const WEBHOOK_INFO = 'sabia/webhook-signing/v1';

export function hashWebhookTarget(targetUrl: string): string {
	return createHash('sha256').update(targetUrl).digest('hex');
}

export function verifySabiaSignature(input: {
	apiKey: string;
	subscriptionId: string;
	timestamp: string;
	deliveryId: string;
	rawBody: string;
	signature: string;
	nowSeconds?: number;
}): boolean {
	const timestamp = Number(input.timestamp);
	const now = input.nowSeconds ?? Math.floor(Date.now() / 1_000);
	if (!Number.isInteger(timestamp) || Math.abs(now - timestamp) > 300) return false;
	if (!/^v1=[0-9a-f]{64}$/.test(input.signature)) return false;
	if (!/^[0-9a-f-]{36}$/.test(input.subscriptionId) || !/^[0-9a-f-]{36}$/.test(input.deliveryId)) return false;

	const verifier = createHash('sha256').update(input.apiKey).digest();
	const key = Buffer.from(
		hkdfSync('sha256', verifier, Buffer.from(input.subscriptionId), WEBHOOK_INFO, 32),
	);
	const expected = createHmac('sha256', key)
		.update(`${input.timestamp}.${input.deliveryId}.${input.rawBody}`)
		.digest('hex');
	return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(input.signature.slice(3), 'hex'));
}
