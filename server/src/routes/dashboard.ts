import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

const EXPIRING_SOON_DAYS = 45;

dashboardRouter.get("/dashboard", requireAuth, async (_req, res) => {
  const [certifications, headcounts, packCount, docCount] = await Promise.all([
    pool.query(`SELECT id, name, valid_until FROM certifications ORDER BY valid_until ASC`),
    pool.query(`
      SELECT
        count(*)::int AS total_employees,
        count(*) FILTER (WHERE bpss_cleared)::int AS bpss_cleared,
        count(*) FILTER (WHERE sc_status = 'granted' AND (sc_expiry IS NULL OR sc_expiry >= current_date))::int AS sc_cleared,
        count(*) FILTER (WHERE dv_status = 'granted' AND (dv_expiry IS NULL OR dv_expiry >= current_date))::int AS dv_cleared
      FROM employees
    `),
    pool.query(`SELECT count(*)::int AS n FROM supplier_pack_generations`),
    pool.query(`SELECT count(*)::int AS n FROM documents`),
  ]);

  const certsWithStatus = certifications.rows.map((row) => {
    const daysUntil = Math.ceil((new Date(row.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const status = daysUntil < 0 ? "expired" : daysUntil <= EXPIRING_SOON_DAYS ? "expiring_soon" : "valid";
    return { ...row, status, days_until_expiry: daysUntil };
  });

  res.json({
    certifications: certsWithStatus,
    headcounts: headcounts.rows[0],
    supplierPacksGenerated: packCount.rows[0].n,
    documentsCount: docCount.rows[0].n,
  });
});
