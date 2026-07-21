import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, signToken, ADMIN_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";
import type { AuthUser } from "../types.js";

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["owner", "editor", "contributor", "approver", "read_only"]),
  // Only required when signing up as the first user of a brand new
  // organisation (no bearer token). Ignored when inviting into an
  // existing org, since that org already has a name.
  organisationName: z.string().min(1).optional(),
});

// No bearer token = signing up as the first user of a brand new
// organisation (becomes its owner, regardless of requested role).
// With a bearer token = an existing owner inviting a teammate into
// *their* organisation, at the requested role.
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, name, role, organisationName } = parsed.data;

  const header = req.headers.authorization;
  let organisationId: string;
  let effectiveRole = role;

  if (header?.startsWith("Bearer ")) {
    let inviter: AuthUser;
    try {
      inviter = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    if (inviter.role !== "owner") {
      return res.status(403).json({ error: "Only an organisation owner can add further users" });
    }
    organisationId = inviter.organisationId;
  } else {
    if (!organisationName) {
      return res.status(400).json({ error: "organisationName is required when signing up without an existing account" });
    }
    const { rows } = await pool.query(
      "INSERT INTO organisations (name) VALUES ($1) RETURNING id",
      [organisationName],
    );
    organisationId = rows[0].id;
    effectiveRole = "owner";
  }

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, organisation_id) VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, organisation_id AS "organisationId"`,
      [email, passwordHash, name, effectiveRole, organisationId],
    );
    const user = rows[0];
    await recordAudit("user", user.id, "created", user.id);
    res.status(201).json({ token: signToken(user), user });
  } catch (err: any) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    throw err;
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { rows } = await pool.query(
    `SELECT id, email, name, role, organisation_id AS "organisationId", password_hash
     FROM users WHERE email = $1`,
    [parsed.data.email],
  );
  const row = rows[0];
  if (!row || !(await bcrypt.compare(parsed.data.password, row.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    organisationId: row.organisationId,
  };
  res.json({ token: signToken(user), user });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.get("/users", requireAuth, requireRole(...ADMIN_ROLES), async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, email, name, role, created_at FROM users WHERE organisation_id = $1 ORDER BY created_at",
    [req.user!.organisationId],
  );
  res.json({ users: rows });
});
