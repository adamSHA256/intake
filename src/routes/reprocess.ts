import { Router, json } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { logger } from '../logger';
import { bearerAuth } from '../auth';
import { retellWebhookSchema } from '../validators';
import { deriveFromRetell } from '../derivation';

export const reprocessRouter = Router();

reprocessRouter.use(json());
reprocessRouter.use(bearerAuth('API_BEARER_TOKEN'));

const idParamSchema = z.string().uuid();

reprocessRouter.post('/:id/reprocess', async (req, res) => {
  const id = idParamSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: { code: 'invalid_id' } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const eventRes = await client.query<{ id: string; raw_payload: unknown }>(
      `SELECT id, raw_payload FROM intake_events WHERE id = $1 FOR UPDATE`,
      [id.data],
    );
    if (eventRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { code: 'not_found' } });
    }

    const existingPreReg = await client.query<{ id: string }>(
      `SELECT id FROM pre_reg WHERE intake_event_id = $1`,
      [id.data],
    );
    if ((existingPreReg.rowCount ?? 0) > 0) {
      await client.query('COMMIT');
      return res.json({ status: 'already_derived', pre_reg_id: existingPreReg.rows[0].id });
    }

    await client.query(
      `UPDATE intake_events
          SET processing_attempts = processing_attempts + 1,
              last_attempt_at = now()
        WHERE id = $1`,
      [id.data],
    );

    try {
      const payload = retellWebhookSchema.parse(eventRes.rows[0].raw_payload);
      const derived = deriveFromRetell(payload);
      const insertPreReg = await client.query<{ id: string }>(
        `INSERT INTO pre_reg (
           intake_event_id, patient_first_name, patient_last_name, dob, phone_e164,
           email, insurance_provider, chief_complaint, referring_physician
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          id.data,
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
        [id.data],
      );
      await client.query('COMMIT');
      return res.status(201).json({ status: 'derived', pre_reg_id: insertPreReg.rows[0].id });
    } catch (derivErr) {
      const message = derivErr instanceof Error ? derivErr.message : String(derivErr);
      await client.query(
        `UPDATE intake_events SET processing_error = $2 WHERE id = $1`,
        [id.data, message],
      );
      await client.query('COMMIT');
      return res.status(422).json({ status: 'failed', error: message });
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, id: id.data }, 'reprocess failed');
    return res.status(500).json({ error: { code: 'internal' } });
  } finally {
    client.release();
  }
});
