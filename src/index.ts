import express from 'express';
import pinoHttp from 'pino-http';
import crypto from 'node:crypto';
import { config } from './config';
import { logger } from './logger';
import { pool } from './db';
import { webhookRouter } from './routes/webhook';
import { preRegRouter } from './routes/pre-reg';
import { reprocessRouter } from './routes/reprocess';
import { healthRouter } from './routes/health';
import { landingRouter } from './routes/landing';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      if (typeof incoming === 'string' && incoming.length > 0) return incoming;
      return crypto.randomUUID();
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }),
);

app.use('/webhooks', webhookRouter);
app.use('/api/pre-reg', preRegRouter);
app.use('/api/intake-events', reprocessRouter);
app.use(healthRouter);
app.use(landingRouter);

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'not_found' } });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'unhandled error');
  res.status(500).json({ error: { code: 'internal' } });
});

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, 'intake listening');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
