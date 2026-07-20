import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard", requireAuth, async (_req, res) => {
  const [totals, byCategory, overdueAttestations, overduePolicies] = await Promise.all([
    pool.query(`
      SELECT
        (SELECT count(*)::int FROM controls) AS total_controls,
        (SELECT count(DISTINCT control_id)::int FROM evidence_control_map) AS controls_with_evidence,
        (SELECT count(*)::int FROM policies) AS total_policies,
        (SELECT count(*)::int FROM policies WHERE status = 'approved') AS approved_policies,
        (SELECT count(*)::int FROM evidence WHERE expires_at IS NOT NULL AND expires_at < current_date) AS expired_evidence
    `),
    pool.query(`
      SELECT c.category,
             count(*)::int AS total,
             count(m.control_id)::int AS with_evidence
      FROM controls c
      LEFT JOIN (SELECT DISTINCT control_id FROM evidence_control_map) m ON m.control_id = c.id
      GROUP BY c.category
      ORDER BY c.category
    `),
    pool.query(`
      SELECT p.id, p.title, pv.version, pv.id AS version_id
      FROM policies p
      JOIN policy_versions pv ON pv.policy_id = p.id AND pv.version = (
        SELECT max(version) FROM policy_versions WHERE policy_id = p.id
      )
      WHERE p.status = 'approved'
      AND NOT EXISTS (
        SELECT 1 FROM attestations a WHERE a.policy_version_id = pv.id
      )
    `),
    pool.query(`
      SELECT id, title, renewal_date FROM policies
      WHERE renewal_date IS NOT NULL AND renewal_date < current_date
      ORDER BY renewal_date
    `),
  ]);

  res.json({
    totals: totals.rows[0],
    byCategory: byCategory.rows,
    overdueAttestations: overdueAttestations.rows,
    overduePolicies: overduePolicies.rows,
  });
});
