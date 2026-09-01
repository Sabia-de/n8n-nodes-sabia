import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SabiaApi implements ICredentialType {
	name = 'sabiaApi';

	displayName = 'Sabia API';

	icon = 'file:../nodes/Sabia/sabia.svg' as const;

	documentationUrl = 'https://github.com/Sabia-de/n8n-nodes-sabia#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://app.sabia.de/api/v1',
			url: '/connection',
			method: 'GET',
		},
	};
}
