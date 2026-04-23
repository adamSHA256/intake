# Retell AI Webhook — Research Notes

Findings from reading Retell's official documentation. This file exists so the reviewer can trace exactly what I verified from docs vs. what I inferred / chose as our product contract.

## Sources

- **Webhook overview:** https://docs.retellai.com/features/webhook-overview
- **Webhook registration:** https://docs.retellai.com/features/register-webhook
- **Signature verification:** https://docs.retellai.com/features/secure-webhook
- **Call object (API reference):** https://docs.retellai.com/api-references/get-call

## Verified from docs

### Event lifecycle

Retell fires webhooks for **multiple events per call**, all sharing the same `call_id`:

- `call_started` — call begins
- `call_ended` — call completes, transfers, or errors
- `call_analyzed` — Retell's post-call analysis finishes
- `transcript_updated` — at turn-taking and call end
- `transfer_*` — transfer lifecycle events

**Implication:** our idempotency key `(source, external_id)` where `external_id = call_id` means a single `call_id` gets stored only once. If we accepted every event type, `call_started` would win the race and `call_ended` would be dropped as a duplicate — silently losing patient data.

**Our choice:** filter to `event === 'call_ended'` at the handler. Other events return `200 ignored_event` and are not stored. That is the point at which patient data collection is complete for an intake call.

### Signature scheme

- **Header name:** `X-Retell-Signature`
- **Header format:** `v={timestamp_ms},d={hex_hmac_sha256_digest}`
- **Algorithm:** HMAC-SHA256
- **Signing input:** `JSON.stringify(body) + timestamp` (per Retell's Node SDK example)
- **Secret:** the Retell API key, configured per webhook endpoint in their dashboard

Our implementation matches this. We additionally reject signatures older than **5 minutes** as replay protection — Retell's docs don't specify a window; this is a hardening choice.

### Payload shape (from Retell docs)

```json
{
  "event": "call_ended",
  "call": {
    "call_type": "phone_call",
    "call_id": "Jabr9TXYYJHfvl6Syypi88rdAHYHmcq6",
    "agent_id": "oBeDLoLOeuAbiuaMFXRtDOLriTJ5tSxD",
    "direction": "inbound",
    "from_number": "+12137771234",
    "to_number": "+12137771235",
    "call_status": "ended",
    "start_timestamp": 1714608475945,
    "end_timestamp":   1714608491736,
    "disconnection_reason": "user_hangup",
    "transcript": "...",
    "metadata": {},
    "retell_llm_dynamic_variables": {
      "customer_name": "John Doe"
    }
  }
}
```

Note the wrapper: `{event, call: {...}}`. Timestamps are **milliseconds since epoch as numbers**, not ISO strings. `call_status` values are from `{registered, not_connected, ongoing, ended, error}`.

## Not documented by Retell — our product contract

**Patient-data fields (name, DOB, insurance, chief complaint, referring physician) are NOT part of Retell's standard payload.** They are whatever the Retell agent is configured to collect, and they arrive inside one of:

- `call.collected_dynamic_variables` — variables captured **during** the call (what we use for intake)
- `call.retell_llm_dynamic_variables` — variables injected when the call was **started**

We chose `collected_dynamic_variables` with these field names:

- `patient_first_name`
- `patient_last_name`
- `dob` (ISO `YYYY-MM-DD`)
- `email`
- `insurance_provider`
- `chief_complaint`
- `referring_physician`

**This is the contract between the backend and the Retell agent configuration.** The Retell agent in the client's dashboard must be configured to collect variables with exactly these names. If the client prefers different names, changing the schema in `src/validators.ts` + `src/derivation.ts` is a two-file update.

Our `seed/sample-payload.json` uses this shape as a reference example.

## Assumption to confirm before real Retell traffic

Retell's docs state the signature is HMAC over `JSON.stringify(body) + timestamp`. We implemented this literally. If Retell's server-side JSON serialization produces bytes that differ from Node's `JSON.stringify` output (whitespace, Unicode escapes, key ordering, etc.), verification will fail silently with `signature_mismatch`.

**Before wiring real Retell traffic:** send one signed test webhook from Retell's dashboard, compare `JSON.stringify(req.body)` in our app to the exact string Retell signed. If they match, ship. If they don't, either (a) switch to verifying HMAC against the raw body bytes, or (b) clarify with Retell support what they actually stringify.

## What was not asked of the docs

Retell's docs mention rate-limiting, retry semantics, and IP allowlisting in places I didn't read closely. If phase 1 needs any of those (especially: "does Retell retry on a 500?"), re-check before production.
