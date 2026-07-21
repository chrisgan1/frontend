import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const gapsRouter = Router();

gapsRouter.get("/gaps", requireAuth, async (req, res) => {
  const { questionnaireId } = req.query;
  const conditions = ["q.organisation_id = $1"];
  const params: unknown[] = [req.user!.organisationId];
  if (questionnaireId) {
    params.push(questionnaireId);
    conditions.push(`q.id = $${params.length}`);
  }

  const { rows } = await pool.query(
    `SELECT g.*, qi.question_text, q.id AS questionnaire_id, q.filename AS questionnaire_filename,
       u.name AS owner_name
     FROM gaps g
     JOIN question_instances qi ON qi.id = g.question_instance_id
     JOIN questionnaires q ON q.id = qi.questionnaire_id
     LEFT JOIN users u ON u.id = g.owner_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY g.created_at DESC`,
    params,
  );
  res.json({ gaps: rows });
});

const updateSchema = z.object({
  note: z.string().optional(),
  status: z.enum(["open", "closed"]).optional(),
  ownerId: z.string().uuid().optional(),
  dueDate: z.string().optional(),
  type: z.enum(["a", "b", "c", "d"]).optional(),
});

gapsRouter.patch("/gaps/:id", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const { rows } = await pool.query(
    `UPDATE gaps g SET
       note = COALESCE($1, g.note),
       status = COALESCE($2, g.status),
       owner_id = COALESCE($3, g.owner_id),
       due_date = COALESCE($4, g.due_date),
       type = COALESCE($5, g.type)
     FROM question_instances qi, questionnaires q
     WHERE g.id = $6 AND g.question_instance_id = qi.id AND qi.questionnaire_id = q.id AND q.organisation_id = $7
     RETURNING g.*`,
    [d.note ?? null, d.status ?? null, d.ownerId ?? null, d.dueDate ?? null, d.type ?? null, req.params.id, req.user!.organisationId],
  );
  const gap = rows[0];
  if (!gap) return res.status(404).json({ error: "Gap not found" });

  await recordAudit("gap", gap.id, "updated", req.user!.id, d);
  res.json({ gap });
});
