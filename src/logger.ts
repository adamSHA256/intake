import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-retell-signature"]',
      'req.body.call.transcript',
      'req.body.call.from_number',
      'req.body.call.to_number',
      'req.body.call.collected_dynamic_variables.dob',
      'req.body.call.collected_dynamic_variables.email',
      'req.body.call.collected_dynamic_variables.patient_first_name',
      'req.body.call.collected_dynamic_variables.patient_last_name',
      'res.body.*.email',
      'res.body.*.phone_e164',
      'res.body.*.dob',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'intake' },
});
