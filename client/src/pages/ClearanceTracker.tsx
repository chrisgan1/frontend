import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const WRITE_ROLES = new Set(["admin", "compliance_manager", "contributor"]);
const CLEARANCE_LABEL: Record<string, string> = { none: "None", in_progress: "In progress", granted: "Granted" };
const REQUIRED_CLEARANCE_LABEL: Record<string, string> = { none: "None", bpss: "BPSS", sc: "SC", dv: "DV" };

interface Employee {
  id: string;
  name: string;
  role_title: string | null;
  bpss_cleared: boolean;
  sc_status: string;
  sc_expiry: string | null;
  dv_status: string;
  dv_expiry: string | null;
  sponsor: string | null;
}

interface Project {
  id: string;
  name: string;
  required_clearance: string;
  assigned_count: number;
}

export default function ClearanceTracker() {
  const { user } = useAuth();
  const canWrite = !!user && WRITE_ROLES.has(user.role);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [eligible, setEligible] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empBpss, setEmpBpss] = useState(false);
  const [empSc, setEmpSc] = useState("none");
  const [empScExpiry, setEmpScExpiry] = useState("");
  const [empSubmitting, setEmpSubmitting] = useState(false);

  const [showProjForm, setShowProjForm] = useState(false);
  const [projName, setProjName] = useState("");
  const [projClearance, setProjClearance] = useState("bpss");
  const [projSubmitting, setProjSubmitting] = useState(false);

  function loadEmployees() {
    api.get("/employees").then((res) => setEmployees(res.employees)).catch((err) => setError(err.message));
  }
  function loadProjects() {
    api.get("/projects").then((res) => setProjects(res.projects)).catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadEmployees();
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setEligible(null);
      return;
    }
    api.get(`/projects/${selectedProject}/eligible-employees`).then((res) => setEligible(res.eligibleEmployees));
  }, [selectedProject]);

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    setEmpSubmitting(true);
    setError(null);
    try {
      await api.post("/employees", {
        name: empName,
        roleTitle: empRole || undefined,
        bpssCleared: empBpss,
        scStatus: empSc,
        scExpiry: empScExpiry || undefined,
      });
      setEmpName("");
      setEmpRole("");
      setEmpBpss(false);
      setEmpSc("none");
      setEmpScExpiry("");
      setShowEmpForm(false);
      loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add employee");
    } finally {
      setEmpSubmitting(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setProjSubmitting(true);
    setError(null);
    try {
      await api.post("/projects", { name: projName, requiredClearance: projClearance });
      setProjName("");
      setProjClearance("bpss");
      setShowProjForm(false);
      loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add project");
    } finally {
      setProjSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-navy">Security Clearance Tracker</h1>
      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="mb-8 rounded-lg border border-slate-200 p-4">
        <h2 className="mb-3 text-lg font-medium text-navy">Who can work on…?</h2>
        <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
          className="mb-3 rounded border border-slate-300 px-3 py-2">
          <option value="">Select a project…</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (requires {REQUIRED_CLEARANCE_LABEL[p.required_clearance] || p.required_clearance})</option>
          ))}
        </select>
        {eligible && (
          <ul className="divide-y divide-slate-100 rounded border border-slate-100">
            {eligible.map((e) => (
              <li key={e.id} className="px-3 py-2 text-sm">{e.name} — {e.role_title}</li>
            ))}
            {eligible.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">No eligible staff currently.</li>}
          </ul>
        )}
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-navy">Employees</h2>
          {canWrite && (
            <button onClick={() => setShowEmpForm(!showEmpForm)}
              className="rounded bg-navy px-3 py-1.5 text-sm text-white hover:bg-slate-800">
              {showEmpForm ? "Cancel" : "Add employee"}
            </button>
          )}
        </div>

        {showEmpForm && (
          <form onSubmit={handleCreateEmployee} className="mb-4 rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <label htmlFor="emp-name" className="mb-1 block text-sm text-slate-600">Name</label>
                <input id="emp-name" value={empName} onChange={(e) => setEmpName(e.target.value)} required
                  className="w-full rounded border border-slate-300 px-3 py-2" />
              </div>
              <div className="flex-1">
                <label htmlFor="emp-role" className="mb-1 block text-sm text-slate-600">Role</label>
                <input id="emp-role" value={empRole} onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2" />
              </div>
            </div>
            <div className="mb-3 flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={empBpss} onChange={(e) => setEmpBpss(e.target.checked)} />
                BPSS cleared
              </label>
              <label htmlFor="emp-sc" className="text-sm text-slate-600">SC status</label>
              <select id="emp-sc" value={empSc} onChange={(e) => setEmpSc(e.target.value)}
                className="rounded border border-slate-300 px-2 py-1 text-sm">
                <option value="none">None</option>
                <option value="in_progress">In progress</option>
                <option value="granted">Granted</option>
              </select>
              {empSc === "granted" && (
                <input type="date" value={empScExpiry} onChange={(e) => setEmpScExpiry(e.target.value)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm" />
              )}
            </div>
            <button type="submit" disabled={empSubmitting}
              className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
              {empSubmitting ? "Saving…" : "Add employee"}
            </button>
          </form>
        )}

        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">BPSS</th>
                <th className="px-4 py-2">SC</th>
                <th className="px-4 py-2">DV</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{e.name}</td>
                  <td className="px-4 py-2">{e.role_title ?? "—"}</td>
                  <td className="px-4 py-2">{e.bpss_cleared ? "✓" : "—"}</td>
                  <td className="px-4 py-2">
                    {CLEARANCE_LABEL[e.sc_status]}{e.sc_expiry && ` (${new Date(e.sc_expiry).toLocaleDateString()})`}
                  </td>
                  <td className="px-4 py-2">
                    {CLEARANCE_LABEL[e.dv_status]}{e.dv_expiry && ` (${new Date(e.dv_expiry).toLocaleDateString()})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-navy">Projects</h2>
          {canWrite && (
            <button onClick={() => setShowProjForm(!showProjForm)}
              className="rounded bg-navy px-3 py-1.5 text-sm text-white hover:bg-slate-800">
              {showProjForm ? "Cancel" : "Add project"}
            </button>
          )}
        </div>

        {showProjForm && (
          <form onSubmit={handleCreateProject} className="mb-4 rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <label htmlFor="proj-name" className="mb-1 block text-sm text-slate-600">Project name</label>
                <input id="proj-name" value={projName} onChange={(e) => setProjName(e.target.value)} required
                  className="w-full rounded border border-slate-300 px-3 py-2" />
              </div>
              <div>
                <label htmlFor="proj-clearance" className="mb-1 block text-sm text-slate-600">Required clearance</label>
                <select id="proj-clearance" value={projClearance} onChange={(e) => setProjClearance(e.target.value)}
                  className="rounded border border-slate-300 px-3 py-2">
                  <option value="none">None</option>
                  <option value="bpss">BPSS</option>
                  <option value="sc">SC</option>
                  <option value="dv">DV</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={projSubmitting}
              className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
              {projSubmitting ? "Saving…" : "Add project"}
            </button>
          </form>
        )}

        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {projects.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>{p.name}</span>
              <span className="text-slate-400">requires {REQUIRED_CLEARANCE_LABEL[p.required_clearance] || p.required_clearance} · {p.assigned_count} assigned</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
