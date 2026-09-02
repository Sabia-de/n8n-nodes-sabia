// Generated from Zod. Do not edit. Contract 1.1.0; SHA-256 3e22042b065d7f48c45cd75f06eb9ef7557c45fb89ed14c0dc1f87febabb6d94.

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
export interface IntegrationError { code: string; message: string; requestId: string; details?: { clientId: string } | { retryAfterSeconds: number } | { requiredCapability: "clients:create" | "clients:read" | "clients:search" | "clients:update" | "webhooks:manage" } | { issues: Array<{ path: string; message: string }> } }
