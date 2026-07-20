import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("contributor");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow">
        <h1 className="mb-1 text-xl font-semibold text-navy">MOD Compliance Platform</h1>
        <p className="mb-6 text-sm text-slate-500">
          {mode === "login" ? "Sign in to continue" : "Register the first admin account, or an admin can add users from the API"}
        </p>

        {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        {mode === "register" && (
          <div className="mb-3">
            <label htmlFor="name" className="mb-1 block text-sm text-slate-600">Name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
        )}

        <div className="mb-3">
          <label htmlFor="email" className="mb-1 block text-sm text-slate-600">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="w-full rounded border border-slate-300 px-3 py-2" />
        </div>

        <div className="mb-3">
          <label htmlFor="password" className="mb-1 block text-sm text-slate-600">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            minLength={8} className="w-full rounded border border-slate-300 px-3 py-2" />
        </div>

        {mode === "register" && (
          <div className="mb-4">
            <label htmlFor="role" className="mb-1 block text-sm text-slate-600">Role (ignored for first user, who becomes admin)</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2">
              <option value="compliance_manager">Compliance Manager</option>
              <option value="contributor">Contributor</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full rounded bg-navy py-2 text-white hover:bg-slate-800 disabled:opacity-50">
          {submitting ? "Please wait…" : mode === "login" ? "Sign in" : "Register"}
        </button>

        <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="mt-3 w-full text-sm text-slate-500 hover:text-navy">
          {mode === "login" ? "First time? Register the admin account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
