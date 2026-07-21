import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const WRITE_ROLES = new Set(["owner", "editor"]);

const TYPE_LABEL: Record<string, string> = {
  a: "Evidence exists, not uploaded/verified",
  b: "Document needed (generatable)",
  c: "Real control gap",
  d: "Not applicable",
};

interface Gap {
  id: string;
  question_text: string;
  questionnaire_id: string;
  questionnaire_filename: string;
  type: "a" | "b" | "c" | "d";
  note: string | null;
  status: "open" | "closed";
  owner_name: string | null;
  due_date: string | null;
}

export default function GapRegister() {
  const { user } = useAuth();
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const canWrite = !!user && WRITE_ROLES.has(user.role);

  function load() {
    api.get("/gaps").then((res) => setGaps(res.gaps)).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function updateGap(gapId: string, patch: Record<string, unknown>) {
    setError(null);
    try {
      await api.patch(`/gaps/${gapId}`, patch);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update gap");
    }
  }

  const visible = gaps.filter((g) => showClosed || g.status === "open");

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Gap Register</h1>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
          Show closed
        </label>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <p className="mb-6 text-sm text-slate-500">
        Every red item on a Triage Board lands here automatically. The remedy differs by type — evidence that
        exists but wasn't uploaded is a five-minute fix; a real control gap is a genuine task.
      </p>

      <div className="space-y-3">
        {visible.map((gap) => (
          <div key={gap.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-1 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">{gap.question_text}</p>
                <p className="text-xs text-slate-400">
                  <a href={`/questionnaires/${gap.questionnaire_id}`} className="underline">{gap.questionnaire_filename}</a>
                </p>
              </div>
              <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${
                gap.status === "closed" ? "bg-slate-100 text-slate-500" : "bg-red-100 text-red-800"
              }`}>
                {gap.status}
              </span>
            </div>

            {canWrite ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select value={gap.type} onChange={(e) => updateGap(gap.id, { type: e.target.value })}
                  className="rounded border border-slate-300 px-2 py-1 text-xs">
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input placeholder="Note" defaultValue={gap.note ?? ""}
                  onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [gap.id]: e.target.value }))}
                  className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs" />
                <button onClick={() => updateGap(gap.id, { note: noteDrafts[gap.id] ?? gap.note ?? "" })}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                  Save note
                </button>
                {gap.status === "open" ? (
                  <button onClick={() => updateGap(gap.id, { status: "closed" })}
                    className="rounded bg-navy px-2 py-1 text-xs text-white hover:bg-slate-800">
                    Mark closed
                  </button>
                ) : (
                  <button onClick={() => updateGap(gap.id, { status: "open" })}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                    Reopen
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">{TYPE_LABEL[gap.type]}{gap.note ? ` — ${gap.note}` : ""}</p>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="rounded-lg border border-slate-200 p-6 text-center text-slate-400">No open gaps.</p>
        )}
      </div>
    </div>
  );
}
