import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const WRITE_ROLES = new Set(["admin", "compliance_manager", "contributor"]);

interface RequestRow {
  id: string;
  requester_name: string;
  requester_contact: string | null;
  due_date: string | null;
  status: "open" | "submitted";
  item_count: number;
  confirmed_count: number;
}

export default function Requests() {
  const { user } = useAuth();
  const canWrite = !!user && WRITE_ROLES.has(user.role);

  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterContact, setRequesterContact] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get("/requests").then((res) => setRequests(res.requests)).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/requests", {
        requesterName,
        requesterContact: requesterContact || undefined,
        dueDate: dueDate || undefined,
      });
      setRequesterName("");
      setRequesterContact("");
      setDueDate("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Requests</h1>
        {canWrite && (
          <button onClick={() => setShowForm(!showForm)}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800">
            {showForm ? "Cancel" : "New request"}
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Track incoming assurance questionnaires from primes and answer them from your passport.
      </p>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-slate-200 p-4">
          <div className="mb-3">
            <label htmlFor="req-name" className="mb-1 block text-sm text-slate-600">Requester (prime/customer)</label>
            <input id="req-name" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} required
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3 flex gap-3">
            <div className="flex-1">
              <label htmlFor="req-contact" className="mb-1 block text-sm text-slate-600">Contact (optional)</label>
              <input id="req-contact" value={requesterContact} onChange={(e) => setRequesterContact(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2" />
            </div>
            <div className="flex-1">
              <label htmlFor="req-due" className="mb-1 block text-sm text-slate-600">Due date (optional)</label>
              <input id="req-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2" />
            </div>
          </div>
          <button type="submit" disabled={submitting}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {submitting ? "Creating…" : "Create request"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Requester</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Progress</th>
              <th className="px-4 py-2">Due</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2">
                  <Link to={`/requests/${r.id}`} className="text-navy underline">{r.requester_name}</Link>
                </td>
                <td className="px-4 py-2 capitalize">{r.status}</td>
                <td className="px-4 py-2">{r.confirmed_count} / {r.item_count} confirmed</td>
                <td className="px-4 py-2">{r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
