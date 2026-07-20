import { Router } from "express";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import fs from "node:fs";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";
import { bestMatch } from "../utils/match.js";
import { draftAnswerFromEvidence, DraftUnavailableError } from "../services/evidenceDraft.js";

export const requestsRouter = Router();

requestsRouter.get("/requests", requireAuth, async (_req, res) => {
  const { rows } = await pool.query(`
    SELECT r.*,
           (SELECT count(*)::int FROM request_items ri WHERE ri.request_id = r.id) AS item_count,
           (SELECT count(*)::int FROM request_items ri WHERE ri.request_id = r.id AND ri.status = 'confirmed') AS confirmed_count
    FROM requests r ORDER BY r.created_at DESC
  `);
  res.json({ requests: rows });
});

const requestSchema = z.object({
  requesterName: z.string().min(1),
  requesterContact: z.string().optional(),
  dueDate: z.string().optional(),
});

requestsRouter.post("/requests", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { requesterName, requesterContact, dueDate } = parsed.data;

  const { rows } = await pool.query(
    `INSERT INTO requests (requester_name, requester_contact, due_date, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
    [requesterName, requesterContact || null, dueDate || null, req.user!.id],
  );
  await recordAudit("request", rows[0].id, "created", req.user!.id, { requesterName });
  res.status(201).json({ request: rows[0] });
});

async function loadRequestItems(requestId: string) {
  const { rows } = await pool.query(
    `SELECT ri.*,
            sq.question AS suggested_question, sq.answer AS suggested_answer,
            mq.question AS matched_question, mq.answer AS matched_answer,
            (SELECT array_agg(title) FROM documents WHERE id = ANY(ri.ai_draft_source_document_ids))
              AS ai_draft_source_titles
     FROM request_items ri
     LEFT JOIN qa_entries sq ON sq.id = ri.suggested_qa_entry_id
     LEFT JOIN qa_entries mq ON mq.id = ri.matched_qa_entry_id
     WHERE ri.request_id = $1
     ORDER BY ri.sort_order`,
    [requestId],
  );
  return rows;
}

requestsRouter.get("/requests/:id", requireAuth, async (req, res) => {
  const request = await pool.query("SELECT * FROM requests WHERE id = $1", [req.params.id]);
  if (!request.rows[0]) return res.status(404).json({ error: "Request not found" });
  const items = await loadRequestItems(req.params.id);
  res.json({ request: request.rows[0], items });
});

const addItemsSchema = z.object({
  questions: z.array(z.string().min(1)).min(1),
});

requestsRouter.post("/requests/:id/items", requireAuth, requireRole(...WRITE_ROLES), async (req, res) => {
  const parsed = addItemsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const passport = await pool.query("SELECT id, question FROM qa_entries");
  const { rows: maxRows } = await pool.query(
    "SELECT coalesce(max(sort_order), -1) AS max FROM request_items WHERE request_id = $1",
    [req.params.id],
  );
  let nextOrder = maxRows[0].max + 1;

  for (const questionText of parsed.data.questions) {
    const match = bestMatch(questionText, passport.rows);
    await pool.query(
      `INSERT INTO request_items (request_id, question_text, suggested_qa_entry_id, suggested_score, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.id, questionText, match.id, match.score, match.id ? "suggested" : "unmatched", nextOrder],
    );
    nextOrder += 1;
  }

  await recordAudit("request", req.params.id, "items_added", req.user!.id, { count: parsed.data.questions.length });
  const items = await loadRequestItems(req.params.id);
  res.status(201).json({ items });
});

const confirmItemSchema = z.object({
  matchedQaEntryId: z.string().uuid().nullable().optional(),
  customAnswer: z.string().optional(),
});

requestsRouter.patch(
  "/requests/:id/items/:itemId",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    const parsed = confirmItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { rows } = await pool.query(
      `UPDATE request_items
       SET matched_qa_entry_id = COALESCE($1, matched_qa_entry_id),
           custom_answer = COALESCE($2, custom_answer),
           status = 'confirmed'
       WHERE id = $3 AND request_id = $4 RETURNING *`,
      [parsed.data.matchedQaEntryId, parsed.data.customAnswer, req.params.itemId, req.params.id],
    );
    if (!rows[0]) return res.status(404).json({ error: "Request item not found" });
    await recordAudit("request_item", req.params.itemId, "confirmed", req.user!.id);
    res.json({ item: rows[0] });
  },
);

requestsRouter.post(
  "/requests/:id/items/:itemId/draft",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    const item = (
      await pool.query("SELECT * FROM request_items WHERE id = $1 AND request_id = $2", [
        req.params.itemId,
        req.params.id,
      ])
    ).rows[0];
    if (!item) return res.status(404).json({ error: "Request item not found" });
    if (item.status === "confirmed") {
      return res.status(400).json({ error: "This item is already confirmed" });
    }

    const docs = (
      await pool.query(
        "SELECT id, title, mime_type AS \"mimeType\", file_path AS \"filePath\" FROM documents ORDER BY created_at DESC LIMIT 30",
      )
    ).rows;

    try {
      const draft = await draftAnswerFromEvidence(item.question_text, docs);

      const { rows } = await pool.query(
        `UPDATE request_items
         SET ai_draft_answer = $1, ai_draft_source_document_ids = $2,
             status = CASE WHEN $3 THEN 'ai_drafted' ELSE status END
         WHERE id = $4 RETURNING *`,
        [draft.foundEvidence ? draft.answer : null, draft.usedDocumentIds, draft.foundEvidence, item.id],
      );
      await recordAudit("request_item", item.id, "ai_draft_generated", req.user!.id, {
        foundEvidence: draft.foundEvidence,
        sourceCount: draft.usedDocumentIds.length,
      });
      res.json({ item: rows[0], foundEvidence: draft.foundEvidence });
    } catch (err) {
      if (err instanceof DraftUnavailableError) {
        return res.status(502).json({ error: err.message });
      }
      throw err;
    }
  },
);

requestsRouter.post("/requests/:id/export", requireAuth, async (req, res) => {
  const request = await pool.query("SELECT * FROM requests WHERE id = $1", [req.params.id]);
  if (!request.rows[0]) return res.status(404).json({ error: "Request not found" });
  const items = await loadRequestItems(req.params.id);
  const company = (await pool.query("SELECT * FROM company_profile WHERE id = true")).rows[0];

  const evidenceIds = new Set<string>();
  for (const item of items) {
    const qaId = item.matched_qa_entry_id ?? item.suggested_qa_entry_id;
    if (qaId) {
      const evidence = await pool.query(
        "SELECT document_id FROM qa_entry_evidence WHERE qa_entry_id = $1",
        [qaId],
      );
      evidence.rows.forEach((r) => evidenceIds.add(r.document_id));
    }
    (item.ai_draft_source_document_ids ?? []).forEach((id: string) => evidenceIds.add(id));
  }
  const docs = evidenceIds.size
    ? (await pool.query("SELECT * FROM documents WHERE id = ANY($1::uuid[])", [[...evidenceIds]])).rows
    : [];

  await pool.query(
    "INSERT INTO request_exports (request_id, generated_by) VALUES ($1, $2)",
    [req.params.id, req.user!.id],
  );
  await pool.query("UPDATE requests SET status = 'submitted' WHERE id = $1", [req.params.id]);
  await recordAudit("request", req.params.id, "exported", req.user!.id, { itemCount: items.length });

  const generatedAt = new Date();
  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="response-${request.rows[0].requester_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${generatedAt.toISOString().slice(0, 10)}.zip"`,
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    console.error("Request export archive error:", err);
    res.destroy(err);
  });
  archive.pipe(res);

  const doc = new PDFDocument({ margin: 50 });
  const pdfChunks: Buffer[] = [];
  doc.on("data", (chunk) => pdfChunks.push(chunk));
  const pdfDone = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  doc.fontSize(20).text(company?.name || "Company");
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#666").text(
    `Response to ${request.rows[0].requester_name} — generated ${generatedAt.toDateString()}`,
  );
  doc.fillColor("#000");
  doc.moveDown(1);

  for (const item of items) {
    const answer = item.custom_answer || item.matched_answer || item.suggested_answer || "Not yet answered.";
    doc.fontSize(12).text(item.question_text, { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(11).text(answer);
    doc.moveDown(0.8);
  }

  doc.moveDown(0.5);
  doc.fontSize(9).fillColor("#666").text(
    `This response is valid as of ${generatedAt.toDateString()} and reflects passport data recorded at that time.`,
  );

  doc.end();
  await pdfDone;

  archive.append(Buffer.concat(pdfChunks), { name: "response.pdf" });
  for (const d of docs) {
    if (fs.existsSync(d.file_path)) {
      archive.append(fs.createReadStream(d.file_path), { name: `evidence/${d.file_name}` });
    }
  }

  await archive.finalize();
});
