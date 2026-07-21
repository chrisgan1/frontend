-- Tier 2 of the compliance-passport AI feature: draft an answer from vault
-- evidence (documents with no existing passport entry) using the Anthropic
-- API, always requiring human confirmation before it becomes a real answer.

ALTER TABLE request_items ADD COLUMN ai_draft_answer TEXT;
ALTER TABLE request_items ADD COLUMN ai_draft_source_document_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE request_items DROP CONSTRAINT request_items_status_check;
ALTER TABLE request_items ADD CONSTRAINT request_items_status_check
  CHECK (status IN ('unmatched', 'suggested', 'ai_drafted', 'confirmed'));
