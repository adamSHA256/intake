import { Router, json } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { logger } from '../logger';
import { bearerAuth } from '../auth';
import { patchPreRegSchema, listQuerySchema } from '../validators';
import { encodeCursor, decodeCursor } from '../cursor';

export const preRegRouter = Router();

preRegRouter.use(json({ limit: '32kb' }));
preRegRouter.use(bearerAuth('API_BEARER_TOKEN'));

const idParamSchema = z.string().uuid();

const preRegColumns = `
  id, intake_event_id, patient_first_name, patient_last_name, dob, phone_e164, email,
  insurance_provider, chief_complaint, referring_physician, status, notes,
  created_at, updated_at
`;

preRegRouter.get('/', async (req, res) => {
  const q = listQuerySchema.safeParse(req.query);
  if (!q.success) {
    return res.status(400).json({ error: { code: 'invalid_query', details: q.error.flatten() } });
  }
  const { limit, cursor, status } = q.data;

  let cursorTs: string | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded) {
      return res.status(400).json({ error: { code: 'invalid_cursor' } });
    }
    cursorTs = decoded.created_at;
    cursorId = decoded.id;
  }

  try {
    const result = await pool.query<{ id: string; created_at: Date }>(
      `SELECT ${preRegColumns}
         FROM pre_reg
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR status = $1)
          AND ($2::timestamptz IS NULL OR (created_at, id) < ($2::timestamptz, $3::uuid))
        ORDER BY created_at DESC, id DESC
        LIMIT $4`,
      [status ?? null, cursorTs, cursorId, limit + 1],
    );

    const items = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;
    const last = items[items.length - 1];
    const next = hasMore && last
      ? encodeCursor({ created_at: last.created_at.toISOString(), id: last.id })
      : null;

    return res.json({ items, next_cursor: next });
  } catch (err) {
    logger.error({ err }, 'list pre_reg failed');
    return res.status(500).json({ error: { code: 'internal' } });
  }
});

preRegRouter.get('/:id', async (req, res) => {
  const id = idParamSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: { code: 'invalid_id' } });
  }
  try {
    const result = await pool.query(
      `SELECT p.id, p.intake_event_id, p.patient_first_name, p.patient_last_name, p.dob, p.phone_e164, p.email,
              p.insurance_provider, p.chief_complaint, p.referring_physician, p.status, p.notes,
              p.created_at, p.updated_at,
              jsonb_build_object(
                'id', e.id, 'source', e.source, 'external_id', e.external_id, 'received_at', e.received_at
              ) AS intake_event
         FROM pre_reg p
         JOIN intake_events e ON e.id = p.intake_event_id
        WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [id.data],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { code: 'not_found' } });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err, id: id.data }, 'get pre_reg failed');
    return res.status(500).json({ error: { code: 'internal' } });
  }
});

preRegRouter.patch('/:id', async (req, res) => {
  const id = idParamSchema.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: { code: 'invalid_id' } });
  }
  const body = patchPreRegSchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: { code: 'invalid_body', details: body.error.flatten() } });
  }
  const entries = Object.entries(body.data).filter(([, v]) => v !== undefined);
  if (entries.length === 0) {
    return res.status(400).json({ error: { code: 'empty_patch', message: 'PATCH body must contain at least one field' } });
  }

  const setParts = entries.map(([k], i) => `${k} = $${i + 2}`);
  const values = entries.map(([, v]) => v);

  try {
    const result = await pool.query(
      `UPDATE pre_reg
          SET ${setParts.join(', ')}
        WHERE id = $1 AND deleted_at IS NULL
      RETURNING ${preRegColumns}`,
      [id.data, ...values],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: { code: 'not_found' } });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err, id: id.data }, 'patch pre_reg failed');
    return res.status(500).json({ error: { code: 'internal' } });
  }
});
