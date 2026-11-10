'use strict';

class KolivriApi {
  constructor() {
    this.name = 'kolivriApi';
    this.displayName = 'Kolivri Voice AI API';
    this.documentationUrl = 'https://kolivri.com';
    this.properties = [
      {
        displayName: 'API Base URL',
        name: 'apiUrl',
        type: 'string',
        default: 'https://api.kolivri.co.il',
        required: true,
        description: 'Base URL for Kolivri API and growth engines',
      },
      {
        displayName: 'App Engine Base URL',
        name: 'appUrl',
        type: 'string',
        default: 'https://app.kolivri.co.il',
        required: true,
        description: 'Base URL for Kolivri outbound voice campaign triggers',
      },
      {
        displayName: 'API Key',
        name: 'apiKey',
        type: 'string',
        typeOptions: {
          password: true,
        },
        default: '',
        required: true,
        description: 'Kolivri campaign or organization API key sent via x-api-key header',
      },
      {
        displayName: 'Default Webhook ID',
        name: 'defaultWebhookId',
        type: 'string',
        default: '',
        description: 'Optional default campaign webhook ID used by placeCall when webhookId is not specified on the node',
      },
    ];
    this.authenticate = {
      type: 'generic',
      properties: {
        headers: {
          'x-api-key': '={{$credentials.apiKey}}',
        },
      },
    };
  }
}

module.exports = {
  KolivriApi,
};
