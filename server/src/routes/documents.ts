import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const documentsRouter = Router();

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

export const DOCUMENT_TAGS = ["Security", "Quality", "Insurance", "People", "Export Control"] as const;

documentsRouter.get("/documents", requireAuth, async (req, res) => {
  const { tag } = req.query;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (tag) {
    params.push(tag);
    conditions.push(`$${params.length} = ANY(d.tags)`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { rows } = await pool.query(
    `SELECT d.*, u.name AS uploaded_by_name
     FROM documents d JOIN users u ON u.id = d.uploaded_by
     ${where}
     ORDER BY d.created_at DESC`,
    params,
  );
  res.json({ documents: rows });
});

const metaSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v ? (Array.isArray(v) ? v : [v]) : []))
    .refine((tags) => tags.every((t) => (DOCUMENT_TAGS as readonly string[]).includes(t)), {
      message: `Tags must be one of: ${DOCUMENT_TAGS.join(", ")}`,
    }),
});

documentsRouter.post(
  "/documents",
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
    const { title, description, expiresAt, tags } = parsed.data;

    const { rows } = await pool.query(
      `INSERT INTO documents (title, description, file_path, file_name, mime_type, expires_at, tags, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        title,
        description ?? null,
        req.file.path,
        req.file.originalname,
        req.file.mimetype,
        expiresAt || null,
        tags,
        req.user!.id,
      ],
    );
    const document = rows[0];
    await recordAudit("document", document.id, "uploaded", req.user!.id, { title, tags });
    res.status(201).json({ document });
  },
);

documentsRouter.get("/documents/:id/download", requireAuth, async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM documents WHERE id = $1", [req.params.id]);
  const document = rows[0];
  if (!document) return res.status(404).json({ error: "Document not found" });
  res.download(path.resolve(document.file_path), document.file_name);
});
