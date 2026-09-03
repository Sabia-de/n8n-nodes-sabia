import type { INodeProperties } from 'n8n-workflow';
import { prepareCreateRequest, prepareUpdateRequest, unwrapClientList } from '../../transport';

const clientCreateFields: INodeProperties[] = [
	field('First Name', 'firstName', ['create']),
	field('Last Name', 'lastName', ['create']),
	field('Display Name', 'displayName', ['create']),
	field('Email', 'email', ['create'], 'email'),
	field('Phone', 'phone', ['create']),
];

const updateFields: INodeProperties = {
	displayName: 'Update Fields',
	name: 'updateFields',
	type: 'collection',
	placeholder: 'Add Field',
	default: {},
	displayOptions: { show: { resource: ['client'], operation: ['update'] } },
	options: [
		field('First Name', 'firstName', undefined),
		field('Last Name', 'lastName', undefined),
		field('Display Name', 'displayName', undefined),
		field('Email', 'email', undefined, 'email'),
		field('Phone', 'phone', undefined),
	],
};

export const clientDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['client'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a client',
				description: 'Create an unassigned client without a portal account or invitation',
				routing: {
					request: {
						method: 'POST',
						url: '/clients',
					},
					send: { preSend: [prepareCreateRequest] },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a client',
				description: 'Get one client by ID',
				routing: { request: { method: 'GET', url: '=/clients/{{$parameter.clientId}}' } },
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many clients',
				description: 'Search clients with cursor pagination',
				routing: {
					request: { method: 'GET', url: '/clients' },
					output: { postReceive: [unwrapClientList] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a client',
				description: 'Update only the supplied contact fields',
				routing: {
					request: { method: 'PATCH', url: '=/clients/{{$parameter.clientId}}' },
					send: { preSend: [prepareUpdateRequest] },
				},
			},
		],
		default: 'create',
	},
	{
		displayName: 'Client ID',
		name: 'clientId',
		type: 'string',
		required: true,
		default: '',
		description: 'The Sabia client ID',
		displayOptions: { show: { resource: ['client'], operation: ['get', 'update'] } },
	},
	...clientCreateFields,
	updateFields,
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		description: 'Search names, normalized email, and phone',
		displayOptions: { show: { resource: ['client'], operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'query' } },
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: { show: { resource: ['client'], operation: ['getAll'] } },
		routing: {
			send: { paginate: '={{$value}}' },
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: '={{typeof $response.body.nextCursor === "string" && $response.body.nextCursor.length > 0}}',
						request: { qs: { cursor: '={{$response.body.nextCursor}}', limit: 50 } },
					},
				},
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		description: 'Max number of results to return',
		typeOptions: { minValue: 1, maxValue: 50 },
		displayOptions: { show: { resource: ['client'], operation: ['getAll'], returnAll: [false] } },
		routing: {
			send: { type: 'query', property: 'limit' },
			output: { maxResults: '={{$value}}' },
		},
	},
];

function field(
	displayName: string,
	name: string,
	operations?: string[],
	type: 'string' | 'email' = 'string',
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		...(type === 'email' ? { placeholder: 'name@example.com' } : {}),
		...(operations
			? { displayOptions: { show: { resource: ['client'], operation: operations } } }
			: {}),
		routing: { send: { type: 'body', property: name } },
	};
}
