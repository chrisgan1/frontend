import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const evidenceRouter = Router();

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

evidenceRouter.get("/evidence", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT e.*, u.name AS uploaded_by_name,
            (SELECT array_agg(control_id) FROM evidence_control_map m WHERE m.evidence_id = e.id) AS control_ids
     FROM evidence e JOIN users u ON u.id = e.uploaded_by
     ORDER BY e.created_at DESC`,
  );
  res.json({ evidence: rows });
});

const metaSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
  controlIds: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : [v]) : [])),
});

evidenceRouter.post(
  "/evidence",
  requireAuth,
  requireRole(...WRITE_ROLES),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File is required" });
    const parsed = metaSchema.safeParse(req.body);
    if (!parsed.success) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: parsed.error.flatten() });
    }
    const { title, description, expiresAt, controlIds } = parsed.data;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        `INSERT INTO evidence (title, description, file_path, file_name, mime_type, expires_at, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          title,
          description ?? null,
          req.file.path,
          req.file.originalname,
          req.file.mimetype,
          expiresAt || null,
          req.user!.id,
        ],
      );
      const evidence = rows[0];

      for (const controlId of controlIds) {
        await client.query(
          `INSERT INTO evidence_control_map (evidence_id, control_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [evidence.id, controlId],
        );
      }

      await client.query("COMMIT");
      await recordAudit("evidence", evidence.id, "created", req.user!.id, { title, controlIds });
      for (const controlId of controlIds) {
        await recordAudit("control", controlId, "evidence_attached", req.user!.id, { evidenceId: evidence.id });
      }
      res.status(201).json({ evidence });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
);

evidenceRouter.post(
  "/evidence/:id/controls/:controlId",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    await pool.query(
      `INSERT INTO evidence_control_map (evidence_id, control_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [req.params.id, req.params.controlId],
    );
    await recordAudit("evidence", req.params.id, "mapped_to_control", req.user!.id, {
      controlId: req.params.controlId,
    });
    await recordAudit("control", req.params.controlId, "evidence_attached", req.user!.id, {
      evidenceId: req.params.id,
    });
    res.status(204).send();
  },
);

evidenceRouter.get("/evidence/:id/download", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM evidence WHERE id = $1", [req.params.id]);
  const evidence = rows[0];
  if (!evidence) return res.status(404).json({ error: "Evidence not found" });
  res.download(path.resolve(evidence.file_path), evidence.file_name);
});
