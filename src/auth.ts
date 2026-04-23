import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { config } from './config';

const RETELL_SIGNATURE_HEADER = 'x-retell-signature';
const RETELL_REPLAY_WINDOW_MS = 5 * 60 * 1000;

function tokensEqual(a: string, b: string): boolean {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

export function bearerAuth(tokenEnv: 'DEMO_BEARER_TOKEN' | 'API_BEARER_TOKEN') {
  const expected = config[tokenEnv];
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'unauthorized', message: 'Missing bearer token' } });
    }
    const token = header.slice('Bearer '.length);
    if (!tokensEqual(token, expected)) {
      return res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid bearer token' } });
    }
    return next();
  };
}

export type WebhookAuthResult = { ok: true } | { ok: false; reason: string };

function verifyRetellSignature(parsedBody: unknown, req: Request): WebhookAuthResult {
  const sigHeader = req.headers[RETELL_SIGNATURE_HEADER];
  if (typeof sigHeader !== 'string') {
    return { ok: false, reason: 'missing_signature_header' };
  }
  const match = sigHeader.match(/^v=(\d+),d=([a-f0-9]+)$/i);
  if (!match) {
    return { ok: false, reason: 'signature_format_invalid' };
  }
  const timestamp = match[1];
  const providedHex = match[2].toLowerCase();

  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: 'signature_timestamp_invalid' };
  }
  if (Math.abs(Date.now() - ts) > RETELL_REPLAY_WINDOW_MS) {
    return { ok: false, reason: 'signature_too_old' };
  }

  const signingMaterial = JSON.stringify(parsedBody) + timestamp;
  const expectedHex = crypto
    .createHmac('sha256', config.WEBHOOK_SIGNATURE_SECRET)
    .update(signingMaterial, 'utf8')
    .digest('hex');

  if (expectedHex.length !== providedHex.length) {
    return { ok: false, reason: 'signature_mismatch' };
  }
  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(providedHex, 'hex');
    if (!crypto.timingSafeEqual(a, b)) {
      return { ok: false, reason: 'signature_mismatch' };
    }
  } catch {
    return { ok: false, reason: 'signature_mismatch' };
  }
  return { ok: true };
}

export function verifyWebhookSignatureOrBearer(parsedBody: unknown, req: Request): WebhookAuthResult {
  if (config.webhookSignatureEnabled) {
    return verifyRetellSignature(parsedBody, req);
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return { ok: false, reason: 'missing_bearer' };
  }
  const token = header.slice('Bearer '.length);
  if (!tokensEqual(token, config.DEMO_BEARER_TOKEN)) {
    return { ok: false, reason: 'bearer_mismatch' };
  }
  return { ok: true };
}
