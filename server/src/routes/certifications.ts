import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const certificationsRouter = Router();

const EXPIRING_SOON_DAYS = 45;

function withStatus(row: any) {
  const daysUntil = Math.ceil(
    (new Date(row.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const status = daysUntil < 0 ? "expired" : daysUntil <= EXPIRING_SOON_DAYS ? "expiring_soon" : "valid";
  return { ...row, status, days_until_expiry: daysUntil };
}

certificationsRouter.get("/certifications", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, d.title AS document_title
     FROM certifications c LEFT JOIN documents d ON d.id = c.document_id
     ORDER BY c.valid_until ASC`,
  );
  res.json({ certifications: rows.map(withStatus) });
});

const certSchema = z.object({
  name: z.string().min(1),
  validFrom: z.string().optional(),
  validUntil: z.string(),
  documentId: z.string().uuid().optional(),
});

certificationsRouter.post("/certifications", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = certSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { name, validFrom, validUntil, documentId } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO certifications (name, valid_from, valid_until, document_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, validFrom || null, validUntil, documentId || null],
  );
  await recordAudit("certification", rows[0].id, "created", req.user!.id, { name, validUntil });
  res.status(201).json({ certification: withStatus(rows[0]) });
});

certificationsRouter.delete(
  "/certifications/:id",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    await pool.query("DELETE FROM certifications WHERE id = $1", [req.params.id]);
    await recordAudit("certification", req.params.id, "deleted", req.user!.id);
    res.status(204).send();
  },
);
