// Generated from Zod. Do not edit. Contract 1.0.0; SHA-256 2ae021b628f9035fb9534e6cfbf43a15a45d59fd1657605a21fec5c0559e6339.

export type ApiVersion = "v1";
export type IntegrationEventType = "client.created" | "client.updated" | "client.stage_changed";
export interface Organization { id: string; name: string; slug: string }
export interface ClientContact { id: string; firstName: string | null; lastName: string | null; displayName: string | null; email: string | null; phone: string | null }
export interface Client extends ClientContact { createdAt: string; updatedAt: string }
export interface Connection { apiVersion: ApiVersion; organization: Organization; capabilities: Array<"clients:create" | "clients:read" | "clients:search" | "clients:update" | "webhooks:manage"> }
export interface ClientCreatedEvent { id: string; type: "client.created"; apiVersion: ApiVersion; occurredAt: string; organization: Organization; data: { client: ClientContact } }
export interface ClientUpdatedEvent { id: string; type: "client.updated"; apiVersion: ApiVersion; occurredAt: string; organization: Organization; data: { client: ClientContact; changedFields: Array<"firstName" | "lastName" | "displayName" | "email" | "phone"> } }
export interface ClientStageChangedEvent { id: string; type: "client.stage_changed"; apiVersion: ApiVersion; occurredAt: string; organization: Organization; data: { client: ClientContact; fromStage: { slug: string; label: string }; toStage: { slug: string; label: string } } }
export type IntegrationEvent = ClientCreatedEvent | ClientUpdatedEvent | ClientStageChangedEvent;
export interface IntegrationError { code: string; message: string; requestId: string; details?: { clientId: string } | { retryAfterSeconds: number } | { issues: Array<{ path: string; message: string }> } }
