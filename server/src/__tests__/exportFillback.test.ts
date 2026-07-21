import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";
import ExcelJS from "exceljs";
import { pool } from "../db/pool.js";
import { exportFilledQuestionnaire } from "../services/exportFillback.js";

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";

describe("exportFilledQuestionnaire", () => {
  let questionnaire: { id: string; file_path: string; filename: string };

  beforeAll(async () => {
    const org = await pool.query(`INSERT INTO organisations (name) VALUES ('Fillback Test Org') RETURNING id`);
    const orgId = org.rows[0].id;
    const user = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, organisation_id)
       VALUES ('fillback@example.com', 'x', 'Fillback Tester', 'owner', $1) RETURNING id`,
      [orgId],
    );
    const userId = user.rows[0].id;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    sheet.addRow(["Question", "Response"]);
    sheet.addRow(["Confirmed question", ""]);
    sheet.addRow(["Unconfirmed question", ""]);
    const originalPath = path.join(uploadDir, `fillback-test-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(originalPath);

    const q = await pool.query(
      `INSERT INTO questionnaires (organisation_id, filename, file_path, uploaded_by, status)
       VALUES ($1, 'fillback-test.xlsx', $2, $3, 'ready') RETURNING *`,
      [orgId, originalPath, userId],
    );
    questionnaire = q.rows[0];

    const confirmedItem = await pool.query(
      `INSERT INTO question_instances (questionnaire_id, sheet_name, row_ref, question_text, sort_order)
       VALUES ($1, 'Sheet1', $2, 'Confirmed question', 0) RETURNING id`,
      [questionnaire.id, JSON.stringify({ sheet: "Sheet1", row: 2, responseCol: 2 })],
    );
    await pool.query(
      `INSERT INTO answers (question_instance_id, text, status, confirmed) VALUES ($1, 'This is the confirmed answer.', 'green', true)`,
      [confirmedItem.rows[0].id],
    );

    const unconfirmedItem = await pool.query(
      `INSERT INTO question_instances (questionnaire_id, sheet_name, row_ref, question_text, sort_order)
       VALUES ($1, 'Sheet1', $2, 'Unconfirmed question', 1) RETURNING id`,
      [questionnaire.id, JSON.stringify({ sheet: "Sheet1", row: 3, responseCol: 2 })],
    );
    await pool.query(
      `INSERT INTO answers (question_instance_id, text, status, confirmed) VALUES ($1, 'An AI draft nobody has reviewed yet.', 'amber', false)`,
      [unconfirmedItem.rows[0].id],
    );
  });

  it("writes only confirmed answers back into the original workbook's response cells", async () => {
    const zipPath = await exportFilledQuestionnaire(questionnaire);
    expect(zipPath).toMatch(/\.zip$/);

    const filledPath = path.join(uploadDir, "exports", `${questionnaire.id}-filled.xlsx`);
    const filled = new ExcelJS.Workbook();
    await filled.xlsx.readFile(filledPath);
    const sheet = filled.getWorksheet("Sheet1")!;

    expect(sheet.getRow(2).getCell(2).text).toBe("This is the confirmed answer.");
    // The unconfirmed answer must not appear in the export, however
    // confident the Answer Engine was — this is the same "never a real
    // answer until a human confirms it" rule the whole app follows.
    expect(sheet.getRow(3).getCell(2).text).toBe("");
  });
});
