-- Up Migration

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE intake_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  external_id text NOT NULL,
  raw_payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text,
  processing_attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  CONSTRAINT intake_events_source_external_id_unique UNIQUE (source, external_id)
);

CREATE INDEX intake_events_received_at_idx ON intake_events (received_at DESC);

CREATE TABLE pre_reg (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_event_id uuid NOT NULL REFERENCES intake_events(id),
  patient_first_name text CHECK (char_length(patient_first_name) <= 200),
  patient_last_name text CHECK (char_length(patient_last_name) <= 200),
  dob date,
  phone_e164 varchar(16),
  email text CHECK (char_length(email) <= 320),
  insurance_provider text CHECK (char_length(insurance_provider) <= 200),
  chief_complaint text CHECK (char_length(chief_complaint) <= 4000),
  referring_physician text CHECK (char_length(referring_physician) <= 200),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed')),
  notes text CHECK (char_length(notes) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT pre_reg_intake_event_id_unique UNIQUE (intake_event_id)
);

CREATE INDEX pre_reg_created_at_idx ON pre_reg (created_at DESC);
CREATE INDEX pre_reg_active_coord_idx ON pre_reg (status, created_at DESC, id DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER pre_reg_set_updated_at
  BEFORE UPDATE ON pre_reg
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Down Migration

DROP TRIGGER IF EXISTS pre_reg_set_updated_at ON pre_reg;
DROP INDEX IF EXISTS pre_reg_active_coord_idx;
DROP INDEX IF EXISTS pre_reg_created_at_idx;
DROP TABLE IF EXISTS pre_reg;
DROP INDEX IF EXISTS intake_events_received_at_idx;
DROP TABLE IF EXISTS intake_events;
DROP FUNCTION IF EXISTS set_updated_at();
