import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, downloadFile } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const WRITE_ROLES = new Set(["admin", "compliance_manager", "contributor"]);

interface RequestInfo {
  id: string;
  requester_name: string;
  requester_contact: string | null;
  due_date: string | null;
  status: string;
}

interface Item {
  id: string;
  question_text: string;
  status: "unmatched" | "suggested" | "ai_drafted" | "confirmed";
  suggested_qa_entry_id: string | null;
  suggested_score: number | null;
  suggested_question: string | null;
  suggested_answer: string | null;
  matched_question: string | null;
  matched_answer: string | null;
  custom_answer: string | null;
  ai_draft_answer: string | null;
  ai_draft_source_titles: string[] | null;
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canWrite = !!user && WRITE_ROLES.has(user.role);

  const [request, setRequest] = useState<RequestInfo | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [matching, setMatching] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [draftingId, setDraftingId] = useState<string | null>(null);

  function load() {
    api.get(`/requests/${id}`).then((res) => {
      setRequest(res.request);
      setItems(res.items);
    }).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleMatch(e: React.FormEvent) {
    e.preventDefault();
    const questions = pasted.split("\n").map((q) => q.trim()).filter(Boolean);
    if (questions.length === 0) return;
    setMatching(true);
    setError(null);
    try {
      await api.post(`/requests/${id}/items`, { questions });
      setPasted("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not match questions");
    } finally {
      setMatching(false);
    }
  }

  async function acceptSuggestion(item: Item) {
    await api.patch(`/requests/${id}/items/${item.id}`, { matchedQaEntryId: item.suggested_qa_entry_id });
    load();
  }

  async function saveCustom(itemId: string) {
    await api.patch(`/requests/${id}/items/${itemId}`, { customAnswer: customText });
    setEditingId(null);
    setCustomText("");
    load();
  }

  async function draftFromEvidence(itemId: string) {
    setDraftingId(itemId);
    setError(null);
    try {
      const res = await api.post(`/requests/${id}/items/${itemId}/draft`);
      if (!res.foundEvidence) {
        setError("No supporting evidence found in the document vault for this question.");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a draft");
    } finally {
      setDraftingId(null);
    }
  }

  async function acceptDraft(item: Item) {
    if (!item.ai_draft_answer) return;
    await api.patch(`/requests/${id}/items/${item.id}`, { customAnswer: item.ai_draft_answer });
    load();
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await downloadFile(`/requests/${id}/export`, "POST");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export");
    } finally {
      setExporting(false);
    }
  }

  if (!request) return <p className="p-6 text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-navy">{request.requester_name}</h1>
          <p className="text-sm text-slate-500">
            Status: <span className="capitalize">{request.status}</span>
            {request.due_date && ` · Due ${new Date(request.due_date).toLocaleDateString()}`}
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting || items.length === 0}
          className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
          {exporting ? "Exporting…" : "Export response"}
        </button>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {canWrite && (
        <form onSubmit={handleMatch} className="mb-6 rounded-lg border border-slate-200 p-4">
          <label htmlFor="paste-questions" className="mb-1 block text-sm text-slate-600">
            Paste the questions from their questionnaire (one per line)
          </label>
          <textarea id="paste-questions" rows={5} value={pasted} onChange={(e) => setPasted(e.target.value)}
            placeholder={"Please confirm if you hold Cyber Essentials Plus\nProvide details of your insurance cover"}
            className="mb-3 w-full rounded border border-slate-300 px-3 py-2" />
          <button type="submit" disabled={matching}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {matching ? "Matching…" : "Match to passport"}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const resolvedAnswer = item.custom_answer || item.matched_answer;
          return (
            <div key={item.id} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-2 flex items-start justify-between">
                <p className="font-medium text-slate-800">{item.question_text}</p>
                <span className={`ml-3 shrink-0 rounded px-2 py-0.5 text-xs ${
                  item.status === "confirmed" ? "bg-green-100 text-green-800"
                  : item.status === "suggested" ? "bg-amber-100 text-amber-800"
                  : item.status === "ai_drafted" ? "bg-purple-100 text-purple-800"
                  : "bg-slate-100 text-slate-600"
                }`}>
                  {item.status === "confirmed" ? "✓ Confirmed"
                    : item.status === "suggested" ? "Suggested match"
                    : item.status === "ai_drafted" ? "AI draft — needs review"
                    : "No match"}
                </span>
              </div>

              {resolvedAnswer ? (
                <p className="text-sm text-slate-600">{resolvedAnswer}</p>
              ) : item.ai_draft_answer ? (
                <div className="rounded bg-purple-50 p-2 text-sm">
                  <p className="text-slate-500">
                    AI draft from evidence{item.ai_draft_source_titles?.length
                      ? ` (${item.ai_draft_source_titles.join(", ")})` : ""} — review before accepting:
                  </p>
                  <p className="mt-1 text-slate-700">{item.ai_draft_answer}</p>
                </div>
              ) : item.suggested_answer ? (
                <div className="rounded bg-amber-50 p-2 text-sm">
                  <p className="text-slate-500">Suggested from passport (match {(Number(item.suggested_score) * 100).toFixed(0)}%): "{item.suggested_question}"</p>
                  <p className="mt-1 text-slate-700">{item.suggested_answer}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No passport match found — draft from evidence or add an answer manually.</p>
              )}

              {canWrite && item.status !== "confirmed" && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.suggested_answer && (
                    <button onClick={() => acceptSuggestion(item)}
                      className="rounded bg-navy px-3 py-1 text-xs text-white hover:bg-slate-800">
                      Accept suggestion
                    </button>
                  )}
                  {item.ai_draft_answer ? (
                    <button onClick={() => acceptDraft(item)}
                      className="rounded bg-navy px-3 py-1 text-xs text-white hover:bg-slate-800">
                      Accept AI draft
                    </button>
                  ) : (
                    <button onClick={() => draftFromEvidence(item.id)} disabled={draftingId === item.id}
                      className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                      {draftingId === item.id ? "Drafting…" : "Draft from evidence (AI)"}
                    </button>
                  )}
                  {editingId === item.id ? (
                    <>
                      <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={2}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                      <button onClick={() => saveCustom(item.id)}
                        className="rounded bg-slate-700 px-3 py-1 text-xs text-white hover:bg-slate-600">
                        Save answer
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setEditingId(item.id); setCustomText(item.matched_answer || ""); }}
                      className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">
                      Write custom answer
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <p className="text-sm text-slate-400">Paste questions above to get started.</p>}
      </div>
    </div>
  );
}
