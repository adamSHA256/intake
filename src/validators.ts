import { z } from 'zod';

export const e164 = z
  .string()
  .regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164: + followed by 1-15 digits');

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'Invalid calendar date');

export const email = z
  .string()
  .email()
  .max(320)
  .transform((s) => s.toLowerCase());

export const maxLen = (n: number) => z.string().max(n);

export const retellEvents = z.enum([
  'call_started',
  'call_ended',
  'call_analyzed',
  'transcript_updated',
  'transfer_started',
  'transfer_bridged',
  'transfer_cancelled',
  'transfer_ended',
]);

export const retellCallStatus = z.enum([
  'registered',
  'not_connected',
  'ongoing',
  'ended',
  'error',
]);

export const collectedPatientDataSchema = z.object({
  patient_first_name: maxLen(200).nullable().optional(),
  patient_last_name: maxLen(200).nullable().optional(),
  dob: isoDate.nullable().optional(),
  email: email.nullable().optional(),
  insurance_provider: maxLen(200).nullable().optional(),
  chief_complaint: maxLen(4000).nullable().optional(),
  referring_physician: maxLen(200).nullable().optional(),
}).passthrough();

export const retellWebhookSchema = z.object({
  event: retellEvents,
  call: z.object({
    call_id: z.string().min(1),
    call_type: z.string().optional(),
    agent_id: z.string().optional(),
    direction: z.string().optional(),
    call_status: retellCallStatus.optional(),
    from_number: e164.optional(),
    to_number: e164.optional(),
    start_timestamp: z.number().int().optional(),
    end_timestamp: z.number().int().optional(),
    disconnection_reason: z.string().optional(),
    transcript: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
    retell_llm_dynamic_variables: z.record(z.unknown()).optional(),
    collected_dynamic_variables: collectedPatientDataSchema.optional(),
  }).passthrough(),
}).passthrough();

export const patchPreRegSchema = z
  .object({
    status: z.enum(['new', 'reviewed']).optional(),
    notes: maxLen(4000).optional(),
    patient_first_name: maxLen(200).optional(),
    patient_last_name: maxLen(200).optional(),
    dob: isoDate.optional(),
    phone_e164: e164.optional(),
    email: email.optional(),
    insurance_provider: maxLen(200).optional(),
    chief_complaint: maxLen(4000).optional(),
    referring_physician: maxLen(200).optional(),
  })
  .strict();

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(['new', 'reviewed']).optional(),
});

export type RetellPayload = z.infer<typeof retellWebhookSchema>;
