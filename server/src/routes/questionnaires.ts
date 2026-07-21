import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, WRITE_ROLES, ANSWER_ROLES, APPROVER_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";
import { parseQuestionnaire, getWorkbookPreview, parseWithHint, type ParsedQuestion } from "../services/questionnaireParser.js";
import { runAnswerEngine } from "../services/answerEngine.js";
import { exportFilledQuestionnaire } from "../services/exportFillback.js";

export const questionnairesRouter = Router();

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
  fileFilter: (_req, file, cb) => {
    if (/\.xlsx$/i.test(file.originalname)) cb(null, true);
    else cb(new Error("Only .xlsx files are supported in this build"));
  },
});

async function insertQuestions(questionnaireId: string, questions: ParsedQuestion[]) {
  for (const q of questions) {
    const { rows } = await pool.query(
      `INSERT INTO question_instances (questionnaire_id, sheet_name, row_ref, question_text, response_type, section, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [questionnaireId, q.sheetName, q.rowRef, q.questionText, q.responseType, q.section, q.sortOrder],
    );
    await pool.query(`INSERT INTO answers (question_instance_id) VALUES ($1)`, [rows[0].id]);
  }
}

questionnairesRouter.get("/questionnaires", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT q.*, u.name AS uploaded_by_name,
       (SELECT count(*)::int FROM question_instances qi WHERE qi.questionnaire_id = q.id) AS question_count,
       (SELECT count(*)::int FROM question_instances qi JOIN answers a ON a.question_instance_id = qi.id
        WHERE qi.questionnaire_id = q.id AND a.status = 'green') AS green_count
     FROM questionnaires q JOIN users u ON u.id = q.uploaded_by
     WHERE q.organisation_id = $1
     ORDER BY q.uploaded_at DESC`,
    [req.user!.organisationId],
  );
  res.json({ questionnaires: rows });
});

questionnairesRouter.post(
  "/questionnaires",
  requireAuth,
  requireRole(...WRITE_ROLES),
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "File is required" });

    const { rows } = await pool.query(
      `INSERT INTO questionnaires (organisation_id, filename, file_path, uploaded_by, status)
       VALUES ($1, $2, $3, $4, 'parsing') RETURNING *`,
      [req.user!.organisationId, req.file.originalname, req.file.path, req.user!.id],
    );
    const questionnaire = rows[0];

    const parsed = await parseQuestionnaire(req.file.path);
    if (parsed.questions.length > 0) {
      await insertQuestions(questionnaire.id, parsed.questions);
      await pool.query(`UPDATE questionnaires SET status = 'ready' WHERE id = $1`, [questionnaire.id]);
      questionnaire.status = "ready";
    }
    await recordAudit("questionnaire", questionnaire.id, "uploaded", req.user!.id, { filename: req.file.originalname });

    const response: Record<string, unknown> = {
      questionnaire,
      questionCount: parsed.questions.length,
      unmappedSheets: parsed.unmappedSheets,
    };
    if (parsed.needsMapping) {
      response.needsMapping = true;
      response.preview = await getWorkbookPreview(req.file.path);
    }
    res.status(201).json(response);
  },
);

const mapSchema = z.object({
  sheetName: z.string().min(1),
  headerRow: z.number().int().min(1),
  questionCol: z.number().int().min(1),
  responseCol: z.number().int().min(1),
});

questionnairesRouter.post(
  "/questionnaires/:id/map",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    const parsed = mapSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { rows } = await pool.query(
      `SELECT * FROM questionnaires WHERE id = $1 AND organisation_id = $2`,
      [req.params.id, req.user!.organisationId],
    );
    const questionnaire = rows[0];
    if (!questionnaire) return res.status(404).json({ error: "Questionnaire not found" });

    const questions = await parseWithHint(questionnaire.file_path, parsed.data);
    if (questions.length === 0) {
      return res.status(400).json({ error: "No questions found with those column numbers" });
    }
    await insertQuestions(questionnaire.id, questions);
    await pool.query(`UPDATE questionnaires SET status = 'ready' WHERE id = $1`, [questionnaire.id]);
    res.json({ questionCount: questions.length });
  },
);

questionnairesRouter.get("/questionnaires/:id", requireAuth, async (req, res) => {
  const { rows: qRows } = await pool.query(
    `SELECT * FROM questionnaires WHERE id = $1 AND organisation_id = $2`,
    [req.params.id, req.user!.organisationId],
  );
  const questionnaire = qRows[0];
  if (!questionnaire) return res.status(404).json({ error: "Questionnaire not found" });

  const { rows: items } = await pool.query(
    `SELECT qi.*, a.text AS answer_text, a.status AS answer_status, a.confidence, a.source,
       a.cited_fact_ids, a.cited_document_ids, a.is_override, a.confirmed, a.updated_at AS answer_updated_at,
       g.id AS gap_id, g.type AS gap_type, g.note AS gap_note, g.status AS gap_status
     FROM question_instances qi
     JOIN answers a ON a.question_instance_id = qi.id
     LEFT JOIN gaps g ON g.question_instance_id = qi.id
     WHERE qi.questionnaire_id = $1
     ORDER BY qi.sort_order`,
    [questionnaire.id],
  );

  const total = items.length;
  const green = items.filter((i) => i.answer_status === "green").length;
  res.json({
    questionnaire,
    items,
    readiness: total ? green / total : 0,
    counts: {
      red: items.filter((i) => i.answer_status === "red").length,
      amber: items.filter((i) => i.answer_status === "amber").length,
      green,
      total,
    },
  });
});

questionnairesRouter.post(
  "/questionnaires/:id/run",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM questionnaires WHERE id = $1 AND organisation_id = $2`,
      [req.params.id, req.user!.organisationId],
    );
    const questionnaire = rows[0];
    if (!questionnaire) return res.status(404).json({ error: "Questionnaire not found" });

    const result = await runAnswerEngine(questionnaire.id, req.user!.organisationId);
    res.json(result);
  },
);

const itemUpdateSchema = z.object({
  text: z.string().min(1),
  status: z.enum(["red", "amber", "green"]).optional(),
});

questionnairesRouter.patch(
  "/questionnaires/:id/items/:itemId",
  requireAuth,
  requireRole(...ANSWER_ROLES),
  async (req, res) => {
    const parsed = itemUpdateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

    const { rows: itemRows } = await pool.query(
      `SELECT qi.id, qi.question_text FROM question_instances qi
       JOIN questionnaires q ON q.id = qi.questionnaire_id
       WHERE qi.id = $1 AND q.id = $2 AND q.organisation_id = $3 AND q.status != 'attested'`,
      [req.params.itemId, req.params.id, req.user!.organisationId],
    );
    const item = itemRows[0];
    if (!item) return res.status(404).json({ error: "Item not found, or questionnaire already attested" });

    const { rows: existing } = await pool.query(`SELECT * FROM answers WHERE question_instance_id = $1`, [
      req.params.itemId,
    ]);
    const wasAiSourced = ["generated", "library", "fact"].includes(existing[0]?.source);
    const textChanged = existing[0]?.text !== parsed.data.text;
    const isOverride = wasAiSourced && textChanged;
    // Editing the text makes this a human-authored answer from here on;
    // accepting AI-suggested text unchanged keeps its original source so
    // the audit trail still shows where it came from.
    const newSource = textChanged ? "manual" : (existing[0]?.source ?? "manual");

    const { rows } = await pool.query(
      `UPDATE answers
       SET text = $1, status = $2, source = $3, is_override = $4, confirmed = true, edited_by = $5, updated_at = now()
       WHERE question_instance_id = $6 RETURNING *`,
      [parsed.data.text, parsed.data.status ?? "green", newSource, isOverride, req.user!.id, req.params.itemId],
    );
    if (isOverride) {
      await recordAudit("answer", req.params.itemId, "overridden", req.user!.id, { text: parsed.data.text });
    }

    // A human writing an answer resolves whatever gap the red status
    // created — leaving it open would show a stale "genuine gap" entry
    // for a question that's now answered.
    if (rows[0].status !== "red") {
      await pool.query(`UPDATE gaps SET status = 'closed' WHERE question_instance_id = $1 AND status = 'open'`, [
        req.params.itemId,
      ]);
    }

    // A human confirming a green answer is exactly the moment the spec's
    // Answer Library (M10) exists to capture — this is what makes
    // questionnaire #2 arrive pre-answered.
    if (rows[0].status === "green") {
      await pool.query(
        `INSERT INTO answer_library (organisation_id, canonical_question_text, approved_answer, last_used_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (organisation_id, canonical_question_text)
         DO UPDATE SET approved_answer = EXCLUDED.approved_answer, last_used_at = now()`,
        [req.user!.organisationId, item.question_text, parsed.data.text],
      );
    }

    res.json({ answer: rows[0] });
  },
);

// Bulk-accept-friendly: confirms the Answer Engine's current text as-is
// without requiring the client to resend it. Spec's RAG table lists
// "scan and bulk-accept" as green's required action — this is what that
// button calls, one item at a time or looped client-side over every
// green item.
questionnairesRouter.post(
  "/questionnaires/:id/items/:itemId/accept",
  requireAuth,
  requireRole(...ANSWER_ROLES),
  async (req, res) => {
    const { rows: itemRows } = await pool.query(
      `SELECT qi.id, qi.question_text, a.text, a.status FROM question_instances qi
       JOIN answers a ON a.question_instance_id = qi.id
       JOIN questionnaires q ON q.id = qi.questionnaire_id
       WHERE qi.id = $1 AND q.id = $2 AND q.organisation_id = $3 AND q.status != 'attested'`,
      [req.params.itemId, req.params.id, req.user!.organisationId],
    );
    const item = itemRows[0];
    if (!item) return res.status(404).json({ error: "Item not found, or questionnaire already attested" });
    if (!item.text) return res.status(400).json({ error: "Nothing to accept — this item has no drafted answer" });

    const { rows } = await pool.query(
      `UPDATE answers SET confirmed = true, edited_by = $1, updated_at = now()
       WHERE question_instance_id = $2 RETURNING *`,
      [req.user!.id, req.params.itemId],
    );

    if (item.status === "green") {
      await pool.query(
        `INSERT INTO answer_library (organisation_id, canonical_question_text, approved_answer, last_used_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (organisation_id, canonical_question_text)
         DO UPDATE SET approved_answer = EXCLUDED.approved_answer, last_used_at = now()`,
        [req.user!.organisationId, item.question_text, item.text],
      );
    }

    res.json({ answer: rows[0] });
  },
);

questionnairesRouter.post(
  "/questionnaires/:id/export",
  requireAuth,
  requireRole(...WRITE_ROLES),
  async (req, res) => {
    const { rows } = await pool.query(
      `SELECT * FROM questionnaires WHERE id = $1 AND organisation_id = $2`,
      [req.params.id, req.user!.organisationId],
    );
    const questionnaire = rows[0];
    if (!questionnaire) return res.status(404).json({ error: "Questionnaire not found" });

    const zipPath = await exportFilledQuestionnaire(questionnaire);
    await pool.query(`UPDATE questionnaires SET status = 'exported' WHERE id = $1 AND status != 'attested'`, [
      questionnaire.id,
    ]);
    await recordAudit("questionnaire", questionnaire.id, "exported", req.user!.id);
    res.download(zipPath, `${questionnaire.filename.replace(/\.xlsx$/i, "")}-response.zip`);
  },
);

questionnairesRouter.post(
  "/questionnaires/:id/attest",
  requireAuth,
  requireRole(...APPROVER_ROLES),
  async (req, res) => {
    const { rows: qRows } = await pool.query(
      `SELECT * FROM questionnaires WHERE id = $1 AND organisation_id = $2`,
      [req.params.id, req.user!.organisationId],
    );
    const questionnaire = qRows[0];
    if (!questionnaire) return res.status(404).json({ error: "Questionnaire not found" });
    if (questionnaire.status === "attested") {
      return res.status(400).json({ error: "This questionnaire has already been attested" });
    }

    const { rows: pending } = await pool.query(
      `SELECT count(*)::int AS n FROM answers a
       JOIN question_instances qi ON qi.id = a.question_instance_id
       WHERE qi.questionnaire_id = $1 AND a.confirmed = false AND a.text != ''`,
      [questionnaire.id],
    );
    if (pending[0].n > 0) {
      return res.status(400).json({
        error: `${pending[0].n} drafted answer(s) still need human review before this can be attested.`,
      });
    }

    const { rows: items } = await pool.query(
      `SELECT qi.id, qi.question_text, a.text, a.status, a.confidence, a.source,
         a.cited_fact_ids, a.cited_document_ids, a.is_override, a.confirmed
       FROM question_instances qi JOIN answers a ON a.question_instance_id = qi.id
       WHERE qi.questionnaire_id = $1 ORDER BY qi.sort_order`,
      [questionnaire.id],
    );

    const snapshot = { questionnaire, items, attestedAt: new Date().toISOString() };
    const { rows } = await pool.query(
      `INSERT INTO submissions (questionnaire_id, attested_by, snapshot) VALUES ($1, $2, $3) RETURNING *`,
      [questionnaire.id, req.user!.id, JSON.stringify(snapshot)],
    );
    await pool.query(`UPDATE questionnaires SET status = 'attested' WHERE id = $1`, [questionnaire.id]);
    await recordAudit("questionnaire", questionnaire.id, "attested", req.user!.id);
    res.status(201).json({ submission: rows[0] });
  },
);
