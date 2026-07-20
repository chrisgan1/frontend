import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const TOPICS = ["Security", "Quality", "Insurance", "People", "Export Control", "Data Protection", "Modern Slavery", "Financial"] as const;
const WRITE_ROLES = new Set(["admin", "compliance_manager", "contributor"]);

interface Entry {
  id: string;
  topic: string;
  question: string;
  answer: string;
  status: "draft" | "confirmed";
  evidence: { id: string; title: string }[] | null;
}

export default function Passport() {
  const { user } = useAuth();
  const canWrite = !!user && WRITE_ROLES.has(user.role);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [topic, setTopic] = useState<string>("Security");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.get("/passport").then((res) => setEntries(res.entries)).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/passport", { topic, question, answer });
      setQuestion("");
      setAnswer("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/passport/${id}`);
    load();
  }

  const grouped = TOPICS.map((t) => ({ topic: t, items: entries.filter((e) => e.topic === t) })).filter(
    (g) => g.items.length > 0,
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Compliance Passport</h1>
        {canWrite && (
          <button onClick={() => setShowForm(!showForm)}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800">
            {showForm ? "Cancel" : "Add answer"}
          </button>
        )}
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Answer common assurance questions once here. When a request comes in, match it against these answers
        instead of starting from scratch.
      </p>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-slate-200 p-4">
          <div className="mb-3">
            <label htmlFor="qa-topic" className="mb-1 block text-sm text-slate-600">Topic</label>
            <select id="qa-topic" value={topic} onChange={(e) => setTopic(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2">
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label htmlFor="qa-question" className="mb-1 block text-sm text-slate-600">Question</label>
            <input id="qa-question" value={question} onChange={(e) => setQuestion(e.target.value)} required
              placeholder="e.g. Do you hold Cyber Essentials Plus certification?"
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3">
            <label htmlFor="qa-answer" className="mb-1 block text-sm text-slate-600">Answer</label>
            <textarea id="qa-answer" value={answer} onChange={(e) => setAnswer(e.target.value)} required rows={3}
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <button type="submit" disabled={submitting}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {submitting ? "Saving…" : "Save to passport"}
          </button>
        </form>
      )}

      {grouped.map((g) => (
        <div key={g.topic} className="mb-6">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">{g.topic}</h2>
          <div className="space-y-2">
            {g.items.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-slate-800">{entry.question}</p>
                  {canWrite && (
                    <button onClick={() => handleDelete(entry.id)} className="text-xs text-slate-400 hover:text-red-600">
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">{entry.answer}</p>
                {entry.evidence && entry.evidence.length > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Evidence: {entry.evidence.map((e) => e.title).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {entries.length === 0 && <p className="text-sm text-slate-400">No passport entries yet.</p>}
    </div>
  );
}
