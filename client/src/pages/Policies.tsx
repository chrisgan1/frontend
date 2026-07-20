import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

interface Policy {
  id: string;
  title: string;
  status: string;
  owner_name: string;
  renewal_date: string | null;
  latest_version: number;
}

const WRITE_ROLES = new Set(["admin", "compliance_manager", "contributor"]);

export default function Policies() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canWrite = !!user && WRITE_ROLES.has(user.role);

  function load() {
    api.get("/policies").then((res) => setPolicies(res.policies)).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/policies", { title, content, renewalDate: renewalDate || undefined });
      setTitle("");
      setContent("");
      setRenewalDate("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create policy");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Policies</h1>
        {canWrite && (
          <button onClick={() => setShowForm(!showForm)}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800">
            {showForm ? "Cancel" : "New policy"}
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-lg border border-slate-200 p-4">
          <div className="mb-3">
            <label htmlFor="policy-title" className="mb-1 block text-sm text-slate-600">Title</label>
            <input id="policy-title" value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3">
            <label htmlFor="policy-content" className="mb-1 block text-sm text-slate-600">Content (v1)</label>
            <textarea id="policy-content" value={content} onChange={(e) => setContent(e.target.value)} required rows={5}
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3">
            <label htmlFor="policy-renewal" className="mb-1 block text-sm text-slate-600">Renewal date (optional)</label>
            <input id="policy-renewal" type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2" />
          </div>
          <button type="submit" disabled={submitting}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {submitting ? "Saving…" : "Create policy"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Owner</th>
              <th className="px-4 py-2">Version</th>
              <th className="px-4 py-2">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/policies/${p.id}`} className="text-navy underline">{p.title}</Link>
                </td>
                <td className="px-4 py-2 capitalize">{p.status}</td>
                <td className="px-4 py-2">{p.owner_name}</td>
                <td className="px-4 py-2">v{p.latest_version}</td>
                <td className="px-4 py-2">{p.renewal_date ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
