-- Pivot from the DEFSTAN control-library/policy-lifecycle model to the
-- sharper "Evidence Hub" MVP: tagged document vault, certification
-- tracking, clearance tracking with project matching, and supplier pack
-- generation.

DROP TABLE IF EXISTS attestations;
DROP TABLE IF EXISTS policy_versions;
DROP TABLE IF EXISTS policies;
DROP TABLE IF EXISTS evidence_control_map;
DROP TABLE IF EXISTS controls;
DROP TABLE IF EXISTS frameworks;

ALTER TABLE evidence RENAME TO documents;
ALTER TABLE documents ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  valid_from DATE,
  valid_until DATE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role_title TEXT,
  bpss_cleared BOOLEAN NOT NULL DEFAULT false,
  sc_status TEXT NOT NULL DEFAULT 'none' CHECK (sc_status IN ('none', 'in_progress', 'granted')),
  sc_expiry DATE,
  dv_status TEXT NOT NULL DEFAULT 'none' CHECK (dv_status IN ('none', 'in_progress', 'granted')),
  dv_expiry DATE,
  sponsor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  required_clearance TEXT NOT NULL DEFAULT 'none' CHECK (required_clearance IN ('none', 'bpss', 'sc', 'dv')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE project_assignments (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (employee_id, project_id)
);

CREATE TABLE company_profile (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  name TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  capability_statement TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT ''
);
INSERT INTO company_profile (id) VALUES (true);

CREATE TABLE supplier_pack_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- entity_id needs to hold non-UUID identifiers too (e.g. the company_profile singleton).
ALTER TABLE audit_log ALTER COLUMN entity_id TYPE TEXT;

CREATE INDEX idx_certifications_valid_until ON certifications(valid_until);
CREATE INDEX idx_employees_sc_expiry ON employees(sc_expiry);
CREATE INDEX idx_employees_dv_expiry ON employees(dv_expiry);
