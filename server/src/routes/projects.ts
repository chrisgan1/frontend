import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const projectsRouter = Router();

projectsRouter.get("/projects", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*,
            (SELECT count(*)::int FROM project_assignments pa WHERE pa.project_id = p.id) AS assigned_count
     FROM projects p ORDER BY p.created_at DESC`,
  );
  res.json({ projects: rows });
});

const projectSchema = z.object({
  name: z.string().min(1),
  requiredClearance: z.enum(["none", "bpss", "sc", "dv"]),
});

projectsRouter.post("/projects", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { rows } = await pool.query(
    `INSERT INTO projects (name, required_clearance) VALUES ($1, $2) RETURNING *`,
    [parsed.data.name, parsed.data.requiredClearance],
  );
  await recordAudit("project", rows[0].id, "created", req.user!.id, parsed.data);
  res.status(201).json({ project: rows[0] });
});

// Clearance the employee holds that isn't expired, treating DV > SC > BPSS > none.
const CLEARANCE_MATCH_SQL = `
  CASE
    WHEN e.dv_status = 'granted' AND (e.dv_expiry IS NULL OR e.dv_expiry >= current_date) THEN 'dv'
    WHEN e.sc_status = 'granted' AND (e.sc_expiry IS NULL OR e.sc_expiry >= current_date) THEN 'sc'
    WHEN e.bpss_cleared THEN 'bpss'
    ELSE 'none'
  END
`;
const CLEARANCE_RANK_SQL = `
  CASE ${CLEARANCE_MATCH_SQL}
    WHEN 'dv' THEN 3 WHEN 'sc' THEN 2 WHEN 'bpss' THEN 1 ELSE 0
  END
`;
const REQUIRED_RANK_SQL = `CASE p.required_clearance WHEN 'dv' THEN 3 WHEN 'sc' THEN 2 WHEN 'bpss' THEN 1 ELSE 0 END`;

projectsRouter.get("/projects/:id/eligible-employees", requireAuth, async (req, res) => {
  const project = await pool.query("SELECT * FROM projects WHERE id = $1", [req.params.id]);
  if (!project.rows[0]) return res.status(404).json({ error: "Project not found" });

  const { rows } = await pool.query(
    `SELECT e.*, ${CLEARANCE_MATCH_SQL} AS current_clearance
     FROM employees e, projects p
     WHERE p.id = $1 AND ${CLEARANCE_RANK_SQL} >= ${REQUIRED_RANK_SQL}
     ORDER BY e.name`,
    [req.params.id],
  );
  res.json({ project: project.rows[0], eligibleEmployees: rows });
});

projectsRouter.post(
  "/projects/:id/assign/:employeeId",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    await pool.query(
      `INSERT INTO project_assignments (project_id, employee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, req.params.employeeId],
    );
    await recordAudit("project", req.params.id, "employee_assigned", req.user!.id, {
      employeeId: req.params.employeeId,
    });
    res.status(204).send();
  },
);
