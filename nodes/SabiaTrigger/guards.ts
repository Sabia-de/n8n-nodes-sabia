import type { IntegrationEvent } from './generated/public-api-v1.types';

const CONTACT_KEYS = ['id', 'firstName', 'lastName', 'displayName', 'email', 'phone'];
const EVENT_KEYS = ['id', 'type', 'apiVersion', 'occurredAt', 'organization', 'data'];

export function isIntegrationEvent(value: unknown): value is IntegrationEvent {
	if (!isObject(value) || !hasExactKeys(value, EVENT_KEYS)) return false;
	if (!isUuid(value.id) || value.apiVersion !== 'v1' || !isTimestamp(value.occurredAt)) return false;
	if (!isOrganization(value.organization) || !isObject(value.data)) return false;

	if (value.type === 'client.created') {
		return hasExactKeys(value.data, ['client']) && isClient(value.data.client);
	}
	if (value.type === 'client.updated') {
		return (
			hasExactKeys(value.data, ['client', 'changedFields']) &&
			isClient(value.data.client) &&
			Array.isArray(value.data.changedFields) &&
			value.data.changedFields.length > 0 &&
			value.data.changedFields.every((field) =>
				['firstName', 'lastName', 'displayName', 'email', 'phone'].includes(String(field)),
			)
		);
	}
	if (value.type === 'client.stage_changed') {
		return (
			hasExactKeys(value.data, ['client', 'fromStage', 'toStage']) &&
			isClient(value.data.client) &&
			isStage(value.data.fromStage) &&
			isStage(value.data.toStage)
		);
	}
	return false;
}

function isClient(value: unknown): boolean {
	if (!isObject(value) || !hasExactKeys(value, CONTACT_KEYS) || !isUuid(value.id)) return false;
	return (
		isNullableString(value.firstName) &&
		isNullableString(value.lastName) &&
		isNullableString(value.displayName) &&
		isNullableString(value.email) &&
		isNullableString(value.phone)
	);
}

function isOrganization(value: unknown): boolean {
	return (
		isObject(value) &&
		hasExactKeys(value, ['id', 'name', 'slug']) &&
		isUuid(value.id) &&
		isNonEmptyString(value.name) &&
		isNonEmptyString(value.slug)
	);
}

function isStage(value: unknown): boolean {
	return isObject(value) && hasExactKeys(value, ['slug', 'label']) && isNonEmptyString(value.slug) && isNonEmptyString(value.label);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isNullableString(value: unknown): boolean {
	return value === null || (typeof value === 'string' && value.length > 0 && value.length <= 320);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0 && value.length <= 320;
}

function isUuid(value: unknown): value is string {
	return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}

function isTimestamp(value: unknown): value is string {
	return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
