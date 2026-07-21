import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { CANONICAL_FACTS } from "../services/canonicalFacts.js";

export const dashboardRouter = Router();

const EXPIRING_SOON_DAYS = 45;

dashboardRouter.get("/dashboard", requireAuth, async (req, res) => {
  const orgId = req.user!.organisationId;

  const [factCounts, expiringFacts, docCount, questionnaireCounts, latestQuestionnaire] = await Promise.all([
    pool.query(
      `SELECT
         count(*) FILTER (WHERE status = 'verified')::int AS verified,
         count(*) FILTER (WHERE conflict)::int AS conflicts,
         count(*)::int AS total
       FROM facts WHERE organisation_id = $1`,
      [orgId],
    ),
    pool.query(
      `SELECT key, label, expiry FROM facts
       WHERE organisation_id = $1 AND expiry IS NOT NULL
         AND expiry <= current_date + $2::int
       ORDER BY expiry ASC`,
      [orgId, EXPIRING_SOON_DAYS],
    ),
    pool.query(`SELECT count(*)::int AS n FROM documents WHERE organisation_id = $1`, [orgId]),
    pool.query(
      `SELECT
         count(*) FILTER (WHERE status = 'ready')::int AS ready,
         count(*) FILTER (WHERE status = 'exported')::int AS exported,
         count(*) FILTER (WHERE status = 'attested')::int AS attested,
         count(*)::int AS total
       FROM questionnaires WHERE organisation_id = $1`,
      [orgId],
    ),
    pool.query(
      `SELECT q.id, q.filename, q.status,
         (SELECT count(*)::int FROM question_instances qi WHERE qi.questionnaire_id = q.id) AS total,
         (SELECT count(*)::int FROM question_instances qi JOIN answers a ON a.question_instance_id = qi.id
          WHERE qi.questionnaire_id = q.id AND a.status = 'green') AS green
       FROM questionnaires q
       WHERE q.organisation_id = $1
       ORDER BY q.uploaded_at DESC LIMIT 1`,
      [orgId],
    ),
  ]);

  const facts = factCounts.rows[0];
  const latest = latestQuestionnaire.rows[0];

  res.json({
    factBase: {
      verifiedCount: facts.verified,
      totalCanonical: CANONICAL_FACTS.length,
      completeness: CANONICAL_FACTS.length ? facts.verified / CANONICAL_FACTS.length : 0,
      conflicts: facts.conflicts,
    },
    expiringSoon: expiringFacts.rows,
    documentsCount: docCount.rows[0].n,
    questionnaires: questionnaireCounts.rows[0],
    latestQuestionnaire: latest
      ? { ...latest, readiness: latest.total ? latest.green / latest.total : 0 }
      : null,
  });
});
