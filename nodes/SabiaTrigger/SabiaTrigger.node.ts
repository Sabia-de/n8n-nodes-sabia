import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IHookFunctions,
	type IHttpRequestOptions,
	type INodeType,
	type INodeTypeDescription,
	type JsonObject,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';
import { hashWebhookTarget, verifySabiaSignature } from './crypto';
import { isIntegrationEvent } from './guards';
import type { WebhookSubscriptionResult } from './generated/public-api-v1.types';

const API_BASE_URL = 'https://app.sabia.de/api/v1';

export class SabiaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sabia Trigger',
		name: 'sabiaTrigger',
		icon: { light: 'file:../Sabia/sabia.svg', dark: 'file:../Sabia/sabia.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when a Sabia client event occurs',
		defaults: { name: 'Sabia Trigger' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'sabiaApi', required: true }],
		webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' }],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Client Created', value: 'client.created', description: 'Triggered when a client is created' },
					{ name: 'Client Stage Changed', value: 'client.stage_changed', description: 'Triggered after a real client phase change' },
					{ name: 'Client Updated', value: 'client.updated', description: 'Triggered when a supported contact field changes' },
				],
				default: 'client.created',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) return false;
				const event = this.getNodeParameter('event') as string;
				try {
					const subscription = await sabiaApiRequest.call(this, 'GET', '/webhooks', undefined, {
						eventType: event,
						targetUrlHash: hashWebhookTarget(webhookUrl),
					});
					if (!isSubscription(subscription) || subscription.eventType !== event) {
						throw new NodeOperationError(this.getNode(), 'Sabia returned an invalid webhook subscription.');
					}
					this.getWorkflowStaticData('node').subscriptionId = subscription.id;
					return true;
				} catch (error) {
					if (httpCode(error) === 404) {
						delete this.getWorkflowStaticData('node').subscriptionId;
						return false;
					}
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl || !webhookUrl.startsWith('https://')) {
					throw new NodeOperationError(this.getNode(), 'Sabia requires a public HTTPS webhook URL.');
				}
				const subscription = await sabiaApiRequest.call(this, 'POST', '/webhooks', {
					eventType: this.getNodeParameter('event'),
					targetUrl: webhookUrl,
				});
				if (!isSubscription(subscription) || subscription.eventType !== this.getNodeParameter('event')) {
					throw new NodeOperationError(this.getNode(), 'Sabia returned an invalid webhook subscription.');
				}
				const webhookData = this.getWorkflowStaticData('node');
				webhookData.subscriptionId = subscription.id;
				webhookData.seenDeliveries = {};
				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const subscriptionId = webhookData.subscriptionId;
				if (typeof subscriptionId !== 'string') return true;
				try {
					await sabiaApiRequest.call(this, 'DELETE', `/webhooks/${subscriptionId}`);
				} catch (error) {
					if (httpCode(error) !== 404) throw new NodeApiError(this.getNode(), error as JsonObject);
				}
				delete webhookData.subscriptionId;
				delete webhookData.seenDeliveries;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		if (!request.rawBody) await request.readRawBody();
		const rawBody = request.rawBody?.toString('utf8') ?? '';
		const headers = this.getHeaderData();
		const timestamp = firstHeader(headers['x-sabia-timestamp']);
		const deliveryId = firstHeader(headers['x-sabia-delivery-id']);
		const signature = firstHeader(headers['x-sabia-signature-256']);
		const webhookData = this.getWorkflowStaticData('node');
		const subscriptionId = webhookData.subscriptionId;
		const credentials = await this.getCredentials('sabiaApi');

		if (
			typeof subscriptionId !== 'string' ||
			typeof credentials.apiKey !== 'string' ||
			!verifySabiaSignature({ apiKey: credentials.apiKey, subscriptionId, timestamp, deliveryId, rawBody, signature })
		) {
			return rejectWebhook(this, 401, 'Invalid webhook signature.');
		}

		let event: unknown;
		try {
			event = JSON.parse(rawBody);
		} catch {
			return rejectWebhook(this, 400, 'Invalid JSON payload.');
		}
		if (!isIntegrationEvent(event) || event.type !== this.getNodeParameter('event')) {
			return rejectWebhook(this, 400, 'Invalid Sabia event.');
		}
		if (hasSeenDelivery(webhookData, deliveryId)) {
			return rejectWebhook(this, 409, 'Webhook delivery already received.');
		}

		return { workflowData: [this.helpers.returnJsonArray([event as unknown as IDataObject])] };
	}
}

async function sabiaApiRequest(
	this: IHookFunctions,
	method: IHttpRequestOptions['method'],
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
): Promise<unknown> {
	return this.helpers.httpRequestWithAuthentication.call(this, 'sabiaApi', {
		method,
		url: `${API_BASE_URL}${path}`,
		body,
		qs,
		json: true,
	});
}

function isSubscription(value: unknown): value is WebhookSubscriptionResult {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const data = value as Record<string, unknown>;
	return Object.keys(data).sort().join(',') === 'createdAt,eventType,id,status' &&
		typeof data.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(data.id) &&
		typeof data.eventType === 'string' && ['client.created', 'client.updated', 'client.stage_changed'].includes(data.eventType) &&
		data.status === 'active' && typeof data.createdAt === 'string' && Number.isFinite(Date.parse(data.createdAt));
}

function httpCode(error: unknown): number | null {
	if (!error || typeof error !== 'object') return null;
	const value = error as { httpCode?: string | number; statusCode?: number };
	return Number(value.httpCode ?? value.statusCode) || null;
}

function firstHeader(value: string | string[] | undefined): string {
	return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function hasSeenDelivery(webhookData: IDataObject, deliveryId: string): boolean {
	const now = Math.floor(Date.now() / 1_000);
	const current =
		webhookData.seenDeliveries && typeof webhookData.seenDeliveries === 'object'
			? (webhookData.seenDeliveries as Record<string, number>)
			: {};
	for (const [id, seenAt] of Object.entries(current)) {
		if (!Number.isFinite(seenAt) || now - seenAt > 300) delete current[id];
	}
	if (current[deliveryId]) return true;
	current[deliveryId] = now;
	webhookData.seenDeliveries = current;
	return false;
}

function rejectWebhook(context: IWebhookFunctions, status: number, message: string): IWebhookResponseData {
	context.getResponseObject().status(status).json({ error: message });
	return { noWebhookResponse: true };
}
