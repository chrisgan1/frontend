import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const WRITE_ROLES = new Set(["admin", "compliance_manager", "contributor"]);

interface Certification {
  id: string;
  name: string;
  valid_from: string | null;
  valid_until: string;
  status: "valid" | "expiring_soon" | "expired";
  days_until_expiry: number;
  document_title: string | null;
}

const STATUS_STYLE: Record<string, string> = {
  valid: "bg-green-100 text-green-800",
  expiring_soon: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  valid: "✓ Valid",
  expiring_soon: "⚠ Expiring soon",
  expired: "✗ Expired",
};

export default function Certifications() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<Certification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canWrite = !!user && WRITE_ROLES.has(user.role);

  function load() {
    api.get("/certifications").then((res) => setCerts(res.certifications)).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/certifications", { name, validFrom: validFrom || undefined, validUntil });
      setName("");
      setValidFrom("");
      setValidUntil("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add certification");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/certifications/${id}`);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Certifications</h1>
        {canWrite && (
          <button onClick={() => setShowForm(!showForm)}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800">
            {showForm ? "Cancel" : "Add certification"}
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-slate-200 p-4">
          <div className="mb-3">
            <label htmlFor="cert-name" className="mb-1 block text-sm text-slate-600">Name</label>
            <input id="cert-name" value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="e.g. Cyber Essentials Plus"
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3 flex gap-3">
            <div className="flex-1">
              <label htmlFor="cert-from" className="mb-1 block text-sm text-slate-600">Valid from (optional)</label>
              <input id="cert-from" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2" />
            </div>
            <div className="flex-1">
              <label htmlFor="cert-until" className="mb-1 block text-sm text-slate-600">Valid until</label>
              <input id="cert-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required
                className="w-full rounded border border-slate-300 px-3 py-2" />
            </div>
          </div>
          <button type="submit" disabled={submitting}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {submitting ? "Saving…" : "Add"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {certs.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="font-medium text-slate-800">{c.name}</p>
              <p className="text-sm text-slate-500">
                Valid until {new Date(c.valid_until).toLocaleDateString()}
                {c.status !== "expired" && ` (${c.days_until_expiry} days)`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded px-2 py-1 text-xs font-medium ${STATUS_STYLE[c.status]}`}>
                {STATUS_LABEL[c.status]}
              </span>
              {canWrite && (
                <button onClick={() => handleDelete(c.id)} className="text-xs text-slate-400 hover:text-red-600">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {certs.length === 0 && <p className="text-sm text-slate-400">No certifications tracked yet.</p>}
      </div>
    </div>
  );
}
