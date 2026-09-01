import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { clientDescription } from './resources/client';

export class Sabia implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sabia',
		name: 'sabia',
		icon: { light: 'file:sabia.svg', dark: 'file:sabia.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create, find, read, and update Sabia clients',
		defaults: {
			name: 'Sabia',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'sabiaApi', required: true }],
		requestDefaults: {
			baseURL: 'https://app.sabia.de/api/v1',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Client',
						value: 'client',
					},
				],
				default: 'client',
			},
			...clientDescription,
		],
	};
}
