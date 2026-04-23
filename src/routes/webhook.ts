import { Router, raw } from 'express';
import { pool } from '../db';
import { logger } from '../logger';
import { verifyWebhookSignatureOrBearer } from '../auth';
import { retellWebhookSchema } from '../validators';
import { deriveFromRetell } from '../derivation';

export const webhookRouter = Router();

webhookRouter.post(
  '/retell',
  raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: { code: 'invalid_json', message: 'Body is not valid JSON' } });
    }

    const auth = verifyWebhookSignatureOrBearer(parsed, req);
    if (!auth.ok) {
      return res.status(401).json({ error: { code: 'unauthorized', message: auth.reason } });
    }

    const schemaResult = retellWebhookSchema.safeParse(parsed);
    if (!schemaResult.success) {
      return res.status(400).json({
        error: {
          code: 'invalid_schema',
          message: 'Payload failed validation',
          details: schemaResult.error.flatten(),
        },
      });
    }
    const payload = schemaResult.data;

    if (payload.event !== 'call_ended') {
      logger.info(
        { event: payload.event, call_id: payload.call.call_id },
        'non-terminal Retell event acknowledged, no pre_reg created',
      );
      return res.status(200).json({ status: 'ignored_event', event: payload.event });
    }

    const callId = payload.call.call_id;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertEvent = await client.query<{ id: string }>(
        `INSERT INTO intake_events (source, external_id, raw_payload)
         VALUES ($1, $2, $3)
         ON CONFLICT (source, external_id) DO NOTHING
         RETURNING id`,
        ['retell', callId, parsed],
      );

      if (insertEvent.rowCount === 0) {
        await client.query('COMMIT');
        logger.info({ call_id: callId }, 'duplicate webhook ignored');
        return res.status(200).json({ status: 'duplicate', external_id: callId });
      }

      const eventId = insertEvent.rows[0].id;

      await client.query(
        `UPDATE intake_events
            SET processing_attempts = processing_attempts + 1,
                last_attempt_at = now()
          WHERE id = $1`,
        [eventId],
      );

      try {
        const derived = deriveFromRetell(payload);
        const insertPreReg = await client.query<{ id: string }>(
          `INSERT INTO pre_reg (
             intake_event_id, patient_first_name, patient_last_name, dob, phone_e164,
             email, insurance_provider, chief_complaint, referring_physician
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            eventId,
            derived.patient_first_name,
            derived.patient_last_name,
            derived.dob,
            derived.phone_e164,
            derived.email,
            derived.insurance_provider,
            derived.chief_complaint,
            derived.referring_physician,
          ],
        );

        await client.query(
          `UPDATE intake_events
              SET processed_at = now(),
                  processing_error = NULL
            WHERE id = $1`,
          [eventId],
        );

        await client.query('COMMIT');
        return res.status(201).json({
          status: 'created',
          intake_event_id: eventId,
          pre_reg_id: insertPreReg.rows[0].id,
        });
      } catch (derivErr) {
        const message = derivErr instanceof Error ? derivErr.message : String(derivErr);
        await client.query(
          `UPDATE intake_events SET processing_error = $2 WHERE id = $1`,
          [eventId, message],
        );
        await client.query('COMMIT');
        logger.warn({ err: derivErr, call_id: callId }, 'derivation failed; event stored for reprocess');
        return res.status(200).json({
          status: 'stored',
          external_id: callId,
          derivation: 'failed',
        });
      }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      logger.error({ err, call_id: callId }, 'webhook insert failed');
      return res.status(500).json({ error: { code: 'internal', message: 'Unexpected error' } });
    } finally {
      client.release();
    }
  },
);
