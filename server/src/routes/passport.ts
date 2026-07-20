import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const passportRouter = Router();

export const QA_TOPICS = [
  "Security",
  "Quality",
  "Insurance",
  "People",
  "Export Control",
  "Data Protection",
  "Modern Slavery",
  "Financial",
] as const;

passportRouter.get("/passport", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT q.*,
            (SELECT array_agg(json_build_object('id', d.id, 'title', d.title))
             FROM qa_entry_evidence qe JOIN documents d ON d.id = qe.document_id
             WHERE qe.qa_entry_id = q.id) AS evidence
     FROM qa_entries q ORDER BY q.topic, q.created_at`,
  );
  res.json({ entries: rows });
});

const entrySchema = z.object({
  topic: z.enum(QA_TOPICS),
  question: z.string().min(1),
  answer: z.string().min(1),
  documentIds: z.array(z.string().uuid()).optional(),
});

passportRouter.post("/passport", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { topic, question, answer, documentIds } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO qa_entries (topic, question, answer, status) VALUES ($1, $2, $3, 'confirmed') RETURNING *`,
    [topic, question, answer],
  );
  const entry = rows[0];

  for (const docId of documentIds ?? []) {
    await pool.query(
      `INSERT INTO qa_entry_evidence (qa_entry_id, document_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [entry.id, docId],
    );
  }

  await recordAudit("qa_entry", entry.id, "created", req.user!.id, { topic, question });
  res.status(201).json({ entry });
});

const updateSchema = z.object({
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  status: z.enum(["draft", "confirmed"]).optional(),
});

passportRouter.patch("/passport/:id", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(parsed.data)) {
    params.push(value);
    sets.push(`${key} = $${params.length}`);
  }
  if (sets.length === 0) return res.status(400).json({ error: "No fields to update" });
  params.push(req.params.id);

  const { rows } = await pool.query(
    `UPDATE qa_entries SET ${sets.join(", ")}, updated_at = now() WHERE id = $${params.length} RETURNING *`,
    params,
  );
  if (!rows[0]) return res.status(404).json({ error: "Passport entry not found" });
  await recordAudit("qa_entry", req.params.id, "updated", req.user!.id, parsed.data);
  res.json({ entry: rows[0] });
});

passportRouter.delete("/passport/:id", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  await pool.query("DELETE FROM qa_entries WHERE id = $1", [req.params.id]);
  await recordAudit("qa_entry", req.params.id, "deleted", req.user!.id);
  res.status(204).send();
});
