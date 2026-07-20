import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

interface DashboardData {
  certifications: {
    id: string;
    name: string;
    valid_until: string;
    status: "valid" | "expiring_soon" | "expired";
    days_until_expiry: number;
  }[];
  headcounts: {
    total_employees: number;
    bpss_cleared: number;
    sc_cleared: number;
    dv_cleared: number;
  };
  passportEntryCount: number;
  openRequests: number;
  submittedRequests: number;
  documentsCount: number;
}

const STATUS_STYLE: Record<string, string> = {
  valid: "border-slate-200 bg-white",
  expiring_soon: "border-amber-300 bg-amber-50",
  expired: "border-red-300 bg-red-50",
};

const STATUS_LABEL: Record<string, string> = {
  valid: "✓ Valid until",
  expiring_soon: "⚠ Expires",
  expired: "✗ Expired",
};

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
      <h1 className="mb-6 text-2xl font-semibold text-navy">Compliance Dashboard</h1>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Certifications</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3">
        {data.certifications.map((c) => (
          <div key={c.id} className={`rounded-lg border p-4 ${STATUS_STYLE[c.status]}`}>
            <p className="text-sm font-medium text-slate-800">{c.name}</p>
            <p className="text-sm text-slate-600">
              {STATUS_LABEL[c.status]} {new Date(c.valid_until).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </p>
            {c.status === "expiring_soon" && (
              <p className="text-xs text-amber-700">{c.days_until_expiry} days remaining</p>
            )}
          </div>
        ))}
        {data.certifications.length === 0 && (
          <p className="col-span-full text-sm text-slate-400">
            No certifications tracked yet — add one on the{" "}
            <Link to="/certifications" className="text-navy underline">Certifications</Link> page.
          </p>
        )}
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Personnel</h2>
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="BPSS Staff" value={String(data.headcounts.bpss_cleared)} sub={`of ${data.headcounts.total_employees}`} />
        <Stat label="SC Cleared" value={String(data.headcounts.sc_cleared)} />
        <Stat label="DV Cleared" value={String(data.headcounts.dv_cleared)} />
        <Stat label="Documents in vault" value={String(data.documentsCount)} />
      </div>

      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Passport & requests</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Passport Answers" value={String(data.passportEntryCount)} />
        <Stat label="Open Requests" value={String(data.openRequests)} />
        <Stat label="Requests Submitted" value={String(data.submittedRequests)} />
      </div>
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
