import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

export const auditRouter = Router();

auditRouter.get("/audit-log", requireAuth, async (req, res) => {
  const { entityType, entityId } = req.query;
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (entityType) {
    params.push(entityType);
    conditions.push(`entity_type = $${params.length}`);
  }
  if (entityId) {
    params.push(entityId);
    conditions.push(`entity_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `SELECT al.*, u.name AS user_name
     FROM audit_log al LEFT JOIN users u ON u.id = al.user_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT 200`,
    params,
  );
  res.json({ entries: rows });
});
