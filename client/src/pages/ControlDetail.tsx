import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";
import AuditLog from "../components/AuditLog.js";

interface Control {
  id: string;
  code: string;
  title: string;
  description: string | null;
  category: string;
  profile_level: string;
  framework_name: string;
}

interface Evidence {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  created_at: string;
  expires_at: string | null;
}

const WRITE_ROLES = new Set(["admin", "compliance_manager", "contributor"]);

export default function ControlDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [control, setControl] = useState<Control | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const canWrite = !!user && WRITE_ROLES.has(user.role);

  function load() {
    api.get(`/controls/${id}`).then((res) => {
      setControl(res.control);
      setEvidence(res.evidence);
      setReloadCount((n) => n + 1);
    }).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("controlIds", id!);
      form.append("file", file);
      await api.postForm("/evidence", form);
      setTitle("");
      setFile(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (error && !control) return <p className="p-6 text-red-700">{error}</p>;
  if (!control) return <p className="p-6 text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <p className="text-sm text-slate-500">{control.framework_name} · {control.category}</p>
      <h1 className="mb-1 text-2xl font-semibold text-navy">{control.code} — {control.title}</h1>
      <p className="mb-6 text-sm capitalize text-slate-500">Profile level: {control.profile_level.replace("_", " ")}</p>
      {control.description && <p className="mb-6 text-slate-700">{control.description}</p>}

      <h2 className="mb-2 text-lg font-medium text-navy">Evidence ({evidence.length})</h2>
      {evidence.length === 0 && <p className="mb-4 text-sm text-slate-500">No evidence mapped to this control yet.</p>}
      <ul className="mb-6 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {evidence.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <div>
              <p className="font-medium text-slate-800">{e.title}</p>
              <p className="text-xs text-slate-400">{e.file_name} · uploaded {new Date(e.created_at).toLocaleDateString()}</p>
            </div>
            <a href={`/api/evidence/${e.id}/download`} className="text-navy underline">Download</a>
          </li>
        ))}
      </ul>

      {canWrite && (
        <form onSubmit={handleUpload} className="rounded-lg border border-slate-200 p-4">
          <h3 className="mb-3 text-sm font-medium text-navy">Attach evidence</h3>
          {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <div className="mb-3">
            <label htmlFor="evidence-title" className="mb-1 block text-sm text-slate-600">Title</label>
            <input id="evidence-title" value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3">
            <label htmlFor="evidence-file" className="mb-1 block text-sm text-slate-600">File</label>
            <input id="evidence-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </div>
          <button type="submit" disabled={uploading}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {uploading ? "Uploading…" : "Upload evidence"}
          </button>
        </form>
      )}

      <AuditLog key={reloadCount} entityType="control" entityId={control.id} />
    </div>
  );
}
