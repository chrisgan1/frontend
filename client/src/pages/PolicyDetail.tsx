import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";
import AuditLog from "../components/AuditLog.js";

interface Policy {
  id: string;
  title: string;
  status: string;
  owner_name: string;
  renewal_date: string | null;
}

interface Version {
  id: string;
  version: number;
  content: string;
  created_by_name: string;
  approved_by_name: string | null;
  approved_at: string | null;
  attestation_count: number;
}

const WRITE_ROLES = new Set(["admin", "compliance_manager", "contributor"]);
const APPROVE_ROLES = new Set(["admin", "compliance_manager"]);

export default function PolicyDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [showNewVersion, setShowNewVersion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const canWrite = !!user && WRITE_ROLES.has(user.role);
  const canApprove = !!user && APPROVE_ROLES.has(user.role);

  function load() {
    api.get(`/policies/${id}`).then((res) => {
      setPolicy(res.policy);
      setVersions(res.versions);
      setReloadCount((n) => n + 1);
    }).catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function handleNewVersion(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/policies/${id}/versions`, { content: newContent });
      setNewContent("");
      setShowNewVersion(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create version");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove(versionId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/policy-versions/${versionId}/approve`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve");
    } finally {
      setBusy(false);
    }
  }

  async function handleAttest(versionId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/policy-versions/${versionId}/attest`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not attest");
    } finally {
      setBusy(false);
    }
  }

  if (error && !policy) return <p className="p-6 text-red-700">{error}</p>;
  if (!policy) return <p className="p-6 text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-semibold text-navy">{policy.title}</h1>
      <p className="mb-6 text-sm text-slate-500">
        Owner: {policy.owner_name} · Status: <span className="capitalize">{policy.status}</span>
        {policy.renewal_date && <> · Renewal: {policy.renewal_date}</>}
      </p>

      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      {canWrite && (
        <div className="mb-6">
          <button onClick={() => setShowNewVersion(!showNewVersion)}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800">
            {showNewVersion ? "Cancel" : "Draft new version"}
          </button>
          {showNewVersion && (
            <form onSubmit={handleNewVersion} className="mt-3 rounded-lg border border-slate-200 p-4">
              <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} required rows={5}
                className="mb-3 w-full rounded border border-slate-300 px-3 py-2" placeholder="Policy content" />
              <button type="submit" disabled={busy}
                className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
                Save version
              </button>
            </form>
          )}
        </div>
      )}

      <h2 className="mb-3 text-lg font-medium text-navy">Versions</h2>
      <div className="space-y-4">
        {versions.map((v) => (
          <div key={v.id} className="rounded-lg border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium text-slate-800">Version {v.version}</span>
              <span className="text-xs text-slate-400">
                {v.approved_by_name ? `Approved by ${v.approved_by_name}` : "Not approved"}
              </span>
            </div>
            <p className="mb-3 whitespace-pre-wrap text-sm text-slate-700">{v.content}</p>
            <p className="mb-3 text-xs text-slate-500">
              Created by {v.created_by_name} · {v.attestation_count} attestation(s)
            </p>
            <div className="flex gap-2">
              {canApprove && !v.approved_by_name && (
                <button onClick={() => handleApprove(v.id)} disabled={busy}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50">
                  Approve
                </button>
              )}
              <button onClick={() => handleAttest(v.id)} disabled={busy}
                className="rounded bg-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-300 disabled:opacity-50">
                Attest (I have read this)
              </button>
            </div>
          </div>
        ))}
      </div>

      <AuditLog key={reloadCount} entityType="policy" entityId={policy.id} />
    </div>
  );
}
