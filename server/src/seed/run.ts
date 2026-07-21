import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import { pool } from "../db/pool.js";
import { extractFactsFromDocument } from "../services/factExtraction.js";
import { runAnswerEngine } from "../services/answerEngine.js";
import { parseQuestionnaire } from "../services/questionnaireParser.js";
import { CANONICAL_FACT_BY_KEY } from "../services/canonicalFacts.js";

// Entirely fictional demo company/people/data, for demoing the product to
// prospects — not real certificates, not real personnel records.

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
const seedFilesDir = path.join(uploadDir, "seed");
fs.mkdirSync(seedFilesDir, { recursive: true });

function placeholderFile(name: string, content: string): string {
  const filePath = path.join(seedFilesDir, name);
  fs.writeFileSync(filePath, content);
  return filePath;
}

async function seed() {
  const orgResult = await pool.query(
    `INSERT INTO organisations (name) VALUES ($1) RETURNING id`,
    ["Acme Defence Engineering Ltd"],
  );
  const orgId = orgResult.rows[0].id;

  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 12);
  const usersToInsert = [
    { email: "demo.owner@acmedefence.example", name: "Demo Owner", role: "owner" },
    { email: "demo.editor@acmedefence.example", name: "Demo Editor", role: "editor" },
    { email: "demo.contributor@acmedefence.example", name: "Demo Contributor", role: "contributor" },
    { email: "demo.approver@acmedefence.example", name: "Demo Approver", role: "approver" },
    { email: "demo.readonly@acmedefence.example", name: "Demo Read Only", role: "read_only" },
  ];
  let ownerId = "";
  for (const u of usersToInsert) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, organisation_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [u.email, passwordHash, u.name, u.role, orgId],
    );
    if (u.role === "owner") ownerId = rows[0].id;
  }

  const docsToInsert = [
    {
      title: "Cyber Essentials Plus Certificate",
      file: "cyber-essentials-plus.txt",
      tags: ["Cyber"],
      expiresAt: "2027-06-15",
      content:
        "CYBER ESSENTIALS PLUS CERTIFICATE\n\nCertificate holder: Acme Defence Engineering Ltd\nCertificate number: CEP-2025-88214\nCertification body: IASME Consortium\nIssued: 15 June 2025\nExpiry: 15 June 2027\n\nThis certifies that Acme Defence Engineering Ltd has been independently assessed and meets the requirements of the Cyber Essentials Plus scheme.",
    },
    {
      title: "ISO 27001 Certificate",
      file: "iso-27001.txt",
      tags: ["Cyber", "Quality"],
      expiresAt: "2027-05-10",
      content:
        "ISO/IEC 27001:2022 CERTIFICATE OF REGISTRATION\n\nOrganisation: Acme Defence Engineering Ltd\nCertificate number: ISMS-77341\nCertification body: BSI\nIssued: 10 May 2025\nExpiry: 10 May 2027\n\nThis certifies the Information Security Management System of Acme Defence Engineering Ltd conforms to ISO/IEC 27001:2022.",
    },
    {
      title: "Public & Product Liability Insurance",
      file: "insurance-certificate.txt",
      tags: ["Insurance"],
      expiresAt: "2026-09-01",
      content:
        "CERTIFICATE OF INSURANCE\n\nInsured: Acme Defence Engineering Ltd\nInsurer: Northshield Underwriting Ltd\nPolicy number: PL-2025-40217\nCover: Public & Product Liability\nLimit of indemnity: £5,000,000 any one occurrence\nPeriod of insurance: 1 September 2025 to 1 September 2026",
    },
    {
      title: "Information Security Policy",
      file: "information-security-policy.txt",
      tags: ["Cyber"],
      expiresAt: null,
      content:
        "INFORMATION SECURITY POLICY (v4)\n\nAcme Defence Engineering Ltd\n\nAll company systems require multi-factor authentication for remote access. IT infrastructure is managed in-house by a dedicated 2-person IT team, with critical systems patched within 14 days of vendor release. Daily encrypted backups are retained for 90 days.",
    },
    {
      title: "Quality Management Policy",
      file: "quality-policy.txt",
      tags: ["Quality"],
      expiresAt: null,
      content:
        "QUALITY MANAGEMENT POLICY (v2)\n\nAcme Defence Engineering Ltd\n\nAcme Defence Engineering Ltd operates a documented quality management system, reviewed annually by the Quality Manager. The company employs 30 engineering and delivery staff across its Ashford site.",
    },
    {
      title: "Company Registration Extract",
      file: "company-registration.txt",
      tags: ["Corporate"],
      expiresAt: null,
      content:
        "COMPANIES HOUSE EXTRACT\n\nCompany name: Acme Defence Engineering Ltd\nCompany number: 09814223\nRegistered office: Unit 4, Ashford Business Park, Ashford, Kent, TN24 0LH\nIncorporated: 12 March 2015\nStatus: Active",
    },
  ];

  const documentIds: Record<string, string> = {};
  for (const d of docsToInsert) {
    const filePath = placeholderFile(d.file, d.content);
    const { rows } = await pool.query(
      `INSERT INTO documents (title, description, file_path, file_name, mime_type, expires_at, tags, uploaded_by, organisation_id)
       VALUES ($1, $2, $3, $4, 'text/plain', $5, $6, $7, $8) RETURNING *`,
      [d.title, d.title, filePath, d.file, d.expiresAt, d.tags, ownerId, orgId],
    );
    documentIds[d.file] = rows[0].id;

    // Best-effort live extraction — if GEMINI_API_KEY isn't set (or the
    // provider is unavailable), this fails gracefully and the curated
    // baseline facts below still make the demo work regardless.
    try {
      await extractFactsFromDocument(rows[0]);
    } catch (err) {
      console.log(`  (extraction skipped for ${d.title}: ${err instanceof Error ? err.message : err})`);
    }
  }

  // Curated baseline, applied after extraction: guarantees a coherent,
  // fully-verified demo Fact Base regardless of whether a live API key was
  // configured for the extraction pass above, and overrides any
  // conflict a placeholder document's exact wording might have triggered.
  const baselineFacts: Array<[string, string, string]> = [
    ["A", "legal_name", "Acme Defence Engineering Ltd"],
    ["A", "company_number", "09814223"],
    ["A", "registered_address", "Unit 4, Ashford Business Park, Ashford, Kent, TN24 0LH"],
    ["A", "employee_count", "30"],
    ["C", "public_liability_insurer", "Northshield Underwriting Ltd"],
    ["C", "public_liability_limit", "£5,000,000 any one occurrence"],
    ["C", "public_liability_expiry", "2026-09-01"],
    ["D", "iso9001_certificate_number", "N/A — see ISO 27001 (ISMS-77341); ISO 9001 not currently held"],
    ["E", "cyber_essentials_plus_certificate_number", "CEP-2025-88214"],
    ["E", "cyber_essentials_plus_expiry", "2027-06-15"],
    ["E", "iso27001_certificate_number", "ISMS-77341"],
    ["E", "iso27001_expiry", "2027-05-10"],
    ["E", "mfa_coverage", "Multi-factor authentication required for all remote access"],
    ["E", "it_provider", "In-house, 2-person IT team"],
    ["F", "total_headcount", "30"],
    ["F", "bpss_cleared_count", "25"],
    ["F", "sc_cleared_count", "8"],
    ["F", "dv_cleared_count", "1"],
  ];
  for (const [domain, key, value] of baselineFacts) {
    const label = CANONICAL_FACT_BY_KEY.get(key)?.label ?? key;
    const expiry = key.endsWith("_expiry") ? value : null;
    await pool.query(
      `INSERT INTO facts (organisation_id, domain, key, label, current_value, status, conflict, verified_by, verified_on, expiry)
       VALUES ($1, $2, $3, $4, $5, 'verified', false, $6, now(), $7)
       ON CONFLICT (organisation_id, domain, key)
       DO UPDATE SET current_value = EXCLUDED.current_value, status = 'verified', conflict = false,
         verified_by = EXCLUDED.verified_by, verified_on = now(), expiry = EXCLUDED.expiry`,
      [orgId, domain, key, label, value, ownerId, expiry],
    );
  }

  // A sample questionnaire fixture, generated rather than hand-authored,
  // so there's something concrete to upload through the real .xlsx parse
  // path on first login. Deliberately phrased differently from the
  // canonical facts above (not exact-string matches) and includes two
  // questions nothing in the seed data covers, to demonstrate both the
  // matching and the abstain path.
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Supplier Assurance");
  sheet.addRow(["Question", "Response"]);
  const sampleQuestions = [
    "Please confirm your registered company number",
    "Do you hold Cyber Essentials Plus certification? Please provide certificate number and expiry",
    "Provide details of your public liability insurance cover, including limit of indemnity",
    "Do you hold ISO 27001 certification?",
    "How many staff hold active SC clearance?",
    "Is multi-factor authentication enforced for remote access to company systems?",
    "Outline your approach to General Data Protection Regulation compliance",
    "Provide your latest set of audited accounts",
  ];
  for (const q of sampleQuestions) sheet.addRow([q, ""]);
  const sampleQuestionnairePath = path.join(seedFilesDir, "sample-supplier-questionnaire.xlsx");
  await workbook.xlsx.writeFile(sampleQuestionnairePath);

  const { rows: qRows } = await pool.query(
    `INSERT INTO questionnaires (organisation_id, filename, file_path, uploaded_by, status)
     VALUES ($1, $2, $3, $4, 'parsing') RETURNING *`,
    [orgId, "sample-supplier-questionnaire.xlsx", sampleQuestionnairePath, ownerId],
  );
  const questionnaire = qRows[0];
  const parsed = await parseQuestionnaire(sampleQuestionnairePath);
  for (const q of parsed.questions) {
    const { rows } = await pool.query(
      `INSERT INTO question_instances (questionnaire_id, sheet_name, row_ref, question_text, response_type, section, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [questionnaire.id, q.sheetName, q.rowRef, q.questionText, q.responseType, q.section, q.sortOrder],
    );
    await pool.query(`INSERT INTO answers (question_instance_id) VALUES ($1)`, [rows[0].id]);
  }
  await pool.query(`UPDATE questionnaires SET status = 'ready' WHERE id = $1`, [questionnaire.id]);

  // Best-effort: run the Answer Engine against the seeded Fact Base so
  // there's something to see on the Triage Board immediately. Skips
  // cleanly (falls back to red/unconfirmed) if no live API key is set.
  try {
    await runAnswerEngine(questionnaire.id, orgId);
  } catch (err) {
    console.log(`  (answer engine skipped: ${err instanceof Error ? err.message : err})`);
  }

  console.log(`Seeded demo organisation "Acme Defence Engineering Ltd".`);
  console.log(`Log in with: demo.owner@acmedefence.example / ${password} (also editor/contributor/approver/readonly variants, same password)`);
  console.log(`Seeded ${baselineFacts.length} verified facts and a sample questionnaire (${parsed.questions.length} questions).`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
