import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pkgRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const { KolivriApi } = require('../dist/credentials/KolivriApi.credentials.js');
const { Kolivri } = require('../dist/nodes/Kolivri/Kolivri.node.js');

function createExecutionContext({ credentials, params, items = [{ json: {} }] }) {
  return {
    getInputData() {
      return items;
    },
    async getCredentials(credentialType) {
      assert.equal(credentialType, 'kolivriApi');
      return credentials;
    },
    getNodeParameter(name, _itemIndex, fallback) {
      if (params && Object.prototype.hasOwnProperty.call(params, name)) {
        return params[name];
      }
      return fallback;
    },
  };
}

describe('n8n-nodes-kolivri integration suite', () => {
  let server;
  let baseUrl;
  let recordedRequests = [];

  before(async () => {
    server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        let parsedBody = {};
        if (rawBody) {
          try {
            parsedBody = JSON.parse(rawBody);
          } catch {
            parsedBody = { raw: rawBody };
          }
        }

        recordedRequests.push({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: parsedBody,
        });

        const sendJson = (statusCode, payload) => {
          res.writeHead(statusCode, { 'content-type': 'application/json' });
          res.end(JSON.stringify(payload));
        };

        if (req.headers['x-api-key'] !== 'klv_test_key_99') {
          return sendJson(401, { error: 'Invalid or missing x-api-key' });
        }

        if (req.method === 'POST' && req.url.startsWith('/api/v1/engine/trigger/')) {
          const webhookId = decodeURIComponent(req.url.replace('/api/v1/engine/trigger/', ''));
          return sendJson(200, {
            callId: 'call_n8n_001',
            status: 'queued',
            webhookId,
            to: parsedBody.to,
            language: parsedBody.language,
            objective: parsedBody.objective,
          });
        }

        if (req.method === 'POST' && req.url === '/api/v1/growth/invoice-recovery/preview') {
          return sendJson(200, {
            invoices: [
              {
                invoiceId: 'INV-1001',
                customerName: 'אלפא הנדסה בע"מ',
                amountILS: 4200,
                daysOverdue: 38,
              },
            ],
            prompts: ['שלום, מדברים בשם Kolivri לגבי חשבונית INV-1001 על סך 4,200 ש"ח.'],
            economics: {
              totalRecoveredILS: 4200,
              feePct: parsedBody.feePct ?? 10,
              contingencyFeeILS: 420,
              netClientAmountILS: 3780,
            },
          });
        }

        if (req.method === 'POST' && req.url === '/api/v1/growth/trojan-caller/mission') {
          return sendJson(200, {
            valid: true,
            mission: {
              consumerName: parsedBody.consumerName,
              consumerPhone: parsedBody.consumerPhone,
              businessName: parsedBody.businessName,
              requestedService: parsedBody.requestedService,
              preferredTime: parsedBody.preferredTimeWindow,
            },
            viralFollowUp: parsedBody.callOutcome
              ? { smsSent: true, outcome: parsedBody.callOutcome.status }
              : null,
          });
        }

        if (req.method === 'POST' && req.url === '/api/v1/growth/fomo-arbitrage/race') {
          return sendJson(200, {
            race: {
              raceId: 'race_n8n_777',
              status: 'dialing',
              lead: parsedBody.lead,
              candidateCount: Array.isArray(parsedBody.directorySmbs)
                ? Math.min(parsedBody.directorySmbs.length, parsedBody.maxCandidates || 3)
                : 0,
            },
          });
        }

        if (req.method === 'POST' && req.url === '/api/v1/growth/ghost-minisite/generate') {
          return sendJson(200, {
            specs: [
              {
                businessName: parsedBody.lead?.businessName || 'מוסך הצפון',
                slug: 'mosach-hatzafon',
                kolivriPhone: parsedBody.kolivriPhone || '054-787-5670',
                heroHeadline: 'מוסך הצפון — מענה קולי חכם 24/7',
              },
            ],
          });
        }

        return sendJson(404, { error: `Unknown endpoint: ${req.method} ${req.url}` });
      });
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address();
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  beforeEach(() => {
    recordedRequests = [];
  });

  it('1. validates package.json n8n community node manifest', () => {
    const pkgJsonPath = path.join(pkgRoot, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

    assert.equal(pkg.name, 'n8n-nodes-kolivri');
    assert.equal(pkg.version, '1.0.0');
    assert.deepEqual(pkg.keywords, [
      'n8n-community-node-package',
      'kolivri',
      'voice-ai',
      'phone-call',
      'ccaas',
      'hebrew',
    ]);
    assert.equal(pkg.n8n.n8nNodesApiVersion, 1);
    assert.deepEqual(pkg.n8n.credentials, ['dist/credentials/KolivriApi.credentials.js']);
    assert.deepEqual(pkg.n8n.nodes, ['dist/nodes/Kolivri/Kolivri.node.js']);
  });

  it('2. validates KolivriApi credential class definition and defaults', () => {
    const cred = new KolivriApi();
    assert.equal(cred.name, 'kolivriApi');
    assert.equal(cred.displayName, 'Kolivri Voice AI API');
    assert.ok(Array.isArray(cred.properties));

    const byName = Object.fromEntries(cred.properties.map((p) => [p.name, p]));
    assert.equal(byName.apiUrl.default, 'https://api.kolivri.co.il');
    assert.equal(byName.appUrl.default, 'https://app.kolivri.co.il');
    assert.equal(byName.apiKey.typeOptions.password, true);
    assert.ok(Object.prototype.hasOwnProperty.call(byName, 'defaultWebhookId'));
  });

  it('3. enforces credential and parameter validation before dispatching HTTP calls', async () => {
    const node = new Kolivri();

    await assert.rejects(
      () =>
        node.execute.call(
          createExecutionContext({
            credentials: { apiUrl: baseUrl, appUrl: baseUrl, apiKey: '' },
            params: { operation: 'placeCall', to: '+972541234567', objective: 'Test' },
          })
        ),
      /apiKey/i
    );

    await assert.rejects(
      () =>
        node.execute.call(
          createExecutionContext({
            credentials: { apiUrl: 'not-a-url', appUrl: baseUrl, apiKey: 'klv_test_key_99' },
            params: { operation: 'placeCall', to: '+972541234567', objective: 'Test' },
          })
        ),
      /apiUrl/i
    );

    await assert.rejects(
      () =>
        node.execute.call(
          createExecutionContext({
            credentials: { apiUrl: baseUrl, appUrl: baseUrl, apiKey: 'klv_test_key_99', defaultWebhookId: '' },
            params: { operation: 'placeCall', webhookId: '', to: '+972541234567', objective: 'Test' },
          })
        ),
      /webhookId/i
    );

    assert.equal(recordedRequests.length, 0);
  });

  it('4. executes placeCall operation against POST /api/v1/engine/trigger/:webhookId and returns [[{ json }]]', async () => {
    const node = new Kolivri();
    const ctx = createExecutionContext({
      credentials: {
        apiUrl: baseUrl,
        appUrl: baseUrl,
        apiKey: 'klv_test_key_99',
        defaultWebhookId: 'wh_default_clinic',
      },
      params: {
        operation: 'placeCall',
        webhookId: '',
        to: '+972541234567',
        verifiedCallerId: '+97235550199',
        objective: 'Confirm tomorrow 10:00 dental cleaning with Dana',
        language: 'he',
        contactName: 'Dana Levi',
        context: '{"appointmentId":"apt_42"}',
      },
    });

    const result = await node.execute.call(ctx);
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 1);
    assert.equal(result[0].length, 1);
    assert.equal(result[0][0].json.callId, 'call_n8n_001');
    assert.equal(result[0][0].json.status, 'queued');
    assert.equal(result[0][0].json.webhookId, 'wh_default_clinic');

    assert.equal(recordedRequests.length, 1);
    assert.equal(recordedRequests[0].url, '/api/v1/engine/trigger/wh_default_clinic');
    assert.equal(recordedRequests[0].headers['x-api-key'], 'klv_test_key_99');
    assert.deepEqual(recordedRequests[0].body.context, { appointmentId: 'apt_42' });
  });

  it('5. executes invoiceRecoveryPreview operation against POST /api/v1/growth/invoice-recovery/preview', async () => {
    const node = new Kolivri();
    const ctx = createExecutionContext({
      credentials: {
        apiUrl: baseUrl,
        appUrl: baseUrl,
        apiKey: 'klv_test_key_99',
      },
      params: {
        operation: 'invoiceRecoveryPreview',
        csvText: 'invoice_id,customer_name,phone,amount_ils,days_overdue\nINV-1001,אלפא הנדסה בע"מ,0541112233,4200,38',
        organizationName: 'Kolivri',
        paymentUrl: 'https://kolivri.com/pay',
        feePct: 10,
      },
    });

    const result = await node.execute.call(ctx);
    assert.equal(result[0][0].json.economics.totalRecoveredILS, 4200);
    assert.equal(result[0][0].json.economics.contingencyFeeILS, 420);
    assert.equal(recordedRequests.length, 1);
    assert.equal(recordedRequests[0].url, '/api/v1/growth/invoice-recovery/preview');
  });

  it('6. executes trojanCallerMission operation against POST /api/v1/growth/trojan-caller/mission', async () => {
    const node = new Kolivri();
    const ctx = createExecutionContext({
      credentials: {
        apiUrl: baseUrl,
        appUrl: baseUrl,
        apiKey: 'klv_test_key_99',
      },
      params: {
        operation: 'trojanCallerMission',
        consumerName: 'Yael Cohen',
        consumerPhone: '0529876543',
        businessName: 'מרפאת שיניים ד"ר לוי',
        businessPhone: '035551122',
        requestedService: 'שיננית ובדיקה תקופתית',
        preferredTimeWindow: 'יום שלישי בין 09:00 ל-12:00',
        callOutcome: '{"status":"booked","slot":"Tuesday 10:30"}',
      },
    });

    const result = await node.execute.call(ctx);
    assert.equal(result[0][0].json.valid, true);
    assert.equal(result[0][0].json.mission.businessName, 'מרפאת שיניים ד"ר לוי');
    assert.equal(result[0][0].json.viralFollowUp.smsSent, true);
    assert.equal(recordedRequests.length, 1);
    assert.equal(recordedRequests[0].url, '/api/v1/growth/trojan-caller/mission');
  });

  it('7. executes fomoArbitrageRace operation against POST /api/v1/growth/fomo-arbitrage/race', async () => {
    const node = new Kolivri();
    const ctx = createExecutionContext({
      credentials: {
        apiUrl: baseUrl,
        appUrl: baseUrl,
        apiKey: 'klv_test_key_99',
      },
      params: {
        operation: 'fomoArbitrageRace',
        lead: JSON.stringify({
          name: 'Oren Mizrahi',
          phone: '0503334455',
          category: 'plumber',
          city: 'Tel Aviv',
        }),
        directorySmbs: JSON.stringify([
          { id: 'smb_1', name: 'אינסטלטור תל אביב 24/7', phone: '0541110001', city: 'Tel Aviv', category: 'plumber' },
          { id: 'smb_2', name: 'אבי אינסטלציה', phone: '0541110002', city: 'Tel Aviv', category: 'plumber' },
        ]),
        maxCandidates: 2,
      },
    });

    const result = await node.execute.call(ctx);
    assert.equal(result[0][0].json.race.raceId, 'race_n8n_777');
    assert.equal(result[0][0].json.race.candidateCount, 2);
    assert.equal(recordedRequests.length, 1);
    assert.equal(recordedRequests[0].url, '/api/v1/growth/fomo-arbitrage/race');
  });

  it('8. executes ghostMiniSiteGenerate operation against POST /api/v1/growth/ghost-minisite/generate', async () => {
    const node = new Kolivri();
    const ctx = createExecutionContext({
      credentials: {
        apiUrl: baseUrl,
        appUrl: baseUrl,
        apiKey: 'klv_test_key_99',
      },
      params: {
        operation: 'ghostMiniSiteGenerate',
        lead: JSON.stringify({
          businessName: 'מוסך הצפון',
          category: 'garage',
          city: 'Haifa',
          phone: '048887766',
          rating: 4.8,
        }),
        kolivriPhone: '054-787-5670',
      },
    });

    const result = await node.execute.call(ctx);
    assert.equal(Array.isArray(result[0][0].json.specs), true);
    assert.equal(result[0][0].json.specs[0].businessName, 'מוסך הצפון');
    assert.equal(result[0][0].json.specs[0].kolivriPhone, '054-787-5670');
    assert.equal(recordedRequests.length, 1);
    assert.equal(recordedRequests[0].url, '/api/v1/growth/ghost-minisite/generate');
  });
});
