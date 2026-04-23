import { Router } from 'express';
import { healthCheck } from '../db';
import { logger } from '../logger';

export const healthRouter = Router();

healthRouter.get('/healthz', async (_req, res) => {
  try {
    const ok = await healthCheck();
    if (!ok) throw new Error('db check returned false');
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    logger.error({ err }, 'healthcheck failed');
    res.status(503).json({ status: 'degraded', db: 'error' });
  }
});
