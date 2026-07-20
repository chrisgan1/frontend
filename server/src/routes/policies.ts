import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES, APPROVE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const policiesRouter = Router();

policiesRouter.get("/policies", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.name AS owner_name,
            (SELECT max(version) FROM policy_versions pv WHERE pv.policy_id = p.id) AS latest_version
     FROM policies p JOIN users u ON u.id = p.owner_id
     ORDER BY p.created_at DESC`,
  );
  res.json({ policies: rows });
});

const createPolicySchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  renewalDate: z.string().optional(),
});

policiesRouter.post("/policies", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = createPolicySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { title, content, renewalDate } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: policyRows } = await client.query(
      `INSERT INTO policies (title, owner_id, renewal_date) VALUES ($1, $2, $3) RETURNING *`,
      [title, req.user!.id, renewalDate || null],
    );
    const policy = policyRows[0];
    const { rows: versionRows } = await client.query(
      `INSERT INTO policy_versions (policy_id, version, content, created_by) VALUES ($1, 1, $2, $3) RETURNING *`,
      [policy.id, content, req.user!.id],
    );
    await client.query("COMMIT");
    await recordAudit("policy", policy.id, "created", req.user!.id, { title });
    res.status(201).json({ policy, version: versionRows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
});

policiesRouter.get("/policies/:id", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.name AS owner_name FROM policies p JOIN users u ON u.id = p.owner_id WHERE p.id = $1`,
    [req.params.id],
  );
  const policy = rows[0];
  if (!policy) return res.status(404).json({ error: "Policy not found" });

  const versions = await pool.query(
    `SELECT pv.*, cu.name AS created_by_name, au.name AS approved_by_name,
            (SELECT count(*)::int FROM attestations a WHERE a.policy_version_id = pv.id) AS attestation_count
     FROM policy_versions pv
     JOIN users cu ON cu.id = pv.created_by
     LEFT JOIN users au ON au.id = pv.approved_by
     WHERE pv.policy_id = $1
     ORDER BY pv.version DESC`,
    [req.params.id],
  );

  res.json({ policy, versions: versions.rows });
});

const newVersionSchema = z.object({ content: z.string().min(1) });

policiesRouter.post(
  "/policies/:id/versions",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    const parsed = newVersionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { rows: maxRows } = await pool.query(
      "SELECT coalesce(max(version), 0) AS max FROM policy_versions WHERE policy_id = $1",
      [req.params.id],
    );
    const nextVersion = maxRows[0].max + 1;

    const { rows } = await pool.query(
      `INSERT INTO policy_versions (policy_id, version, content, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, nextVersion, parsed.data.content, req.user!.id],
    );
    await pool.query("UPDATE policies SET status = 'draft' WHERE id = $1", [req.params.id]);
    await recordAudit("policy", req.params.id, "new_version", req.user!.id, { version: nextVersion });
    res.status(201).json({ version: rows[0] });
  },
);

policiesRouter.post(
  "/policy-versions/:versionId/approve",
  requireAuth,
  requireRole(...APPROVE_ROLES),
  async (req, res) => {
    const { rows } = await pool.query(
      `UPDATE policy_versions SET approved_by = $1, approved_at = now() WHERE id = $2 RETURNING *`,
      [req.user!.id, req.params.versionId],
    );
    const version = rows[0];
    if (!version) return res.status(404).json({ error: "Policy version not found" });
    await pool.query("UPDATE policies SET status = 'approved' WHERE id = $1", [version.policy_id]);
    await recordAudit("policy_version", version.id, "approved", req.user!.id);
    res.json({ version });
  },
);

policiesRouter.post("/policy-versions/:versionId/attest", requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO attestations (policy_version_id, user_id) VALUES ($1, $2) RETURNING *`,
      [req.params.versionId, req.user!.id],
    );
    await recordAudit("policy_version", req.params.versionId, "attested", req.user!.id);
    res.status(201).json({ attestation: rows[0] });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Already attested to this version" });
    throw err;
  }
});
