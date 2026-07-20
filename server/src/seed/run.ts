import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { pool } from "../db/pool.js";
import { bestMatch } from "../utils/match.js";

// Entirely fictional demo company/people/data, for demoing the product to
// prospects — not real certificates, not real personnel records.

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
const seedFilesDir = path.join(uploadDir, "seed");
fs.mkdirSync(seedFilesDir, { recursive: true });

function placeholderFile(name: string, label: string): string {
  const filePath = path.join(seedFilesDir, name);
  fs.writeFileSync(
    filePath,
    `DEMO PLACEHOLDER DOCUMENT\n\n${label}\n\nThis is seed/demo content for product walkthroughs, not a real certificate.`,
  );
  return filePath;
}

async function seed() {
  const email = "demo.admin@acmedefence.example";
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 12);
  const userResult = await pool.query(
    `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [email, passwordHash, "Demo Admin"],
  );
  const userId = userResult.rows[0].id;

  await pool.query(
    `UPDATE company_profile SET name = $1, address = $2, capability_statement = $3, contact_name = $4, contact_email = $5 WHERE id = true`,
    [
      "Acme Defence Engineering Ltd",
      "Unit 4, Ashford Business Park, Ashford, Kent, TN24 0LH",
      "Acme Defence Engineering designs and maintains ruggedised communications hardware for land and maritime platforms. 30 engineering staff, ISO 9001 quality system, in-house EMC test facility.",
      "Demo Admin",
      email,
    ],
  );

  const docsToInsert: { title: string; file: string; label: string; tags: string[]; expiresAt: string | null }[] = [
    { title: "Cyber Essentials Plus Certificate", file: "cyber-essentials-plus.txt", label: "Cyber Essentials Plus certificate", tags: ["Security"], expiresAt: "2027-06-15" },
    { title: "ISO 27001 Certificate", file: "iso-27001.txt", label: "ISO/IEC 27001:2022 certificate", tags: ["Security", "Quality"], expiresAt: "2027-05-10" },
    { title: "Public & Product Liability Insurance", file: "insurance-certificate.txt", label: "Public & product liability insurance certificate", tags: ["Insurance"], expiresAt: "2026-09-01" },
    { title: "Information Security Policy", file: "information-security-policy.txt", label: "Information security policy v4", tags: ["Security"], expiresAt: null },
    { title: "Quality Management Policy", file: "quality-policy.txt", label: "Quality management policy v2", tags: ["Quality"], expiresAt: null },
  ];

  const documentIds: Record<string, string> = {};
  for (const d of docsToInsert) {
    const filePath = placeholderFile(d.file, d.label);
    const { rows } = await pool.query(
      `INSERT INTO documents (title, description, file_path, file_name, mime_type, expires_at, tags, uploaded_by)
       VALUES ($1, $2, $3, $4, 'text/plain', $5, $6, $7) RETURNING id`,
      [d.title, d.label, filePath, d.file, d.expiresAt, d.tags, userId],
    );
    documentIds[d.file] = rows[0].id;
  }

  const certsToInsert = [
    { name: "Cyber Essentials Plus", validFrom: "2025-06-15", validUntil: "2027-06-15", docFile: "cyber-essentials-plus.txt" },
    { name: "ISO 27001", validFrom: "2025-05-10", validUntil: "2027-05-10", docFile: "iso-27001.txt" },
    { name: "Public & Product Liability Insurance", validFrom: "2025-09-01", validUntil: "2026-09-01", docFile: "insurance-certificate.txt" },
  ];
  for (const c of certsToInsert) {
    await pool.query(
      `INSERT INTO certifications (name, valid_from, valid_until, document_id) VALUES ($1, $2, $3, $4)`,
      [c.name, c.validFrom, c.validUntil, documentIds[c.docFile]],
    );
  }

  const employeesToInsert = [
    { name: "Alex Morgan", roleTitle: "Senior Systems Engineer", bpss: true, sc: "granted", scExpiry: "2028-01-01", dv: "none", dvExpiry: null, sponsor: "DE&S Abbey Wood" },
    { name: "Sam Patel", roleTitle: "Project Manager", bpss: true, sc: "granted", scExpiry: "2026-08-15", dv: "none", dvExpiry: null, sponsor: "DE&S Abbey Wood" },
    { name: "Jordan Lee", roleTitle: "Principal Engineer", bpss: true, sc: "granted", scExpiry: "2029-02-01", dv: "granted", dvExpiry: "2028-03-01", sponsor: "MOD Corsham" },
    { name: "Casey Osei", roleTitle: "Test Engineer", bpss: true, sc: "none", scExpiry: null, dv: "none", dvExpiry: null, sponsor: null },
    { name: "Taylor Brooks", roleTitle: "Software Engineer", bpss: true, sc: "in_progress", scExpiry: null, dv: "none", dvExpiry: null, sponsor: "DE&S Abbey Wood" },
    { name: "Morgan Reilly", roleTitle: "Graduate Engineer", bpss: false, sc: "none", scExpiry: null, dv: "none", dvExpiry: null, sponsor: null },
  ];

  const employeeIds: Record<string, string> = {};
  for (const e of employeesToInsert) {
    const { rows } = await pool.query(
      `INSERT INTO employees (name, role_title, bpss_cleared, sc_status, sc_expiry, dv_status, dv_expiry, sponsor)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [e.name, e.roleTitle, e.bpss, e.sc, e.scExpiry, e.dv, e.dvExpiry, e.sponsor],
    );
    employeeIds[e.name] = rows[0].id;
  }

  const projectsToInsert = [
    { name: "Project Sentinel (SC-restricted)", requiredClearance: "sc", assignees: ["Alex Morgan", "Jordan Lee"] },
    { name: "Project Foundation (site works)", requiredClearance: "bpss", assignees: ["Casey Osei"] },
  ];
  for (const p of projectsToInsert) {
    const { rows } = await pool.query(
      `INSERT INTO projects (name, required_clearance) VALUES ($1, $2) RETURNING id`,
      [p.name, p.requiredClearance],
    );
    for (const assignee of p.assignees) {
      await pool.query(
        `INSERT INTO project_assignments (project_id, employee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [rows[0].id, employeeIds[assignee]],
      );
    }
  }

  const passportToInsert: { topic: string; question: string; answer: string; docFile?: string }[] = [
    {
      topic: "Security",
      question: "Do you hold Cyber Essentials Plus certification?",
      answer: "Yes, Acme Defence Engineering holds Cyber Essentials Plus, valid until 15 June 2027.",
      docFile: "cyber-essentials-plus.txt",
    },
    {
      topic: "Security",
      question: "Do you hold ISO 27001 certification?",
      answer: "Yes, certified to ISO/IEC 27001:2022, valid until 10 May 2027.",
      docFile: "iso-27001.txt",
    },
    {
      topic: "Insurance",
      question: "Do you hold Public and Product Liability insurance? What is the level of cover?",
      answer: "Yes, Public & Product Liability insurance is held with cover valid until 1 September 2026.",
      docFile: "insurance-certificate.txt",
    },
    {
      topic: "People",
      question: "How many staff hold BPSS clearance?",
      answer: "5 of our 6 engineering and delivery staff hold BPSS clearance.",
    },
    {
      topic: "People",
      question: "How many staff hold active SC clearance?",
      answer: "3 staff currently hold active SC clearance, sponsored via DE&S Abbey Wood and MOD Corsham.",
    },
    {
      topic: "People",
      question: "Do you have any DV cleared staff?",
      answer: "Yes, 1 member of staff holds active DV clearance, sponsored via MOD Corsham.",
    },
    {
      topic: "Quality",
      question: "Do you operate a documented quality management system?",
      answer: "Yes, our quality management policy documents our approach and is reviewed annually.",
      docFile: "quality-policy.txt",
    },
    {
      topic: "Export Control",
      question: "Do you have a process for identifying and complying with export control (ITAR/EAR) obligations?",
      answer: "Yes — export-controlled items and technical data transfers are reviewed by our compliance lead prior to shipment, in line with UK strategic export control legislation.",
    },
    {
      topic: "Data Protection",
      question: "Are you GDPR / UK Data Protection Act compliant? Do you have a data protection policy?",
      answer: "Yes, we maintain a documented data protection policy and process personal data in line with UK GDPR.",
    },
    {
      topic: "Modern Slavery",
      question: "Do you have a Modern Slavery statement or policy?",
      answer: "Yes, our Modern Slavery and Human Trafficking statement is reviewed annually and available on request.",
    },
    {
      topic: "Financial",
      question: "Can you provide evidence of financial stability (accounts, credit rating)?",
      answer: "Latest filed accounts and a current credit reference are available on request from our finance team.",
    },
  ];

  const qaIds: { id: string; question: string }[] = [];
  for (const p of passportToInsert) {
    const { rows } = await pool.query(
      `INSERT INTO qa_entries (topic, question, answer, status) VALUES ($1, $2, $3, 'confirmed') RETURNING id, question`,
      [p.topic, p.question, p.answer],
    );
    qaIds.push(rows[0]);
    if (p.docFile) {
      await pool.query(
        `INSERT INTO qa_entry_evidence (qa_entry_id, document_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [rows[0].id, documentIds[p.docFile]],
      );
    }
  }

  const requestResult = await pool.query(
    `INSERT INTO requests (requester_name, requester_contact, due_date, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
    ["Northbridge Systems Ltd", "procurement@northbridge.example", "2026-08-15", userId],
  );
  const requestId = requestResult.rows[0].id;

  // Deliberately phrased differently from the passport questions (and one
  // with no good match) to demonstrate the matching, not just exact-string lookup.
  const incomingQuestions = [
    "Please confirm if you hold Cyber Essentials Plus certification",
    "Provide details of your insurance cover, including public liability",
    "How many personnel have Security Check (SC) clearance?",
    "Confirm number of staff with baseline BPSS clearance",
    "Do you have ITAR / export control procedures in place?",
    "Outline your approach to General Data Protection Regulation compliance",
    "Provide your latest set of audited accounts",
  ];
  let sortOrder = 0;
  for (const questionText of incomingQuestions) {
    const match = bestMatch(questionText, qaIds);
    await pool.query(
      `INSERT INTO request_items (request_id, question_text, suggested_qa_entry_id, suggested_score, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [requestId, questionText, match.id, match.score, match.id ? "suggested" : "unmatched", sortOrder],
    );
    sortOrder += 1;
  }

  console.log(`Seeded demo company "Acme Defence Engineering Ltd".`);
  console.log(`Log in with: ${email} / ${password}`);
  console.log(`Seeded ${passportToInsert.length} passport answers and a demo request from Northbridge Systems Ltd.`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
