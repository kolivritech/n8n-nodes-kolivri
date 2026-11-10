'use strict';

function normalizeBaseUrl(rawUrl, fallbackUrl, fieldName) {
  const value = rawUrl === undefined || rawUrl === null || String(rawUrl).trim() === ''
    ? fallbackUrl
    : String(rawUrl).trim();

  if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value)) {
    throw new Error(`Kolivri credentials error: "${fieldName}" must be a valid http(s) URL.`);
  }

  return value.replace(/\/+$/, '');
}

function validateCredentials(credentials) {
  if (!credentials || typeof credentials !== 'object') {
    throw new Error('Kolivri credentials error: missing "kolivriApi" credentials.');
  }

  const apiKey = typeof credentials.apiKey === 'string' ? credentials.apiKey.trim() : '';
  if (!apiKey) {
    throw new Error('Kolivri credentials error: "apiKey" is required and cannot be empty.');
  }

  const apiUrl = normalizeBaseUrl(credentials.apiUrl, 'https://api.kolivri.co.il', 'apiUrl');
  const appUrl = normalizeBaseUrl(credentials.appUrl, 'https://app.kolivri.co.il', 'appUrl');
  const defaultWebhookId = typeof credentials.defaultWebhookId === 'string'
    ? credentials.defaultWebhookId.trim()
    : '';

  return {
    apiUrl,
    appUrl,
    apiKey,
    defaultWebhookId,
  };
}

function parseJsonParameter(value, fieldName, fallbackValue) {
  if (value === undefined || value === null || value === '') {
    return fallbackValue;
  }
  if (typeof value === 'object') {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallbackValue;
    }
    try {
      return JSON.parse(trimmed);
    } catch (err) {
      throw new Error(`Kolivri parameter error: "${fieldName}" must be valid JSON (${err.message}).`);
    }
  }
  throw new Error(`Kolivri parameter error: "${fieldName}" must be a JSON string or object.`);
}

async function performPostRequest(executionContext, url, apiKey, payload) {
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'x-api-key': apiKey,
  };

  if (
    executionContext &&
    executionContext.helpers &&
    typeof executionContext.helpers.httpRequest === 'function'
  ) {
    return executionContext.helpers.httpRequest({
      method: 'POST',
      url,
      headers,
      body: payload,
      json: true,
      timeout: 15000,
    });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  const responseText = await response.text();
  let parsed = {};
  if (responseText) {
    try {
      parsed = JSON.parse(responseText);
    } catch {
      parsed = { raw: responseText };
    }
  }

  if (!response.ok) {
    const detail = parsed.error || parsed.message || responseText || 'Request failed';
    throw new Error(`Kolivri API error (${response.status}): ${detail}`);
  }

  return parsed;
}

class Kolivri {
  constructor() {
    this.description = {
      displayName: 'Kolivri',
      name: 'kolivri',
      group: ['transform'],
      version: 1,
      subtitle: '={{$parameter["operation"]}}',
      description: 'Trigger outbound Hebrew & multilingual AI voice calls and growth automation engines via Kolivri',
      defaults: {
        name: 'Kolivri',
      },
      inputs: ['main'],
      outputs: ['main'],
      credentials: [
        {
          name: 'kolivriApi',
          required: true,
        },
      ],
      properties: [
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          noDataExpression: true,
          options: [
            {
              name: 'Place Outbound AI Call',
              value: 'placeCall',
              description: 'Trigger an outbound AI voice call via POST /api/v1/engine/trigger/:webhookId',
              action: 'Place an outbound AI voice call',
            },
            {
              name: 'Invoice Recovery Preview',
              value: 'invoiceRecoveryPreview',
              description: 'Parse overdue invoices CSV and generate Hebrew recovery prompts & economics',
              action: 'Preview overdue invoice recovery calls',
            },
            {
              name: 'Trojan Caller Mission',
              value: 'trojanCallerMission',
              description: 'Build an autonomous consumer-to-SMB booking call mission and viral follow-up',
              action: 'Create a Trojan Caller mission',
            },
            {
              name: 'FOMO Arbitrage Race',
              value: 'fomoArbitrageRace',
              description: 'Launch a parallel-dial first-to-answer DTMF race across eligible SMB candidates',
              action: 'Create a FOMO arbitrage race',
            },
            {
              name: 'Ghost Mini-Site Generate',
              value: 'ghostMiniSiteGenerate',
              description: 'Generate high-converting ghost mini-site specifications from Google Maps leads',
              action: 'Generate a ghost mini-site specification',
            },
          ],
          default: 'placeCall',
        },

        // 1. placeCall parameters
        {
          displayName: 'Webhook ID',
          name: 'webhookId',
          type: 'string',
          default: '',
          placeholder: 'wh_dental_clinic_01',
          description: 'Campaign webhook ID (falls back to Default Webhook ID in credentials if left empty)',
          displayOptions: {
            show: {
              operation: ['placeCall'],
            },
          },
        },
        {
          displayName: 'Destination Phone (To)',
          name: 'to',
          type: 'string',
          required: true,
          default: '',
          placeholder: '+972541234567',
          description: 'Recipient phone number in E.164 or local Israeli format',
          displayOptions: {
            show: {
              operation: ['placeCall'],
            },
          },
        },
        {
          displayName: 'Verified Caller ID',
          name: 'verifiedCallerId',
          type: 'string',
          default: '',
          placeholder: '+97235550199',
          description: 'KYC-verified outbound caller ID on your Kolivri account',
          displayOptions: {
            show: {
              operation: ['placeCall'],
            },
          },
        },
        {
          displayName: 'Call Objective',
          name: 'objective',
          type: 'string',
          required: true,
          default: '',
          placeholder: 'Confirm tomorrow 10:00 appointment with Dana',
          description: 'Clear goal and instructions for the Kolivri AI voice agent',
          displayOptions: {
            show: {
              operation: ['placeCall'],
            },
          },
        },
        {
          displayName: 'Language',
          name: 'language',
          type: 'options',
          options: [
            { name: 'Hebrew (he)', value: 'he' },
            { name: 'English (en)', value: 'en' },
            { name: 'Arabic (ar)', value: 'ar' },
            { name: 'Russian (ru)', value: 'ru' },
            { name: 'French (fr)', value: 'fr' },
            { name: 'Spanish (es)', value: 'es' },
            { name: 'German (de)', value: 'de' },
            { name: 'Portuguese (pt)', value: 'pt' },
          ],
          default: 'he',
          description: 'Primary language for the voice agent or generated mini-site',
          displayOptions: {
            show: {
              operation: ['placeCall', 'ghostMiniSiteGenerate'],
            },
          },
        },
        {
          displayName: 'Contact Name',
          name: 'contactName',
          type: 'string',
          default: '',
          description: 'Optional name of the person being called',
          displayOptions: {
            show: {
              operation: ['placeCall'],
            },
          },
        },
        {
          displayName: 'Context (JSON)',
          name: 'context',
          type: 'json',
          default: '{}',
          description: 'Optional structured variables passed into the campaign flow',
          displayOptions: {
            show: {
              operation: ['placeCall'],
            },
          },
        },

        // 2. invoiceRecoveryPreview parameters
        {
          displayName: 'Invoices CSV Text',
          name: 'csvText',
          type: 'string',
          typeOptions: {
            rows: 5,
          },
          default: '',
          description: 'CSV text containing overdue invoices or Google Maps leads',
          displayOptions: {
            show: {
              operation: ['invoiceRecoveryPreview', 'ghostMiniSiteGenerate'],
            },
          },
        },
        {
          displayName: 'Organization Name',
          name: 'organizationName',
          type: 'string',
          default: 'Kolivri',
          description: 'Creditor organization name spoken during the recovery call',
          displayOptions: {
            show: {
              operation: ['invoiceRecoveryPreview'],
            },
          },
        },
        {
          displayName: 'Payment URL',
          name: 'paymentUrl',
          type: 'string',
          default: 'https://kolivri.com/pay',
          description: 'Payment link sent via SMS/WhatsApp during or after the call',
          displayOptions: {
            show: {
              operation: ['invoiceRecoveryPreview'],
            },
          },
        },
        {
          displayName: 'Contingency Fee (%)',
          name: 'feePct',
          type: 'number',
          default: 10,
          description: 'Success-based contingency fee percentage',
          displayOptions: {
            show: {
              operation: ['invoiceRecoveryPreview'],
            },
          },
        },
        {
          displayName: 'Recovered Amount (ILS)',
          name: 'recoveredAmountILS',
          type: 'number',
          default: 0,
          description: 'Optional override for total recovered amount in ILS',
          displayOptions: {
            show: {
              operation: ['invoiceRecoveryPreview'],
            },
          },
        },

        // 3. trojanCallerMission parameters
        {
          displayName: 'Consumer Name',
          name: 'consumerName',
          type: 'string',
          default: '',
          required: true,
          description: 'Name of the consumer requesting the appointment or quote',
          displayOptions: {
            show: {
              operation: ['trojanCallerMission'],
            },
          },
        },
        {
          displayName: 'Consumer Phone',
          name: 'consumerPhone',
          type: 'string',
          default: '',
          required: true,
          description: 'Phone number of the consumer',
          displayOptions: {
            show: {
              operation: ['trojanCallerMission'],
            },
          },
        },
        {
          displayName: 'Business Name',
          name: 'businessName',
          type: 'string',
          default: '',
          required: true,
          description: 'Target SMB name to call on behalf of the consumer',
          displayOptions: {
            show: {
              operation: ['trojanCallerMission'],
            },
          },
        },
        {
          displayName: 'Business Phone',
          name: 'businessPhone',
          type: 'string',
          default: '',
          required: true,
          description: 'Target SMB phone number',
          displayOptions: {
            show: {
              operation: ['trojanCallerMission'],
            },
          },
        },
        {
          displayName: 'Requested Service',
          name: 'requestedService',
          type: 'string',
          default: '',
          required: true,
          description: 'Service requested by the consumer (e.g. emergency plumber, dental cleaning)',
          displayOptions: {
            show: {
              operation: ['trojanCallerMission'],
            },
          },
        },
        {
          displayName: 'Preferred Time Window',
          name: 'preferredTimeWindow',
          type: 'string',
          default: '',
          description: 'Preferred date/time window for the service',
          displayOptions: {
            show: {
              operation: ['trojanCallerMission'],
            },
          },
        },
        {
          displayName: 'Notes',
          name: 'notes',
          type: 'string',
          default: '',
          description: 'Additional consumer notes for the AI agent',
          displayOptions: {
            show: {
              operation: ['trojanCallerMission'],
            },
          },
        },
        {
          displayName: 'Call Outcome (JSON)',
          name: 'callOutcome',
          type: 'json',
          default: '',
          description: 'Optional completed call outcome object to generate the SMB viral follow-up',
          displayOptions: {
            show: {
              operation: ['trojanCallerMission'],
            },
          },
        },

        // 4. fomoArbitrageRace & 5. ghostMiniSiteGenerate lead parameter
        {
          displayName: 'Lead (JSON)',
          name: 'lead',
          type: 'json',
          default: '{}',
          description: 'Lead object (used by FOMO Arbitrage Race and Ghost Mini-Site Generate)',
          displayOptions: {
            show: {
              operation: ['fomoArbitrageRace', 'ghostMiniSiteGenerate'],
            },
          },
        },
        {
          displayName: 'Directory SMBs (JSON Array)',
          name: 'directorySmbs',
          type: 'json',
          default: '[]',
          description: 'Array of candidate SMB objects for the parallel-dial FOMO arbitrage race',
          displayOptions: {
            show: {
              operation: ['fomoArbitrageRace'],
            },
          },
        },
        {
          displayName: 'Max Candidates',
          name: 'maxCandidates',
          type: 'number',
          default: 3,
          description: 'Maximum number of SMB candidates to dial in parallel',
          displayOptions: {
            show: {
              operation: ['fomoArbitrageRace'],
            },
          },
        },

        // Additional ghostMiniSiteGenerate parameters
        {
          displayName: 'Kolivri Demo Phone',
          name: 'kolivriPhone',
          type: 'string',
          default: '054-787-5670',
          description: 'Kolivri AI receptionist phone number embedded on the generated ghost mini-site',
          displayOptions: {
            show: {
              operation: ['ghostMiniSiteGenerate'],
            },
          },
        },
      ],
    };
  }

  async execute() {
    const rawCredentials = typeof this.getCredentials === 'function'
      ? await this.getCredentials('kolivriApi')
      : null;
    const credentials = validateCredentials(rawCredentials);

    const items = typeof this.getInputData === 'function' ? this.getInputData() : [{ json: {} }];
    const itemCount = Array.isArray(items) && items.length > 0 ? items.length : 1;
    const returnData = [];

    for (let i = 0; i < itemCount; i += 1) {
      const getParam = (name, fallback) => {
        if (typeof this.getNodeParameter === 'function') {
          const val = this.getNodeParameter(name, i, fallback);
          return val === undefined ? fallback : val;
        }
        return fallback;
      };

      const operation = getParam('operation', 'placeCall');
      let response;

      if (operation === 'placeCall') {
        const nodeWebhookId = String(getParam('webhookId', '') || '').trim();
        const webhookId = nodeWebhookId || credentials.defaultWebhookId;
        if (!webhookId) {
          throw new Error('Kolivri placeCall error: "webhookId" parameter or credential "defaultWebhookId" is required.');
        }

        const to = String(getParam('to', '') || '').trim();
        if (!to) {
          throw new Error('Kolivri placeCall error: "to" phone number is required.');
        }

        const objective = String(getParam('objective', '') || '').trim();
        if (!objective) {
          throw new Error('Kolivri placeCall error: "objective" is required.');
        }

        const verifiedCallerId = String(getParam('verifiedCallerId', '') || '').trim();
        const language = String(getParam('language', 'he') || 'he').trim().toLowerCase();
        const contactName = String(getParam('contactName', '') || '').trim();
        const context = parseJsonParameter(getParam('context', {}), 'context', {});

        const payload = {
          to,
          verifiedCallerId: verifiedCallerId || undefined,
          objective,
          language,
          contactName: contactName || undefined,
          context,
          source: 'n8n-nodes-kolivri',
        };

        const endpoint = `${credentials.appUrl}/api/v1/engine/trigger/${encodeURIComponent(webhookId)}`;
        response = await performPostRequest(this, endpoint, credentials.apiKey, payload);
      } else if (operation === 'invoiceRecoveryPreview') {
        const csvText = getParam('csvText', undefined);
        const organizationName = getParam('organizationName', undefined);
        const paymentUrl = getParam('paymentUrl', undefined);
        const feePct = getParam('feePct', undefined);
        const recoveredAmountILS = getParam('recoveredAmountILS', undefined);

        const payload = {};
        if (csvText !== undefined && csvText !== '') payload.csvText = csvText;
        if (organizationName !== undefined && organizationName !== '') payload.organizationName = organizationName;
        if (paymentUrl !== undefined && paymentUrl !== '') payload.paymentUrl = paymentUrl;
        if (feePct !== undefined && feePct !== '') payload.feePct = Number(feePct);
        if (recoveredAmountILS !== undefined && recoveredAmountILS !== null && recoveredAmountILS !== '' && (Number(recoveredAmountILS) > 0 || !payload.csvText)) {
          payload.recoveredAmountILS = Number(recoveredAmountILS);
        }

        const endpoint = `${credentials.apiUrl}/api/v1/growth/invoice-recovery/preview`;
        response = await performPostRequest(this, endpoint, credentials.apiKey, payload);
      } else if (operation === 'trojanCallerMission') {
        const consumerName = String(getParam('consumerName', '') || '').trim();
        const consumerPhone = String(getParam('consumerPhone', '') || '').trim();
        const businessName = String(getParam('businessName', '') || '').trim();
        const businessPhone = String(getParam('businessPhone', '') || '').trim();
        const requestedService = String(getParam('requestedService', '') || '').trim();
        const preferredTimeWindow = String(getParam('preferredTimeWindow', '') || '').trim();
        const notes = String(getParam('notes', '') || '').trim();
        const rawCallOutcome = getParam('callOutcome', undefined);
        const callOutcome = parseJsonParameter(rawCallOutcome, 'callOutcome', undefined);

        const payload = {
          consumerName,
          consumerPhone,
          businessName,
          businessPhone,
          requestedService,
          preferredTimeWindow: preferredTimeWindow || undefined,
          notes: notes || undefined,
          callOutcome: callOutcome || undefined,
        };

        const endpoint = `${credentials.apiUrl}/api/v1/growth/trojan-caller/mission`;
        response = await performPostRequest(this, endpoint, credentials.apiKey, payload);
      } else if (operation === 'fomoArbitrageRace') {
        const lead = parseJsonParameter(getParam('lead', {}), 'lead', {});
        const directorySmbs = parseJsonParameter(getParam('directorySmbs', []), 'directorySmbs', []);
        const maxCandidatesRaw = getParam('maxCandidates', undefined);

        const payload = {
          lead,
          directorySmbs,
        };
        if (maxCandidatesRaw !== undefined && maxCandidatesRaw !== '') {
          payload.maxCandidates = Number(maxCandidatesRaw);
        }

        const endpoint = `${credentials.apiUrl}/api/v1/growth/fomo-arbitrage/race`;
        response = await performPostRequest(this, endpoint, credentials.apiKey, payload);
      } else if (operation === 'ghostMiniSiteGenerate') {
        const csvText = getParam('csvText', undefined);
        const rawLead = getParam('lead', undefined);
        const kolivriPhone = getParam('kolivriPhone', undefined);
        const language = getParam('language', undefined);

        const payload = {};
        if (typeof csvText === 'string' && csvText.trim() !== '') {
          payload.csvText = csvText;
        }
        const parsedLead = parseJsonParameter(rawLead, 'lead', undefined);
        if (parsedLead && typeof parsedLead === 'object' && Object.keys(parsedLead).length > 0) {
          payload.lead = parsedLead;
        }
        if (kolivriPhone !== undefined && String(kolivriPhone).trim() !== '') {
          payload.kolivriPhone = String(kolivriPhone).trim();
        }
        if (language !== undefined && String(language).trim() !== '') {
          payload.language = String(language).trim();
        }

        const endpoint = `${credentials.apiUrl}/api/v1/growth/ghost-minisite/generate`;
        response = await performPostRequest(this, endpoint, credentials.apiKey, payload);
      } else {
        throw new Error(`Kolivri node error: unsupported operation "${operation}".`);
      }

      returnData.push({
        json: response,
      });
    }

    return [returnData];
  }
}

module.exports = {
  Kolivri,
};
