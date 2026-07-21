import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";
import { CANONICAL_FACTS, DOMAIN_LABELS } from "../services/canonicalFacts.js";

export const factsRouter = Router();

factsRouter.get("/facts", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT f.*,
       COALESCE(
         (SELECT json_agg(json_build_object(
             'id', fe.id, 'documentId', fe.document_id, 'documentTitle', d.title,
             'pageReference', fe.page_reference, 'snippet', fe.snippet,
             'extractedValue', fe.extracted_value, 'confidence', fe.confidence,
             'createdAt', fe.created_at
           ) ORDER BY fe.created_at DESC)
          FROM fact_extractions fe JOIN documents d ON d.id = fe.document_id
          WHERE fe.fact_id = f.id), '[]'
       ) AS extractions
     FROM facts f
     WHERE f.organisation_id = $1
     ORDER BY f.domain, f.key`,
    [req.user!.organisationId],
  );

  const verifiedCount = rows.filter((r) => r.status === "verified").length;
  res.json({
    facts: rows,
    domainLabels: DOMAIN_LABELS,
    totalCanonical: CANONICAL_FACTS.length,
    verifiedCount,
    completeness: CANONICAL_FACTS.length ? verifiedCount / CANONICAL_FACTS.length : 0,
  });
});

const updateSchema = z.object({
  value: z.string().min(1),
  expiry: z.string().optional(),
});

// Confirming an extracted value, correcting it, and resolving a conflict
// (picking one of the disputed values, or entering a new one) are all the
// same operation: set the value and mark it human-verified. This is the
// spec's "Review Ceremony" — the step that makes a later director
// attestation legally meaningful.
factsRouter.patch("/facts/:id", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { rows } = await pool.query(
    `UPDATE facts
     SET current_value = $1, status = 'verified', conflict = false,
         verified_by = $2, verified_on = now(), expiry = $3, updated_at = now()
     WHERE id = $4 AND organisation_id = $5
     RETURNING *`,
    [parsed.data.value, req.user!.id, parsed.data.expiry || null, req.params.id, req.user!.organisationId],
  );
  const fact = rows[0];
  if (!fact) return res.status(404).json({ error: "Fact not found" });

  await recordAudit("fact", fact.id, "verified", req.user!.id, { value: parsed.data.value });
  res.json({ fact });
});
