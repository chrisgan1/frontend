import fs from "node:fs";
import path from "node:path";
import archiver from "archiver";
import ExcelJS from "exceljs";
import { pool } from "../db/pool.js";

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";

interface QuestionnaireRow {
  id: string;
  file_path: string;
  filename: string;
}

/**
 * Fills accepted answers back into a copy of the prime's own uploaded
 * workbook (primes will not accept an ad-hoc format — spec §4 Stage 5),
 * bundles it with the evidence documents behind every cited fact, and
 * returns the path to the resulting ZIP.
 */
export async function exportFilledQuestionnaire(questionnaire: QuestionnaireRow): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(questionnaire.file_path);

  // Only human-confirmed answers are written back — an AI draft nobody
  // has reviewed yet must never reach an export, however confident the
  // Answer Engine was.
  const { rows: items } = await pool.query(
    `SELECT qi.row_ref, a.text
     FROM question_instances qi JOIN answers a ON a.question_instance_id = qi.id
     WHERE qi.questionnaire_id = $1 AND a.confirmed = true`,
    [questionnaire.id],
  );

  for (const item of items) {
    if (!item.text) continue; // don't write blank/red answers into the template
    const ref = JSON.parse(item.row_ref) as { sheet: string; row: number; responseCol: number };
    const sheet = workbook.getWorksheet(ref.sheet);
    if (!sheet) continue;
    sheet.getRow(ref.row).getCell(ref.responseCol).value = item.text;
  }

  const outDir = path.join(uploadDir, "exports");
  fs.mkdirSync(outDir, { recursive: true });
  const filledPath = path.join(outDir, `${questionnaire.id}-filled.xlsx`);
  await workbook.xlsx.writeFile(filledPath);

  // Evidence bundle: the documents behind every fact cited by an accepted
  // answer, found via the extraction that produced each fact rather than
  // relying on cited_document_ids (which the fact-grounded answer path
  // doesn't populate directly — the fact is the citation unit there).
  const { rows: docRows } = await pool.query(
    `SELECT DISTINCT d.id, d.file_path, d.file_name
     FROM answers a
     JOIN question_instances qi ON qi.id = a.question_instance_id
     JOIN fact_extractions fe ON fe.fact_id = ANY(a.cited_fact_ids)
     JOIN documents d ON d.id = fe.document_id
     WHERE qi.questionnaire_id = $1 AND a.confirmed = true`,
    [questionnaire.id],
  );

  const zipPath = path.join(outDir, `${questionnaire.id}-response.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    archive.file(filledPath, { name: questionnaire.filename });
    for (const doc of docRows) {
      if (fs.existsSync(doc.file_path)) archive.file(doc.file_path, { name: `evidence/${doc.file_name}` });
    }
    archive.finalize();
  });

  return zipPath;
}
