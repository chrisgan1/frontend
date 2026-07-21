import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

interface DashboardData {
  factBase: {
    verifiedCount: number;
    totalCanonical: number;
    completeness: number;
    conflicts: number;
  };
  expiringSoon: { key: string; label: string; expiry: string }[];
  documentsCount: number;
  questionnaires: { ready: number; exported: number; attested: number; total: number };
  latestQuestionnaire: { id: string; filename: string; status: string; readiness: number } | null;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/dashboard").then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="p-6 text-red-700">{error}</p>;
  if (!data) return <p className="p-6 text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-navy">Dashboard</h1>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Fact Base</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Verified" value={`${Math.round(data.factBase.completeness * 100)}%`}
          sub={`${data.factBase.verifiedCount} of ${data.factBase.totalCanonical} facts`} />
        <div className={`rounded-lg border p-4 ${data.factBase.conflicts > 0 ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
          <p className="text-xs uppercase tracking-wide text-slate-500">Conflicts</p>
          <p className="text-2xl font-semibold text-navy">{data.factBase.conflicts}</p>
          {data.factBase.conflicts > 0 && (
            <Link to="/facts" className="text-xs text-red-700 underline">Resolve in Fact Base</Link>
          )}
        </div>
        <Stat label="Documents in vault" value={String(data.documentsCount)} />
        <Stat label="Questionnaires" value={String(data.questionnaires.total)}
          sub={`${data.questionnaires.attested} attested`} />
      </div>

      {data.expiringSoon.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Expiring soon</h2>
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
            {data.expiringSoon.map((f) => (
              <div key={f.key} className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm font-medium text-slate-800">{f.label}</p>
                <p className="text-sm text-slate-600">
                  ⚠ Expires {new Date(f.expiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Latest questionnaire</h2>
      {data.latestQuestionnaire ? (
        <Link to={`/questionnaires/${data.latestQuestionnaire.id}`}
          className="block rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50">
          <p className="font-medium text-slate-800">{data.latestQuestionnaire.filename}</p>
          <p className="text-sm text-slate-500">
            {Math.round(data.latestQuestionnaire.readiness * 100)}% ready · {data.latestQuestionnaire.status}
          </p>
        </Link>
      ) : (
        <p className="text-sm text-slate-400">
          No questionnaires yet — upload one on the <Link to="/questionnaires" className="text-navy underline">Questionnaires</Link> page.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-navy">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
