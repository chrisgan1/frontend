import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const companyProfileRouter = Router();

companyProfileRouter.get("/company-profile", requireAuth, async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM company_profile WHERE id = true");
  res.json({ profile: rows[0] });
});

const profileSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  capabilityStatement: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

companyProfileRouter.put("/company-profile", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;

  const { rows } = await pool.query(
    `UPDATE company_profile
     SET name = $1, address = $2, capability_statement = $3, contact_name = $4, contact_email = $5
     WHERE id = true RETURNING *`,
    [d.name, d.address || "", d.capabilityStatement || "", d.contactName || "", d.contactEmail || ""],
  );
  await recordAudit("company_profile", "singleton", "updated", req.user!.id);
  res.json({ profile: rows[0] });
});
