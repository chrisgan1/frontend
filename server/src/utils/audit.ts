import { pool } from "../db/pool.js";

export async function recordAudit(
  entityType: string,
  entityId: string,
  action: string,
  userId: string | undefined,
  diff?: unknown,
) {
  await pool.query(
    `INSERT INTO audit_log (entity_type, entity_id, action, user_id, diff) VALUES ($1, $2, $3, $4, $5)`,
    [entityType, entityId, action, userId ?? null, diff ? JSON.stringify(diff) : null],
  );
}
