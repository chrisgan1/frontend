import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

interface DashboardData {
  totals: {
    total_controls: number;
    controls_with_evidence: number;
    total_policies: number;
    approved_policies: number;
    expired_evidence: number;
  };
  byCategory: { category: string; total: number; with_evidence: number }[];
  overdueAttestations: { id: string; title: string; version: number; version_id: string }[];
  overduePolicies: { id: string; title: string; renewal_date: string }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/dashboard").then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="p-6 text-red-700">{error}</p>;
  if (!data) return <p className="p-6 text-slate-500">Loading…</p>;

  const posturePct = data.totals.total_controls
    ? Math.round((data.totals.controls_with_evidence / data.totals.total_controls) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-navy">Compliance Posture</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Controls with evidence" value={`${posturePct}%`} sub={`${data.totals.controls_with_evidence} / ${data.totals.total_controls}`} />
        <Stat label="Approved policies" value={String(data.totals.approved_policies)} sub={`of ${data.totals.total_policies} total`} />
        <Stat label="Expired evidence" value={String(data.totals.expired_evidence)} warn={data.totals.expired_evidence > 0} />
        <Stat label="Overdue attestations" value={String(data.overdueAttestations.length)} warn={data.overdueAttestations.length > 0} />
      </div>

      <h2 className="mb-3 text-lg font-medium text-navy">Posture by category</h2>
      <div className="mb-8 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Controls with evidence</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.byCategory.map((row) => (
              <tr key={row.category} className="border-t border-slate-100">
                <td className="px-4 py-2">{row.category}</td>
                <td className="px-4 py-2">{row.with_evidence}</td>
                <td className="px-4 py-2">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.overduePolicies.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-2 text-lg font-medium text-navy">Overdue policy renewals</h2>
          <ul className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            {data.overduePolicies.map((p) => (
              <li key={p.id}>
                <Link to={`/policies/${p.id}`} className="text-amber-900 underline">{p.title}</Link>
                {" "}— due {p.renewal_date}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${warn ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-navy">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
