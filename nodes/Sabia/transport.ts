import { createHash } from 'node:crypto';
import {
	NodeOperationError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type INodeExecutionData,
} from 'n8n-workflow';
import { isClientRecord } from '../SabiaTrigger/guards';

const CONTACT_FIELDS = ['firstName', 'lastName', 'displayName', 'email', 'phone'] as const;

export async function prepareCreateRequest(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = cleanContactBody(request.body as IDataObject, false);
	if (!body.firstName && !body.lastName && !body.displayName && !body.email) {
		throw new NodeOperationError(this.getNode(), 'Enter at least one name field or an email address.');
	}
	const itemIndex = this.getItemIndex();
	const idempotencyKey = createHash('sha256').update(JSON.stringify([
		this.getInstanceId(), this.getWorkflow().id, this.getExecutionId(), this.getNode().id,
		this.getWorkflowDataProxy(itemIndex).$thisRunIndex, itemIndex,
	])).digest('hex');
	return { ...request, headers: { ...request.headers, 'Idempotency-Key': `n8n:${idempotencyKey}` }, body };
}

export async function prepareUpdateRequest(
	this: IExecuteSingleFunctions,
	request: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = cleanContactBody(request.body as IDataObject, true);
	if (Object.keys(body).length === 0) {
		throw new NodeOperationError(this.getNode(), 'Add at least one contact field to update.');
	}
	return { ...request, body };
}

export async function unwrapClientList(
	this: IExecuteSingleFunctions,
	data: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const output: INodeExecutionData[] = [];
	for (const item of data) {
		const clients = item.json.data;
		if (!Array.isArray(clients)) {
			throw new NodeOperationError(this.getNode(), 'Sabia returned an invalid client list.');
		}
		for (const client of clients) {
			if (!isClientRecord(client)) throw new NodeOperationError(this.getNode(), 'Sabia returned an invalid client.');
			output.push({ ...item, json: client as unknown as IDataObject });
		}
	}
	return output;
}

function cleanContactBody(body: IDataObject, clearEmpty: boolean): IDataObject {
	const source = body.updateFields && typeof body.updateFields === 'object' ? (body.updateFields as IDataObject) : body;
	const result: IDataObject = {};
	for (const field of CONTACT_FIELDS) {
		if (!(field in source)) continue;
		const value = source[field];
		if (value === null && clearEmpty) { result[field] = null; continue; }
		if (typeof value !== 'string') continue;
		const trimmed = value.trim();
		if (trimmed) result[field] = field === 'email' ? trimmed.toLowerCase() : trimmed;
		else if (clearEmpty) result[field] = null;
	}
	return result;
}
