import { useEffect, useState } from "react";
import { api, downloadFile } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const TAGS = ["Corporate", "Insurance", "Quality", "Cyber", "Personnel"] as const;
const WRITE_ROLES = new Set(["owner", "editor"]);

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  tags: string[];
  expires_at: string | null;
  uploaded_by_name: string;
  created_at: string;
}

export default function DocumentVault() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filterTag, setFilterTag] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastExtraction, setLastExtraction] = useState<{ title: string; factsUpdated: number; conflicts: number } | null>(null);

  const canWrite = !!user && WRITE_ROLES.has(user.role);

  function load() {
    const query = filterTag ? `?tag=${encodeURIComponent(filterTag)}` : "";
    api.get(`/documents${query}`).then((res) => setDocuments(res.documents)).catch((err) => setError(err.message));
  }

  useEffect(load, [filterTag]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("file", file);
      if (expiresAt) form.append("expiresAt", expiresAt);
      selectedTags.forEach((t) => form.append("tags", t));
      const res = await api.postForm("/documents", form);
      setLastExtraction({
        title: res.document.title,
        factsUpdated: res.extraction?.factsUpdated ?? 0,
        conflicts: res.extraction?.conflicts ?? 0,
      });
      setTitle("");
      setExpiresAt("");
      setSelectedTags([]);
      setFile(null);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy">Document Vault</h1>
        {canWrite && (
          <button onClick={() => setShowForm(!showForm)}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800">
            {showForm ? "Cancel" : "Upload document"}
          </button>
        )}
      </div>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {lastExtraction && (
        <p className="mb-4 rounded bg-purple-50 p-2 text-sm text-purple-800">
          "{lastExtraction.title}" uploaded — {lastExtraction.factsUpdated} fact
          {lastExtraction.factsUpdated === 1 ? "" : "s"} extracted
          {lastExtraction.conflicts > 0 ? `, ${lastExtraction.conflicts} conflicting with an already-verified fact` : ""}.{" "}
          <a href="/facts" className="underline">Review in the Fact Base</a>.
        </p>
      )}

      {showForm && (
        <form onSubmit={handleUpload} className="mb-6 rounded-lg border border-slate-200 p-4">
          <div className="mb-3">
            <label htmlFor="doc-title" className="mb-1 block text-sm text-slate-600">Title</label>
            <input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-sm text-slate-600">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((tag) => (
                <button type="button" key={tag} onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    selectedTags.includes(tag) ? "border-navy bg-navy text-white" : "border-slate-300 text-slate-600"
                  }`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label htmlFor="doc-expires" className="mb-1 block text-sm text-slate-600">Expiry date (optional)</label>
            <input id="doc-expires" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3">
            <label htmlFor="doc-file" className="mb-1 block text-sm text-slate-600">File</label>
            <input id="doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
          </div>
          <button type="submit" disabled={uploading}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilterTag("")}
          className={`rounded-full border px-3 py-1 text-xs ${filterTag === "" ? "border-navy bg-navy text-white" : "border-slate-300 text-slate-600"}`}>
          All
        </button>
        {TAGS.map((tag) => (
          <button key={tag} onClick={() => setFilterTag(tag)}
            className={`rounded-full border px-3 py-1 text-xs ${filterTag === tag ? "border-navy bg-navy text-white" : "border-slate-300 text-slate-600"}`}>
            {tag}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Tags</th>
              <th className="px-4 py-2">Uploaded by</th>
              <th className="px-4 py-2">Expires</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{d.title}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {d.tags.map((t) => (
                      <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2">{d.uploaded_by_name}</td>
                <td className="px-4 py-2">{d.expires_at ? new Date(d.expires_at).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-2">
                  <button onClick={() => downloadFile(`/documents/${d.id}/download`)} className="text-navy underline">
                    Download
                  </button>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No documents yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
