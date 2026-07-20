-- Reframe around the "compliance passport" idea: a reusable Q&A library
-- answered once, applied to specific incoming assurance requests via
-- text-matching, instead of a generic static export.

DROP TABLE IF EXISTS supplier_pack_generations;

CREATE TABLE qa_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE qa_entry_evidence (
  qa_entry_id UUID NOT NULL REFERENCES qa_entries(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  PRIMARY KEY (qa_entry_id, document_id)
);

CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name TEXT NOT NULL,
  requester_contact TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'submitted')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  suggested_qa_entry_id UUID REFERENCES qa_entries(id) ON DELETE SET NULL,
  suggested_score REAL,
  matched_qa_entry_id UUID REFERENCES qa_entries(id) ON DELETE SET NULL,
  custom_answer TEXT,
  status TEXT NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'suggested', 'confirmed')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE request_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_request_items_request ON request_items(request_id);
CREATE INDEX idx_qa_entries_topic ON qa_entries(topic);
