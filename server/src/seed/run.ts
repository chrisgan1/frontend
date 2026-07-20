import { pool } from "../db/pool.js";
import { controls } from "./defstan-05-138.js";

async function seed() {
  const { rows } = await pool.query(
    `INSERT INTO frameworks (key, name, description)
     VALUES ('defstan-05-138', 'DEFSTAN 05-138', 'Cyber Security for Defence Suppliers')
     ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  const frameworkId = rows[0].id;

  for (const control of controls) {
    await pool.query(
      `INSERT INTO controls (framework_id, code, title, description, category, profile_level)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (framework_id, code) DO UPDATE
       SET title = EXCLUDED.title, description = EXCLUDED.description,
           category = EXCLUDED.category, profile_level = EXCLUDED.profile_level`,
      [frameworkId, control.code, control.title, control.description, control.category, control.profileLevel],
    );
  }

  console.log(`Seeded ${controls.length} DEFSTAN 05-138 controls.`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
