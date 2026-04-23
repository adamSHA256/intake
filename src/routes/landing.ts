import { Router } from 'express';
import { config } from '../config';

export const landingRouter = Router();

const RETELL_DOCS_URL = 'https://docs.retellai.com/features/webhook-overview';

function renderHtml(repoUrl: string): string {
  const hasRepo = repoUrl.length > 0;
  const readmeUrl = hasRepo ? `${repoUrl}#readme` : '';
  const notesUrl = hasRepo ? `${repoUrl}/blob/main/RETELL_NOTES.md` : '';
  const links = hasRepo
    ? `
      <a href="${repoUrl}" target="_blank" rel="noopener">GitHub repo</a>
      <a href="${readmeUrl}" target="_blank" rel="noopener">README</a>
      <a href="${notesUrl}" target="_blank" rel="noopener">Retell research notes</a>
      <a href="${RETELL_DOCS_URL}" target="_blank" rel="noopener">Retell docs</a>`
    : `
      <span style="color: var(--muted)">Set GITHUB_REPO_URL in .env to show repo links.</span>
      <a href="${RETELL_DOCS_URL}" target="_blank" rel="noopener" style="margin-left:1rem">Retell docs</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Healthcare Intake Pipeline — Live Demo</title>
<style>
:root {
  --bg: #0b0f14; --fg: #e6e8eb; --muted: #8b95a1; --accent: #5aa9ff;
  --ok: #57d17c; --err: #ff5d5d; --panel: #141b24; --border: #253041; --code-bg: #0f1520;
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: var(--bg); color: var(--fg); font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; padding: 2rem 1rem 4rem; }
main { max-width: 920px; margin: 0 auto; }
h1 { font-size: 1.8rem; margin: 0 0 0.25rem; }
h2 { font-size: 1.15rem; margin: 2rem 0 0.6rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; }
p.lead { color: var(--muted); margin-top: 0; }
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.status { display: inline-block; padding: 0.2rem 0.55rem; border-radius: 0.25rem; font-size: 0.85rem; background: var(--panel); border: 1px solid var(--border); }
.status.ok { color: var(--ok); border-color: var(--ok); }
.status.err { color: var(--err); border-color: var(--err); }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: 0.5rem; padding: 1rem; margin-bottom: 1rem; }
label { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 0.25rem; }
input, textarea { width: 100%; background: var(--code-bg); color: var(--fg); border: 1px solid var(--border); border-radius: 0.25rem; padding: 0.5rem 0.6rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.85rem; }
input:focus, textarea:focus { outline: 1px solid var(--accent); border-color: var(--accent); }
textarea { resize: vertical; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
@media (max-width: 600px) { .row { grid-template-columns: 1fr; } }
button.primary { background: var(--accent); color: #061220; border: 0; padding: 0.55rem 1rem; border-radius: 0.25rem; font-weight: 600; cursor: pointer; font-size: 0.9rem; }
button.primary:hover { opacity: 0.88; }
pre { background: var(--code-bg); border: 1px solid var(--border); border-radius: 0.25rem; padding: 0.75rem; overflow-x: auto; font-size: 0.8rem; margin: 0 0 1rem; white-space: pre; }
.cmd-row { display: flex; justify-content: space-between; align-items: center; color: var(--muted); font-size: 0.85rem; margin: 1rem 0 0.35rem; gap: 0.5rem; flex-wrap: wrap; }
.cmd-row .title { font-weight: 500; color: var(--fg); }
.cmd-desc { color: var(--muted); font-size: 0.85rem; margin: 0 0 0.4rem; line-height: 1.4; }
.copy-btn { background: transparent; color: var(--muted); border: 1px solid var(--border); padding: 0.2rem 0.7rem; font-size: 0.75rem; cursor: pointer; border-radius: 0.25rem; font-family: inherit; }
.copy-btn:hover { color: var(--fg); border-color: var(--accent); }
.copy-btn.copied { color: var(--ok); border-color: var(--ok); }
.copy-btn.failed { color: var(--err); border-color: var(--err); }
a { color: var(--accent); }
.links a { margin-right: 1rem; }
ul { padding-left: 1.2rem; }
ul li { margin-bottom: 0.3rem; }
.footer { margin-top: 3rem; color: var(--muted); font-size: 0.8rem; }
details { background: var(--panel); border: 1px solid var(--border); border-radius: 0.5rem; padding: 0.75rem 1rem; margin-bottom: 1rem; }
details[open] { padding-bottom: 1rem; }
details summary { cursor: pointer; font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center; }
details summary::-webkit-details-marker { display: none; }
details summary::after { content: '▾'; color: var(--muted); transition: transform 0.15s; }
details[open] summary::after { transform: rotate(180deg); }
details > *:not(summary) { margin-top: 0.75rem; }
</style>
</head>
<body>
<main>
  <h1>Healthcare Intake Pipeline</h1>
  <p class="lead">Webhook → PostgreSQL → API pipeline. Retell AI <code>call_ended</code> payload in, pre-registration record out. Live demo — synthetic data only.</p>
  <div><span id="status" class="status">checking…</span></div>

  <h2>1. Paste bearer tokens</h2>
  <p>From the Upwork application message. Commands below regenerate as you type.</p>
  <div class="panel">
    <div class="row">
      <div>
        <label for="demo-token">DEMO_BEARER_TOKEN &nbsp;<span style="color:var(--muted)">— for POST /webhooks/retell</span></label>
        <input id="demo-token" placeholder="paste demo token" autocomplete="off" spellcheck="false">
      </div>
      <div>
        <label for="api-token">API_BEARER_TOKEN &nbsp;<span style="color:var(--muted)">— for /api/*</span></label>
        <input id="api-token" placeholder="paste api token" autocomplete="off" spellcheck="false">
      </div>
    </div>
    <div style="margin-top: 0.9rem; display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; color: var(--muted);">
    <span style="white-space: nowrap;">
  <label for="use-jq" style="cursor: pointer;">Pretty-print responses with jq (command-line JSON processor)</label>
</span>  
    <input type="checkbox" id="use-jq" style="margin: 0;">
    </div>
  </div>

  <h2>2. Try it — copy &amp; run</h2>
  <p>Paste any of these into a terminal. Replace <code>&lt;PRE_REG_ID&gt;</code> / <code>&lt;INTAKE_EVENT_ID&gt;</code> with UUIDs from earlier responses.</p>

  <div class="cmd-row">
    <span class="title">Health check (no auth)</span>
    <button class="copy-btn" data-target="cmd-health">Copy</button>
  </div>
  <p class="cmd-desc">Confirms the app is running and can reach Postgres. Returns <code>{"status":"ok","db":"ok"}</code>. No authentication required — anyone can check liveness.</p>
  <pre><code id="cmd-health"></code></pre>

  <div class="cmd-row">
    <span class="title">Submit a webhook · POST /webhooks/retell</span>
    <button class="copy-btn" data-target="cmd-submit">Copy</button>
  </div>
  <p class="cmd-desc">Simulates Retell posting a completed call. Validates the payload, stores the raw JSON as an audit event, and creates a <code>pre_reg</code> record. Posting the same <code>call_id</code> again returns <code>{"status":"duplicate"}</code> — idempotent by design.</p>
  <pre><code id="cmd-submit"></code></pre>

  <div class="cmd-row">
    <span class="title">List pre-registrations · GET /api/pre-reg</span>
    <button class="copy-btn" data-target="cmd-list">Copy</button>
  </div>
  <p class="cmd-desc">Returns pre-registration records, most recent first. Cursor-paginated: add <code>?limit=20&amp;cursor=...</code> to page through. Filter by status with <code>?status=reviewed</code>. Soft-deleted rows are never returned.</p>
  <pre><code id="cmd-list"></code></pre>

  <div class="cmd-row">
    <span class="title">Get one by id · GET /api/pre-reg/:id</span>
    <button class="copy-btn" data-target="cmd-get">Copy</button>
  </div>
  <p class="cmd-desc">Fetches a single <code>pre_reg</code> record by UUID, plus metadata about the intake event it was derived from. Returns 404 if the record is missing or soft-deleted.</p>
  <pre><code id="cmd-get"></code></pre>

  <div class="cmd-row">
    <span class="title">Update one · PATCH /api/pre-reg/:id (mark reviewed + add note)</span>
    <button class="copy-btn" data-target="cmd-patch">Copy</button>
  </div>
  <p class="cmd-desc">Partially updates a record — any subset of fields is allowed, empty body returns 400. Fields go through the same validators the webhook uses (E.164 phones, ISO dates, email format). Useful for a coordinator marking a record reviewed or fixing a typo.</p>
  <pre><code id="cmd-patch"></code></pre>

  <div class="cmd-row">
    <span class="title">Reprocess a stored event · POST /api/intake-events/:id/reprocess</span>
    <button class="copy-btn" data-target="cmd-reprocess">Copy</button>
  </div>
  <p class="cmd-desc">Recovery for events whose derivation failed on the first try (bad payload, transient bug). Retries the derivation now. If a <code>pre_reg</code> already exists for that event, returns <code>already_derived</code> — safe to call either way. Without this endpoint, failed events would be permanently orphaned.</p>
  <pre><code id="cmd-reprocess"></code></pre>

  <h2>3. Build a custom payload (optional)</h2>
  <details>
    <summary>Generate a synthetic Retell <code>call_ended</code> event</summary>
    <p style="color: var(--muted); margin-top: 0.5rem;">A default payload is generated on page load and wired into the submit command above. Change any field and click <em>Generate payload</em> to refresh the JSON (and the submit command). <em>Reset to default</em> restores the sample values.</p>
    <div class="row">
      <div><label for="gen-call-id">call_id (unique per call)</label><input id="gen-call-id" value="demo-call-002"></div>
      <div><label for="gen-from">from_number (E.164)</label><input id="gen-from" value="+15555550101"></div>
      <div><label for="gen-first">patient_first_name</label><input id="gen-first" value="Jane"></div>
      <div><label for="gen-last">patient_last_name</label><input id="gen-last" value="Doe"></div>
      <div><label for="gen-dob">dob (YYYY-MM-DD)</label><input id="gen-dob" value="1985-04-12"></div>
      <div><label for="gen-email">email</label><input id="gen-email" value="jane.doe@example.com"></div>
      <div><label for="gen-insurer">insurance_provider</label><input id="gen-insurer" value="Example Health"></div>
      <div><label for="gen-complaint">chief_complaint</label><input id="gen-complaint" value="recurring headache"></div>
    </div>
    <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem; align-items: center;">
      <button id="gen-btn" class="primary">Generate payload</button>
      <button id="reset-btn" class="copy-btn" type="button">Reset to default</button>
    </div>
    <div class="cmd-row" style="margin-top: 1rem;">
      <span class="title">Generated payload</span>
      <button class="copy-btn" data-target="gen-output">Copy payload</button>
    </div>
    <textarea id="gen-output" rows="14" readonly></textarea>
  </details>

  <h2>Notes + links</h2>
  <div class="panel">
    <p class="links">${links}</p>
    <ul>
      <li><strong>Demo only.</strong> Synthetic data. Weekly wipe. Takedown scheduled.</li>
      <li><strong>Webhook auth</strong>: demo mode uses a bearer token. Real Retell traffic uses <code>X-Retell-Signature</code> HMAC-SHA256 per <a href="https://docs.retellai.com/features/secure-webhook" target="_blank" rel="noopener">Retell's docs</a>; details in <code>RETELL_NOTES.md</code>.</li>
      <li><strong>Idempotency</strong>: posting the same <code>call_id</code> twice yields one <code>pre_reg</code> row; the second call returns <code>{"status":"duplicate"}</code>.</li>
      <li><strong>Event filtering</strong>: only <code>event === "call_ended"</code> creates a record; other Retell events return <code>{"status":"ignored_event"}</code>.</li>
      <li><strong>PII hygiene</strong>: transcripts, emails, DOBs, phone numbers, and the Authorization header are redacted in structured logs.</li>
    </ul>
  </div>

  <p class="footer">Demo build. Tokens are shared only via the Upwork application message — do not paste them in screenshots or support tickets.</p>
</main>

<script>
(function() {
  var base = location.origin;
  var elDemo = document.getElementById('demo-token');
  var elApi = document.getElementById('api-token');
  var elStatus = document.getElementById('status');
  var elGenOutput = document.getElementById('gen-output');
  var elUseJq = document.getElementById('use-jq');

  function esc(s) { return String(s == null ? '' : s).replace(/"/g, '\\\\"'); }
  function bashEsc(s) { return String(s == null ? '' : s).replace(/'/g, "'\\\\''"); }
  function jqSuffix() { return elUseJq && elUseJq.checked ? ' | jq' : ''; }

  function renderCommands() {
    var demo = elDemo.value.trim() || '<DEMO_TOKEN>';
    var api = elApi.value.trim() || '<API_TOKEN>';
    var jq = jqSuffix();

    document.getElementById('cmd-health').textContent = 'curl -s ' + base + '/healthz' + jq;

    var payload = elGenOutput.value.trim();
    var bodyArg = payload
      ? "-d '" + bashEsc(payload) + "'"
      : "-d @seed/sample-payload.json";
    document.getElementById('cmd-submit').textContent =
      'curl -s -X POST ' + base + '/webhooks/retell \\\n' +
      '  -H "Authorization: Bearer ' + esc(demo) + '" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  ' + bodyArg + jq;

    document.getElementById('cmd-list').textContent =
      'curl -s ' + base + '/api/pre-reg \\\n' +
      '  -H "Authorization: Bearer ' + esc(api) + '"' + jq;

    document.getElementById('cmd-get').textContent =
      'curl -s ' + base + '/api/pre-reg/<PRE_REG_ID> \\\n' +
      '  -H "Authorization: Bearer ' + esc(api) + '"' + jq;

    document.getElementById('cmd-patch').textContent =
      'curl -s -X PATCH ' + base + '/api/pre-reg/<PRE_REG_ID> \\\n' +
      '  -H "Authorization: Bearer ' + esc(api) + '" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \\'{"status":"reviewed","notes":"Reviewed by coordinator"}\\'' + jq;

    document.getElementById('cmd-reprocess').textContent =
      'curl -s -X POST ' + base + '/api/intake-events/<INTAKE_EVENT_ID>/reprocess \\\n' +
      '  -H "Authorization: Bearer ' + esc(api) + '"' + jq;
  }

  function buildPayload() {
    var now = Date.now();
    return {
      event: 'call_ended',
      call: {
        call_type: 'phone_call',
        call_id: document.getElementById('gen-call-id').value || 'demo-call-002',
        agent_id: 'demo-agent-id',
        direction: 'inbound',
        from_number: document.getElementById('gen-from').value || '+15555550101',
        to_number: '+15555550200',
        call_status: 'ended',
        start_timestamp: now - 300000,
        end_timestamp: now,
        disconnection_reason: 'user_hangup',
        transcript: 'synthetic demo transcript',
        metadata: {},
        retell_llm_dynamic_variables: {},
        collected_dynamic_variables: {
          patient_first_name: document.getElementById('gen-first').value || null,
          patient_last_name:  document.getElementById('gen-last').value  || null,
          dob:                document.getElementById('gen-dob').value   || null,
          email:              document.getElementById('gen-email').value || null,
          insurance_provider: document.getElementById('gen-insurer').value || null,
          chief_complaint:    document.getElementById('gen-complaint').value || null,
          referring_physician: null
        }
      }
    };
  }

  function onGenerate() {
    elGenOutput.value = JSON.stringify(buildPayload(), null, 2);
    renderCommands();
  }

  var DEFAULT_FORM = {
    'gen-call-id': 'demo-call-002',
    'gen-from': '+15555550101',
    'gen-first': 'Jane',
    'gen-last': 'Doe',
    'gen-dob': '1985-04-12',
    'gen-email': 'jane.doe@example.com',
    'gen-insurer': 'Example Health',
    'gen-complaint': 'recurring headache'
  };

  function onReset() {
    Object.keys(DEFAULT_FORM).forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = DEFAULT_FORM[id];
    });
    onGenerate();
  }

  function setupCopy() {
    document.querySelectorAll('.copy-btn[data-target]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-target');
        var el = document.getElementById(id);
        if (!el) return;
        var text = (el.value !== undefined ? el.value : el.textContent) || '';
        if (!text) return;
        var orig = btn.textContent;
        (navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(text)
          : Promise.reject(new Error('no clipboard api'))
        ).then(function() {
          btn.textContent = 'Copied';
          btn.classList.add('copied');
          setTimeout(function() { btn.textContent = orig; btn.classList.remove('copied'); }, 1200);
        }).catch(function() {
          btn.textContent = 'Copy failed';
          btn.classList.add('failed');
          setTimeout(function() { btn.textContent = orig; btn.classList.remove('failed'); }, 1500);
        });
      });
    });
  }

  function checkHealth() {
    fetch(base + '/healthz').then(function(r) { return r.json(); }).then(function(j) {
      if (j.status === 'ok' && j.db === 'ok') {
        elStatus.textContent = 'status: ok · db: ok';
        elStatus.classList.add('ok');
      } else {
        elStatus.textContent = 'degraded';
        elStatus.classList.add('err');
      }
    }).catch(function() {
      elStatus.textContent = 'unreachable';
      elStatus.classList.add('err');
    });
  }

  document.getElementById('gen-btn').addEventListener('click', onGenerate);
  document.getElementById('reset-btn').addEventListener('click', onReset);
  elDemo.addEventListener('input', renderCommands);
  elApi.addEventListener('input', renderCommands);
  if (elUseJq) elUseJq.addEventListener('change', renderCommands);

  onGenerate();
  setupCopy();
  checkHealth();
})();
</script>
</body>
</html>`;
}

landingRouter.get('/', (_req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'no-store');
  res.send(renderHtml(config.GITHUB_REPO_URL));
});
