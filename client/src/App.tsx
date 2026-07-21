import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.js";
import RequireAuth from "./components/RequireAuth.js";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import DocumentVault from "./pages/DocumentVault.js";
import FactBase from "./pages/FactBase.js";
import Questionnaires from "./pages/Questionnaires.js";
import QuestionnaireDetail from "./pages/QuestionnaireDetail.js";
import GapRegister from "./pages/GapRegister.js";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/facts" element={<RequireAuth><FactBase /></RequireAuth>} />
        <Route path="/documents" element={<RequireAuth><DocumentVault /></RequireAuth>} />
        <Route path="/questionnaires" element={<RequireAuth><Questionnaires /></RequireAuth>} />
        <Route path="/questionnaires/:id" element={<RequireAuth><QuestionnaireDetail /></RequireAuth>} />
        <Route path="/gaps" element={<RequireAuth><GapRegister /></RequireAuth>} />
      </Routes>
    </div>
  );
}
