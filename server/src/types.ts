export type Role = "owner" | "editor" | "contributor" | "approver" | "read_only";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  organisationId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
