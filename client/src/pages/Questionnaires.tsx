import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const WRITE_ROLES = new Set(["owner", "editor"]);

interface Questionnaire {
  id: string;
  filename: string;
  status: "parsing" | "ready" | "exported" | "attested";
  uploaded_by_name: string;
  uploaded_at: string;
  question_count: number;
  green_count: number;
}

const STATUS_LABEL: Record<Questionnaire["status"], string> = {
  parsing: "Needs column mapping",
  ready: "Ready",
  exported: "Exported",
  attested: "Attested",
};

export default function Questionnaires() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const canWrite = !!user && WRITE_ROLES.has(user.role);

  function load() {
    api.get("/questionnaires").then((res) => setQuestionnaires(res.questionnaires)).catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.postForm("/questionnaires", form);
      setFile(null);
      if (res.needsMapping) {
        setError(
          `Couldn't auto-detect a question column in "${res.questionnaire.filename}" — this build doesn't have a guided mapping screen yet. Try a workbook with a clear "Question" column header.`,
        );
        load();
      } else {
        navigate(`/questionnaires/${res.questionnaire.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-navy">Questionnaires</h1>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {canWrite && (
        <form onSubmit={handleUpload} className="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 p-4">
          <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          <button type="submit" disabled={uploading || !file}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {uploading ? "Uploading…" : "Upload questionnaire (.xlsx)"}
          </button>
        </form>
      )}

      <div className="space-y-2">
        {questionnaires.map((q) => (
          <button key={q.id} onClick={() => navigate(`/questionnaires/${q.id}`)}
            className="block w-full rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{q.filename}</p>
                <p className="text-sm text-slate-500">
                  {q.question_count} questions · uploaded by {q.uploaded_by_name} · {new Date(q.uploaded_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{STATUS_LABEL[q.status]}</span>
                {q.question_count > 0 && (
                  <p className="mt-1 text-sm text-slate-500">
                    {Math.round((q.green_count / q.question_count) * 100)}% ready
                  </p>
                )}
              </div>
            </div>
          </button>
        ))}
        {questionnaires.length === 0 && (
          <p className="rounded-lg border border-slate-200 p-6 text-center text-slate-400">
            No questionnaires yet — upload one to get started.
          </p>
        )}
      </div>
    </div>
  );
}
