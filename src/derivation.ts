import type { RetellPayload } from './validators';

export type DerivedPreReg = {
  patient_first_name: string | null;
  patient_last_name: string | null;
  dob: string | null;
  phone_e164: string | null;
  email: string | null;
  insurance_provider: string | null;
  chief_complaint: string | null;
  referring_physician: string | null;
};

export function deriveFromRetell(payload: RetellPayload): DerivedPreReg {
  const call = payload.call;
  const collected = call.collected_dynamic_variables ?? {};
  return {
    patient_first_name: collected.patient_first_name ?? null,
    patient_last_name: collected.patient_last_name ?? null,
    dob: collected.dob ?? null,
    phone_e164: call.from_number ?? null,
    email: collected.email ?? null,
    insurance_provider: collected.insurance_provider ?? null,
    chief_complaint: collected.chief_complaint ?? null,
    referring_physician: collected.referring_physician ?? null,
  };
}
