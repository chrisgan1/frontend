import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const WRITE_ROLES = new Set(["owner", "editor"]);

interface Extraction {
  id: string;
  documentId: string;
  documentTitle: string;
  pageReference: string | null;
  snippet: string;
  extractedValue: string;
  confidence: number;
  createdAt: string;
}

interface Fact {
  id: string;
  domain: string;
  key: string;
  label: string;
  current_value: string | null;
  status: "unverified" | "verified";
  conflict: boolean;
  expiry: string | null;
  extractions: Extraction[];
}

export default function FactBase() {
  const { user } = useAuth();
  const [facts, setFacts] = useState<Fact[]>([]);
  const [domainLabels, setDomainLabels] = useState<Record<string, string>>({});
  const [completeness, setCompleteness] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [valueDraft, setValueDraft] = useState("");
  const [expiryDraft, setExpiryDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const canWrite = !!user && WRITE_ROLES.has(user.role);

  function load() {
    api.get("/facts").then((res) => {
      setFacts(res.facts);
      setDomainLabels(res.domainLabels);
      setCompleteness(res.completeness);
    }).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function openReview(fact: Fact) {
    setOpenId(fact.id);
    setValueDraft(fact.current_value ?? (fact.extractions[0]?.extractedValue ?? ""));
    setExpiryDraft(fact.expiry ?? "");
  }

  async function save(factId: string) {
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/facts/${factId}`, { value: valueDraft, expiry: expiryDraft || undefined });
      setOpenId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save fact");
    } finally {
      setSaving(false);
    }
  }

  const byDomain = facts.reduce<Record<string, Fact[]>>((acc, f) => {
    (acc[f.domain] ??= []).push(f);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Fact Base</h1>
        <span className="text-sm text-slate-500">{Math.round(completeness * 100)}% verified</span>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <p className="mb-6 text-sm text-slate-500">
        Facts are extracted automatically from documents you upload to the vault. Review each one against its
        source snippet before it counts as verified — an unverified or conflicting fact can never produce a
        green answer on a questionnaire.
      </p>

      {Object.keys(byDomain).length === 0 && (
        <p className="rounded-lg border border-slate-200 p-6 text-center text-slate-400">
          No facts yet — upload a document to the vault to extract some.
        </p>
      )}

      {Object.entries(byDomain).map(([domain, domainFacts]) => (
        <div key={domain} className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {domain} — {domainLabels[domain] ?? domain}
          </h2>
          <div className="space-y-2">
            {domainFacts.map((fact) => (
              <div key={fact.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{fact.label}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{fact.current_value ?? "—"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {fact.conflict && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-800">Conflict</span>
                    )}
                    <span className={`rounded px-2 py-0.5 text-xs ${
                      fact.status === "verified" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"
                    }`}>
                      {fact.status === "verified" ? "Verified" : "Unverified"}
                    </span>
                    {canWrite && (
                      <button onClick={() => openReview(fact)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">
                        Review
                      </button>
                    )}
                  </div>
                </div>

                {openId === fact.id && (
                  <div className="mt-3 rounded bg-slate-50 p-3">
                    {fact.extractions.length === 0 && (
                      <p className="mb-2 text-xs text-slate-400">No extraction on record — enter a value manually.</p>
                    )}
                    {fact.extractions.map((ex) => (
                      <div key={ex.id} className="mb-2 border-l-2 border-slate-300 pl-2 text-xs text-slate-500">
                        <p>
                          <span className="font-medium text-slate-700">{ex.extractedValue}</span>
                          {" "}— {ex.documentTitle}{ex.pageReference ? `, p.${ex.pageReference}` : ""}
                          {" "}(confidence {(ex.confidence * 100).toFixed(0)}%)
                        </p>
                        <p className="italic">"{ex.snippet}"</p>
                      </div>
                    ))}
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">Verified value</label>
                        <input value={valueDraft} onChange={(e) => setValueDraft(e.target.value)}
                          className="rounded border border-slate-300 px-2 py-1 text-sm" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-slate-600">Expiry (optional)</label>
                        <input type="date" value={expiryDraft} onChange={(e) => setExpiryDraft(e.target.value)}
                          className="rounded border border-slate-300 px-2 py-1 text-sm" />
                      </div>
                      <button onClick={() => save(fact.id)} disabled={saving}
                        className="rounded bg-navy px-3 py-1.5 text-xs text-white hover:bg-slate-800 disabled:opacity-50">
                        {saving ? "Saving…" : fact.conflict ? "Resolve conflict" : "Confirm"}
                      </button>
                      <button onClick={() => setOpenId(null)}
                        className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
