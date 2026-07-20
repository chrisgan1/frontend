import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.js";
import RequireAuth from "./components/RequireAuth.js";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import Controls from "./pages/Controls.js";
import ControlDetail from "./pages/ControlDetail.js";
import Policies from "./pages/Policies.js";
import PolicyDetail from "./pages/PolicyDetail.js";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/controls" element={<RequireAuth><Controls /></RequireAuth>} />
        <Route path="/controls/:id" element={<RequireAuth><ControlDetail /></RequireAuth>} />
        <Route path="/policies" element={<RequireAuth><Policies /></RequireAuth>} />
        <Route path="/policies/:id" element={<RequireAuth><PolicyDetail /></RequireAuth>} />
      </Routes>
    </div>
  );
}
