import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";

interface Control {
  id: string;
  code: string;
  title: string;
  category: string;
  profile_level: string;
  framework_name: string;
  evidence_count: number;
}

export default function Controls() {
  const [controls, setControls] = useState<Control[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get("/controls").then((res) => setControls(res.controls)).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="p-6 text-red-700">{error}</p>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-navy">Control Library</h1>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Profile level</th>
              <th className="px-4 py-2">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {controls.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2">
                  <Link to={`/controls/${c.id}`} className="text-navy underline">{c.code}</Link>
                </td>
                <td className="px-4 py-2">{c.title}</td>
                <td className="px-4 py-2">{c.category}</td>
                <td className="px-4 py-2 capitalize">{c.profile_level.replace("_", " ")}</td>
                <td className="px-4 py-2">
                  {c.evidence_count > 0 ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-green-800">{c.evidence_count}</span>
                  ) : (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">none</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
