import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const employeesRouter = Router();

employeesRouter.get("/employees", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT e.*,
            (SELECT array_agg(json_build_object('id', p.id, 'name', p.name))
             FROM project_assignments pa JOIN projects p ON p.id = pa.project_id
             WHERE pa.employee_id = e.id) AS projects
     FROM employees e ORDER BY e.name`,
  );
  res.json({ employees: rows });
});

const employeeSchema = z.object({
  name: z.string().min(1),
  roleTitle: z.string().optional(),
  bpssCleared: z.boolean().optional(),
  scStatus: z.enum(["none", "in_progress", "granted"]).optional(),
  scExpiry: z.string().optional(),
  dvStatus: z.enum(["none", "in_progress", "granted"]).optional(),
  dvExpiry: z.string().optional(),
  sponsor: z.string().optional(),
});

employeesRouter.post("/employees", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO employees (name, role_title, bpss_cleared, sc_status, sc_expiry, dv_status, dv_expiry, sponsor)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      d.name,
      d.roleTitle || null,
      d.bpssCleared ?? false,
      d.scStatus ?? "none",
      d.scExpiry || null,
      d.dvStatus ?? "none",
      d.dvExpiry || null,
      d.sponsor || null,
    ],
  );
  await recordAudit("employee", rows[0].id, "created", req.user!.id, { name: d.name });
  res.status(201).json({ employee: rows[0] });
});

employeesRouter.delete("/employees/:id", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  await pool.query("DELETE FROM employees WHERE id = $1", [req.params.id]);
  await recordAudit("employee", req.params.id, "deleted", req.user!.id);
  res.status(204).send();
});
