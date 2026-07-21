import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, downloadFile } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const WRITE_ROLES = new Set(["owner", "editor"]);
const ANSWER_ROLES = new Set(["owner", "editor", "contributor"]);
const APPROVER_ROLES = new Set(["owner", "approver"]);

type RagStatus = "red" | "amber" | "green";

interface Item {
  id: string;
  question_text: string;
  section: string | null;
  answer_text: string;
  answer_status: RagStatus;
  confidence: number | null;
  source: string;
  cited_fact_ids: string[];
  is_override: boolean;
  confirmed: boolean;
  gap_id: string | null;
  gap_type: string | null;
  gap_status: string | null;
}

const STATUS_STYLE: Record<RagStatus, string> = {
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-green-100 text-green-800",
};

export default function QuestionnaireDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [readiness, setReadiness] = useState(0);
  const [counts, setCounts] = useState({ red: 0, amber: 0, green: 0, total: 0 });
  const [factLabels, setFactLabels] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<RagStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");

  const canWrite = !!user && WRITE_ROLES.has(user.role);
  const canAnswer = !!user && ANSWER_ROLES.has(user.role);
  const canApprove = !!user && APPROVER_ROLES.has(user.role);

  function load() {
    api.get(`/questionnaires/${id}`).then((res) => {
      setQuestionnaire(res.questionnaire);
      setItems(res.items);
      setReadiness(res.readiness);
      setCounts(res.counts);
    }).catch((err) => setError(err.message));
    api.get("/facts").then((res) => {
      const map: Record<string, string> = {};
      for (const f of res.facts) map[f.id] = f.label;
      setFactLabels(map);
    }).catch(() => {});
  }

  useEffect(load, [id]);

  async function runEngine() {
    setRunning(true);
    setError(null);
    try {
      await api.post(`/questionnaires/${id}/run`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the answer engine");
    } finally {
      setRunning(false);
    }
  }

  async function accept(itemId: string) {
    setError(null);
    try {
      await api.post(`/questionnaires/${id}/items/${itemId}/accept`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept");
    }
  }

  async function bulkAcceptGreen() {
    setError(null);
    const toAccept = items.filter((i) => i.answer_status === "green" && !i.confirmed);
    for (const item of toAccept) {
      await api.post(`/questionnaires/${id}/items/${item.id}/accept`).catch(() => {});
    }
    load();
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setDraftText(item.answer_text || "");
  }

  async function saveEdit(itemId: string) {
    setError(null);
    try {
      await api.patch(`/questionnaires/${id}/items/${itemId}`, { text: draftText, status: "green" });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function handleExport() {
    setError(null);
    try {
      await downloadFile(`/questionnaires/${id}/export`, "POST");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  }

  async function handleAttest() {
    setError(null);
    try {
      await api.post(`/questionnaires/${id}/attest`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attest");
    }
  }

  if (!questionnaire) return <div className="mx-auto max-w-4xl p-6">{error ? <p className="text-red-700">{error}</p> : "Loading…"}</div>;

  const visibleItems = filter === "all" ? items : items.filter((i) => i.answer_status === filter);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{questionnaire.filename}</h1>
          <p className="text-sm text-slate-500">Status: {questionnaire.status}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold text-navy">{Math.round(readiness * 100)}%</p>
          <p className="text-sm text-slate-500">ready</p>
        </div>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {canWrite && (
          <button onClick={runEngine} disabled={running}
            className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-slate-800 disabled:opacity-50">
            {running ? "Running…" : "Run Answer Engine"}
          </button>
        )}
        {canAnswer && counts.green > 0 && (
          <button onClick={bulkAcceptGreen}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            Bulk-accept green
          </button>
        )}
        {canWrite && (
          <button onClick={handleExport}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
            Export filled workbook
          </button>
        )}
        {canApprove && questionnaire.status !== "attested" && (
          <button onClick={handleAttest}
            className="rounded bg-green-700 px-3 py-1.5 text-xs text-white hover:bg-green-800">
            Attest and submit
          </button>
        )}
        {questionnaire.status === "attested" && (
          <span className="rounded bg-green-100 px-3 py-1.5 text-xs text-green-800">Attested — locked</span>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        {(["all", "red", "amber", "green"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs capitalize ${
              filter === f ? "border-navy bg-navy text-white" : "border-slate-300 text-slate-600"
            }`}>
            {f === "all" ? `All (${counts.total})` : `${f} (${counts[f]})`}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visibleItems.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="font-medium text-slate-800">{item.question_text}</p>
              <div className="flex shrink-0 items-center gap-2">
                {item.confirmed && <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Confirmed</span>}
                <span className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLE[item.answer_status]}`}>
                  {item.answer_status}
                </span>
              </div>
            </div>

            {editingId === item.id ? (
              <div>
                <textarea value={draftText} onChange={(e) => setDraftText(e.target.value)} rows={3}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => saveEdit(item.id)}
                    className="rounded bg-navy px-3 py-1 text-xs text-white hover:bg-slate-800">Save</button>
                  <button onClick={() => setEditingId(null)}
                    className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            ) : item.answer_status === "red" ? (
              <div>
                <p className="text-sm text-slate-400">
                  No supporting evidence found — genuine gap
                  {item.gap_type ? ` (type ${item.gap_type})` : ""}.{" "}
                  <a href="/gaps" className="underline">View in Gap Register</a>.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-slate-700">{item.answer_text}</p>
                <p className="mt-1 text-xs text-slate-400">
                  source: {item.source}
                  {item.confidence != null ? ` · confidence ${(item.confidence * 100).toFixed(0)}%` : ""}
                  {item.cited_fact_ids.length > 0 && (
                    <> · citing: {item.cited_fact_ids.map((fid) => factLabels[fid] ?? fid).join(", ")}</>
                  )}
                  {item.is_override && " · human override"}
                </p>
              </div>
            )}

            {canAnswer && editingId !== item.id && item.answer_status !== "red" && (
              <div className="mt-2 flex gap-2">
                {!item.confirmed && (
                  <button onClick={() => accept(item.id)}
                    className="rounded bg-navy px-3 py-1 text-xs text-white hover:bg-slate-800">Accept</button>
                )}
                <button onClick={() => startEdit(item)}
                  className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                  {item.confirmed ? "Edit" : "Edit before accepting"}
                </button>
              </div>
            )}
            {canAnswer && editingId !== item.id && item.answer_status === "red" && (
              <div className="mt-2">
                <button onClick={() => startEdit(item)}
                  className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                  Write an answer manually
                </button>
              </div>
            )}
          </div>
        ))}
        {visibleItems.length === 0 && (
          <p className="rounded-lg border border-slate-200 p-6 text-center text-slate-400">Nothing here.</p>
        )}
      </div>
    </div>
  );
}
