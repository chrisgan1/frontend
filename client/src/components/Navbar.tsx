import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="bg-navy text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold tracking-wide">Compliance Passport</span>
        <Link to="/" className="text-sm text-slate-200 hover:text-white">Dashboard</Link>
        <Link to="/passport" className="text-sm text-slate-200 hover:text-white">Passport</Link>
        <Link to="/requests" className="text-sm text-slate-200 hover:text-white">Requests</Link>
        <Link to="/documents" className="text-sm text-slate-200 hover:text-white">Document Vault</Link>
        <Link to="/certifications" className="text-sm text-slate-200 hover:text-white">Certifications</Link>
        <Link to="/clearance" className="text-sm text-slate-200 hover:text-white">Clearance Tracker</Link>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-200">
        <span>{user.name} · {user.role.replace("_", " ")}</span>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600"
        >
          Log out
        </button>
      </div>
    </nav>
  );
}
