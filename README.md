# n8n-nodes-kolivri

Official **n8n Community Node** for [Kolivri](https://kolivri.com) (`app.kolivri.co.il` / `api.kolivri.co.il`) — trigger low-latency Hebrew and multilingual AI phone calls and automate SMB growth workflows directly inside n8n.

---

## Installation (n8n Community Nodes)

### Option 1: Install via the n8n GUI (Recommended)

1. Open your n8n instance and navigate to **Settings → Community Nodes**.
2. Click **Install a community node**.
3. Enter the npm package name:
   ```text
   n8n-nodes-kolivri
   ```
4. Check the acknowledgment box and click **Install**.

### Option 2: Install via CLI / Docker Environment

For self-hosted Docker deployments, add `n8n-nodes-kolivri` to your custom nodes directory:

```bash
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install n8n-nodes-kolivri
```

Restart n8n so the new node (`Kolivri`) and credential (`Kolivri Voice AI API`) are registered.

---

## Credentials Configuration (`Kolivri Voice AI API`)

Create a new **Kolivri Voice AI API** (`kolivriApi`) credential in n8n:

| Field | Default | Description |
|---|---|---|
| **API Base URL** (`apiUrl`) | `https://api.kolivri.co.il` | Base URL for Kolivri API & Growth Engines (`/api/v1/growth/*`) |
| **App Engine Base URL** (`appUrl`) | `https://app.kolivri.co.il` | Base URL for Campaign Engine outbound call webhooks (`/api/v1/engine/trigger/:webhookId`) |
| **API Key** (`apiKey`) | *(Required)* | Campaign or Organization API key sent in the `x-api-key` header |
| **Default Webhook ID** (`defaultWebhookId`) | *(Optional)* | Fallback campaign webhook ID when `webhookId` is omitted on a `placeCall` node |

---

## Supported Operations

1. **Place Outbound AI Call (`placeCall`)**
   - Calls `POST ${appUrl}/api/v1/engine/trigger/${webhookId}`
   - Dispatches an outbound AI voice call with `to`, `verifiedCallerId`, `objective`, `language` (`he`, `en`, `ar`, `ru`, `fr`, `es`, `de`, `pt`), `contactName`, and `context`.
2. **Invoice Recovery Preview (`invoiceRecoveryPreview`)**
   - Calls `POST ${apiUrl}/api/v1/growth/invoice-recovery/preview`
   - Parses overdue accounting CSVs, selects behavioral nudges, generates Hebrew recovery call prompts, and calculates contingency economics.
3. **Trojan Caller Mission (`trojanCallerMission`)**
   - Calls `POST ${apiUrl}/api/v1/growth/trojan-caller/mission`
   - Builds an autonomous consumer-to-SMB booking mission and optional SMB viral follow-up payload.
4. **FOMO Arbitrage Race (`fomoArbitrageRace`)**
   - Calls `POST ${apiUrl}/api/v1/growth/fomo-arbitrage/race`
   - Selects eligible candidate SMBs for a lead and initializes a parallel-dial DTMF claim race.
5. **Ghost Mini-Site Generate (`ghostMiniSiteGenerate`)**
   - Calls `POST ${apiUrl}/api/v1/growth/ghost-minisite/generate`
   - Generates instant Hebrew/English mini-site specifications from a Google Maps lead object or CSV export.

---

## Running Tests

```bash
node --test n8n-nodes-kolivri/test/n8n-node.test.mjs
```
