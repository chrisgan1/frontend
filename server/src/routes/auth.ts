import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole, signToken, ADMIN_ROLES } from "../middleware/auth.js";
import { recordAudit } from "../utils/audit.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["admin", "compliance_manager", "contributor", "auditor"]),
});

// First user bootstraps as admin with no auth required; subsequent users must be created by an admin.
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { rows: existing } = await pool.query("SELECT count(*)::int AS n FROM users");
  const isFirstUser = existing[0].n === 0;

  if (!isFirstUser) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Only an existing admin can create further users" });
    }
  }

  const { email, password, name, role } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 12);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [email, passwordHash, name, isFirstUser ? "admin" : role],
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
    "SELECT id, email, name, role, password_hash FROM users WHERE email = $1",
    [parsed.data.email],
  );
  const row = rows[0];
  if (!row || !(await bcrypt.compare(parsed.data.password, row.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const user = { id: row.id, email: row.email, name: row.name, role: row.role };
  res.json({ token: signToken(user), user });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.get("/users", requireAuth, requireRole(...ADMIN_ROLES), async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT id, email, name, role, created_at FROM users ORDER BY created_at",
  );
  res.json({ users: rows });
});
