-- Rebuild around the "Muster" spec: a canonical Fact Base extracted from
-- uploaded evidence, a real questionnaire parser/answer engine/triage
-- board, and organisation-scoped multi-tenancy from the start. Replaces
-- the "Compliance Passport" text-matching model entirely, following this
-- codebase's established pivot pattern (drop superseded tables, don't
-- accrete old and new side by side).

DROP TABLE IF EXISTS request_exports;
DROP TABLE IF EXISTS request_items;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS qa_entry_evidence;
DROP TABLE IF EXISTS qa_entries;
DROP TABLE IF EXISTS certifications;
DROP TABLE IF EXISTS project_assignments;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS company_profile;

CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every existing user must belong to an organisation. Backfill a single
-- org from whatever's already in the (dev/demo) database so the ALTER
-- can be NOT NULL immediately rather than needing a nullable transition
-- period no real customer data depends on.
INSERT INTO organisations (name)
SELECT 'Unassigned Organisation' WHERE EXISTS (SELECT 1 FROM users);

ALTER TABLE users ADD COLUMN organisation_id UUID REFERENCES organisations(id);
UPDATE users SET organisation_id = (SELECT id FROM organisations LIMIT 1);
ALTER TABLE users ALTER COLUMN organisation_id SET NOT NULL;

ALTER TABLE users DROP CONSTRAINT users_role_check;
UPDATE users SET role = CASE role
  WHEN 'admin' THEN 'owner'
  WHEN 'compliance_manager' THEN 'editor'
  WHEN 'auditor' THEN 'read_only'
  ELSE role
END;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'editor', 'contributor', 'approver', 'read_only'));

-- documents already has `version INTEGER NOT NULL DEFAULT 1` and
-- `expires_at DATE` from 001_init.sql — reused as-is, not duplicated.
ALTER TABLE documents ADD COLUMN organisation_id UUID REFERENCES organisations(id);
UPDATE documents SET organisation_id = (SELECT id FROM organisations LIMIT 1);
ALTER TABLE documents ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE documents ADD COLUMN supersedes_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN source TEXT NOT NULL DEFAULT 'upload';

CREATE TABLE facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  current_value TEXT,
  status TEXT NOT NULL DEFAULT 'unverified' CHECK (status IN ('unverified', 'verified')),
  conflict BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_on TIMESTAMPTZ,
  expiry DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, domain, key)
);

CREATE TABLE fact_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id UUID NOT NULL REFERENCES facts(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_reference TEXT,
  snippet TEXT,
  extracted_value TEXT NOT NULL,
  confidence REAL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE answer_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  canonical_question_text TEXT NOT NULL,
  domain TEXT,
  approved_answer TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, canonical_question_text)
);

CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  format_fingerprint TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'parsing' CHECK (status IN ('parsing', 'ready', 'exported', 'attested'))
);

CREATE TABLE question_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  sheet_name TEXT NOT NULL,
  row_ref TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'free_text' CHECK (response_type IN ('free_text', 'yes_no', 'numeric', 'attachment')),
  section TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_instance_id UUID NOT NULL UNIQUE REFERENCES question_instances(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'red' CHECK (status IN ('red', 'amber', 'green')),
  confidence REAL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('library', 'fact', 'generated', 'manual')),
  cited_fact_ids UUID[] NOT NULL DEFAULT '{}',
  cited_document_ids UUID[] NOT NULL DEFAULT '{}',
  is_override BOOLEAN NOT NULL DEFAULT false,
  -- A green/amber answer from the Answer Engine is a draft, same as every
  -- other AI-touching feature in this app: it never counts as a real
  -- answer, and never reaches export/attestation, until a human explicitly
  -- confirms it (even a "bulk accept" on greens is still an explicit
  -- click) — spec §4.3.4's RAG table lists "scan and bulk-accept" as
  -- green's required action, not an implicit pass-through.
  confirmed BOOLEAN NOT NULL DEFAULT false,
  edited_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_instance_id UUID NOT NULL REFERENCES question_instances(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('a', 'b', 'c', 'd')),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  owner_id UUID REFERENCES users(id),
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  attested_by UUID NOT NULL REFERENCES users(id),
  attested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot JSONB NOT NULL,
  export_file_path TEXT
);

CREATE INDEX idx_facts_org_domain ON facts(organisation_id, domain);
CREATE INDEX idx_fact_extractions_fact ON fact_extractions(fact_id);
CREATE INDEX idx_answer_library_org ON answer_library(organisation_id);
CREATE INDEX idx_questionnaires_org ON questionnaires(organisation_id);
CREATE INDEX idx_question_instances_questionnaire ON question_instances(questionnaire_id);
CREATE INDEX idx_gaps_question_instance ON gaps(question_instance_id);
CREATE INDEX idx_documents_org ON documents(organisation_id);
