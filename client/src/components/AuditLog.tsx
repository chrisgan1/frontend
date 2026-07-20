import { useEffect, useState } from "react";
import { api } from "../api/client.js";

interface Entry {
  id: string;
  action: string;
  user_name: string | null;
  created_at: string;
}

export default function AuditLog({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    api
      .get(`/audit-log?entityType=${entityType}&entityId=${entityId}`)
      .then((res) => setEntries(res.entries))
      .catch(() => setEntries([]));
  }, [entityType, entityId]);

  if (entries.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-lg font-medium text-navy">Audit trail</h2>
      <ul className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-4 py-2">
            <span className="capitalize text-slate-700">{e.action.replace(/_/g, " ")}</span>
            <span className="text-xs text-slate-400">
              {e.user_name ?? "system"} · {new Date(e.created_at).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
