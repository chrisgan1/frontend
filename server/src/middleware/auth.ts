import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser, Role } from "../types.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "12h" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient role for this action" });
    }
    next();
  };
}

// Facts, documents, questionnaires: full read/write.
export const WRITE_ROLES: Role[] = ["owner", "editor"];
// Answering assigned questions. Contributors don't get vault/fact-base
// write access (per the spec's role table), only answers.
export const ANSWER_ROLES: Role[] = ["owner", "editor", "contributor"];
// Attest and submit — the spec calls this the approver's sole distinguishing
// power; owner can do everything, so it retains this too.
export const APPROVER_ROLES: Role[] = ["owner", "approver"];
export const ADMIN_ROLES: Role[] = ["owner"];
