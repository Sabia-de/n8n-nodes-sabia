import type { Client as ClientRecord, IntegrationEvent } from './generated/public-api-v1.types';

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
			value.data.changedFields.length <= 5 &&
			new Set(value.data.changedFields).size === value.data.changedFields.length &&
			value.data.changedFields.every((field) =>
				typeof field === 'string' && ['firstName', 'lastName', 'displayName', 'email', 'phone'].includes(field),
			)
		);
	}
	if (value.type === 'client.stage_changed') {
		return (
			hasExactKeys(value.data, ['client', 'fromStage', 'toStage']) &&
			isClient(value.data.client) &&
			isStage(value.data.fromStage) &&
			isStage(value.data.toStage) &&
			(value.data.fromStage as Record<string, unknown>).slug !== (value.data.toStage as Record<string, unknown>).slug
		);
	}
	return false;
}

export function isClientRecord(value: unknown): value is ClientRecord {
	if (!isObject(value) || !hasExactKeys(value, [...CONTACT_KEYS, 'createdAt', 'updatedAt'])) return false;
	const { createdAt, updatedAt, ...contact } = value;
	return isClient(contact) && isTimestamp(createdAt) && isTimestamp(updatedAt);
}

function isClient(value: unknown): boolean {
	if (!isObject(value) || !hasExactKeys(value, CONTACT_KEYS) || !isUuid(value.id)) return false;
	return (
		isNullableString(value.firstName) &&
		isNullableString(value.lastName) &&
		isNullableString(value.displayName) &&
		isNullableString(value.email, 320) &&
		isNullableString(value.phone)
	);
}

function isOrganization(value: unknown): boolean {
	return (
		isObject(value) &&
		hasExactKeys(value, ['id', 'name', 'slug']) &&
		isUuid(value.id) &&
		isNonEmptyString(value.name, 160) &&
		isNonEmptyString(value.slug, 160)
	);
}

function isStage(value: unknown): boolean {
	return isObject(value) && hasExactKeys(value, ['slug', 'label']) && isNonEmptyString(value.slug, 100) && isNonEmptyString(value.label, 160);
}

function isObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
	const actual = Object.keys(value).sort();
	const expected = [...keys].sort();
	return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isNullableString(value: unknown, maximum = 255): boolean {
	return value === null || (typeof value === 'string' && value.trim().length > 0 && value.length <= maximum);
}

function isNonEmptyString(value: unknown, maximum: number): value is string {
	return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}

function isUuid(value: unknown): value is string {
	return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}

function isTimestamp(value: unknown): value is string {
	return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
}
