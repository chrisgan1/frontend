import { Router } from "express";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import fs from "node:fs";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const supplierPackRouter = Router();

supplierPackRouter.post("/supplier-pack/generate", requireAuth, async (req, res) => {
  const [profile, certifications, headcounts, linkedDocs] = await Promise.all([
    pool.query("SELECT * FROM company_profile WHERE id = true"),
    pool.query("SELECT * FROM certifications ORDER BY valid_until ASC"),
    pool.query(`
      SELECT
        count(*) FILTER (WHERE bpss_cleared)::int AS bpss_cleared,
        count(*) FILTER (WHERE sc_status = 'granted' AND (sc_expiry IS NULL OR sc_expiry >= current_date))::int AS sc_cleared,
        count(*) FILTER (WHERE dv_status = 'granted' AND (dv_expiry IS NULL OR dv_expiry >= current_date))::int AS dv_cleared
      FROM employees
    `),
    pool.query(`
      SELECT d.* FROM documents d
      WHERE d.id IN (SELECT document_id FROM certifications WHERE document_id IS NOT NULL)
         OR 'Security' = ANY(d.tags) OR 'Quality' = ANY(d.tags) OR 'Insurance' = ANY(d.tags)
    `),
  ]);

  const company = profile.rows[0];
  const generatedAt = new Date();

  const generation = await pool.query(
    "INSERT INTO supplier_pack_generations (generated_by) VALUES ($1) RETURNING id",
    [req.user!.id],
  );
  await recordAudit("supplier_pack", generation.rows[0].id, "generated", req.user!.id, {
    certCount: certifications.rows.length,
    docCount: linkedDocs.rows.length,
  });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="supplier-pack-${generatedAt.toISOString().slice(0, 10)}.zip"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    console.error("Supplier pack archive error:", err);
    res.destroy(err);
  });
  archive.pipe(res);

  const doc = new PDFDocument({ margin: 50 });
  const pdfChunks: Buffer[] = [];
  doc.on("data", (chunk) => pdfChunks.push(chunk));
  const pdfDone = new Promise<void>((resolve) => doc.on("end", () => resolve()));

  doc.fontSize(20).text(company?.name || "Company", { align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#666").text(`Supplier assurance pack — generated ${generatedAt.toDateString()}`);
  doc.fillColor("#000");
  doc.moveDown(1);

  if (company?.address) {
    doc.fontSize(11).text(company.address);
    doc.moveDown(0.5);
  }
  if (company?.contact_name || company?.contact_email) {
    doc.fontSize(11).text(`Contact: ${company.contact_name || ""} ${company.contact_email ? `<${company.contact_email}>` : ""}`.trim());
    doc.moveDown(0.5);
  }
  if (company?.capability_statement) {
    doc.moveDown(0.5);
    doc.fontSize(13).text("Capability Statement", { underline: true });
    doc.fontSize(11).text(company.capability_statement);
  }

  doc.moveDown(1);
  doc.fontSize(13).text("Certifications", { underline: true });
  doc.moveDown(0.3);
  if (certifications.rows.length === 0) {
    doc.fontSize(11).text("None recorded.");
  }
  for (const cert of certifications.rows) {
    const daysUntil = Math.ceil((new Date(cert.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const status = daysUntil < 0 ? "EXPIRED" : daysUntil <= 45 ? "EXPIRING SOON" : "VALID";
    doc.fontSize(11).text(`${cert.name} — valid until ${new Date(cert.valid_until).toDateString()} [${status}]`);
  }

  doc.moveDown(1);
  doc.fontSize(13).text("Security Clearance Summary", { underline: true });
  doc.moveDown(0.3);
  const hc = headcounts.rows[0];
  doc.fontSize(11).text(`BPSS cleared staff: ${hc.bpss_cleared}`);
  doc.fontSize(11).text(`SC cleared staff: ${hc.sc_cleared}`);
  doc.fontSize(11).text(`DV cleared staff: ${hc.dv_cleared}`);
  doc.fontSize(9).fillColor("#666").text("(Individual clearance holders are not disclosed in this pack.)");
  doc.fillColor("#000");

  doc.moveDown(1.5);
  doc.fontSize(9).fillColor("#666").text(`This pack is valid as of ${generatedAt.toDateString()} and reflects data recorded at that time. Re-generate for current status.`);

  doc.end();
  await pdfDone;

  archive.append(Buffer.concat(pdfChunks), { name: "cover-sheet.pdf" });

  for (const d of linkedDocs.rows) {
    if (fs.existsSync(d.file_path)) {
      archive.append(fs.createReadStream(d.file_path), { name: `evidence/${d.file_name}` });
    }
  }

  await archive.finalize();
});
