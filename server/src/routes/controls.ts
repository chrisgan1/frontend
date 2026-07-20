import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const controlsRouter = Router();

controlsRouter.get("/frameworks", requireAuth, async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM frameworks ORDER BY name");
  res.json({ frameworks: rows });
});

controlsRouter.get("/controls", requireAuth, async (req, res) => {
  const { framework, category, profileLevel } = req.query;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (framework) {
    params.push(framework);
    conditions.push(`f.key = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`c.category = $${params.length}`);
  }
  if (profileLevel) {
    params.push(profileLevel);
    conditions.push(`c.profile_level = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT c.*, f.key AS framework_key, f.name AS framework_name,
            (SELECT count(*)::int FROM evidence_control_map m WHERE m.control_id = c.id) AS evidence_count
     FROM controls c
     JOIN frameworks f ON f.id = c.framework_id
     ${where}
     ORDER BY c.code`,
    params,
  );
  res.json({ controls: rows });
});

controlsRouter.get("/controls/:id", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, f.key AS framework_key, f.name AS framework_name
     FROM controls c JOIN frameworks f ON f.id = c.framework_id
     WHERE c.id = $1`,
    [req.params.id],
  );
  const control = rows[0];
  if (!control) return res.status(404).json({ error: "Control not found" });

  const evidence = await pool.query(
    `SELECT e.* FROM evidence e
     JOIN evidence_control_map m ON m.evidence_id = e.id
     WHERE m.control_id = $1
     ORDER BY e.created_at DESC`,
    [req.params.id],
  );

  res.json({ control, evidence: evidence.rows });
});

const controlSchema = z.object({
  frameworkKey: z.string(),
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.string(),
  profileLevel: z.enum(["very_low", "low", "moderate", "high"]),
});

controlsRouter.post("/controls", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = controlSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { frameworkKey, code, title, description, category, profileLevel } = parsed.data;
  const framework = await pool.query("SELECT id FROM frameworks WHERE key = $1", [frameworkKey]);
  if (!framework.rows[0]) return res.status(400).json({ error: "Unknown framework" });

  try {
    const { rows } = await pool.query(
      `INSERT INTO controls (framework_id, code, title, description, category, profile_level)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [framework.rows[0].id, code, title, description ?? null, category, profileLevel],
    );
    await recordAudit("control", rows[0].id, "created", req.user!.id, rows[0]);
    res.status(201).json({ control: rows[0] });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Control code already exists for this framework" });
    throw err;
  }
});
