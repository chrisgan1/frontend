import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.js";
import RequireAuth from "./components/RequireAuth.js";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import DocumentVault from "./pages/DocumentVault.js";
import Certifications from "./pages/Certifications.js";
import ClearanceTracker from "./pages/ClearanceTracker.js";
import Passport from "./pages/Passport.js";
import Requests from "./pages/Requests.js";
import RequestDetail from "./pages/RequestDetail.js";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/passport" element={<RequireAuth><Passport /></RequireAuth>} />
        <Route path="/requests" element={<RequireAuth><Requests /></RequireAuth>} />
        <Route path="/requests/:id" element={<RequireAuth><RequestDetail /></RequireAuth>} />
        <Route path="/documents" element={<RequireAuth><DocumentVault /></RequireAuth>} />
        <Route path="/certifications" element={<RequireAuth><Certifications /></RequireAuth>} />
        <Route path="/clearance" element={<RequireAuth><ClearanceTracker /></RequireAuth>} />
      </Routes>
    </div>
  );
}
