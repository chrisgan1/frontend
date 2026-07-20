import { useEffect, useState } from "react";
import { api, downloadFile } from "../api/client.js";
import { useAuth } from "../context/AuthContext.js";

const WRITE_ROLES = new Set(["admin", "compliance_manager", "contributor"]);

interface Profile {
  name: string;
  address: string;
  capability_statement: string;
  contact_name: string;
  contact_email: string;
}

export default function SupplierPack() {
  const { user } = useAuth();
  const canWrite = !!user && WRITE_ROLES.has(user.role);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    api.get("/company-profile").then((res) => setProfile(res.profile)).catch((err) => setError(err.message));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSavedMsg(false);
    try {
      const res = await api.put("/company-profile", {
        name: profile.name,
        address: profile.address,
        capabilityStatement: profile.capability_statement,
        contactName: profile.contact_name,
        contactEmail: profile.contact_email,
      });
      setProfile(res.profile);
      setSavedMsg(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      await downloadFile("/supplier-pack/generate", "POST");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate pack");
    } finally {
      setGenerating(false);
    }
  }

  if (!profile) return <p className="p-6 text-slate-500">Loading…</p>;

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-semibold text-navy">Supplier Pack</h1>
      {error && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <div className="mb-6 rounded-lg border border-navy bg-slate-50 p-4">
        <h2 className="mb-2 text-lg font-medium text-navy">Generate Supplier Pack</h2>
        <p className="mb-4 text-sm text-slate-600">
          Produces a ZIP containing a dated cover sheet (company profile, certification status, clearance
          headcounts) plus copies of your certificates and policies — ready to send to a prime contractor.
        </p>
        <button onClick={handleGenerate} disabled={generating}
          className="rounded bg-navy px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
          {generating ? "Generating…" : "Generate Supplier Pack"}
        </button>
      </div>

      <h2 className="mb-3 text-lg font-medium text-navy">Company Profile</h2>
      <form onSubmit={handleSave} className="rounded-lg border border-slate-200 p-4">
        <fieldset disabled={!canWrite} className="contents">
          <div className="mb-3">
            <label htmlFor="profile-name" className="mb-1 block text-sm text-slate-600">Company name</label>
            <input id="profile-name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              required className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3">
            <label htmlFor="profile-address" className="mb-1 block text-sm text-slate-600">Address</label>
            <input id="profile-address" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3">
            <label htmlFor="profile-capability" className="mb-1 block text-sm text-slate-600">Capability statement</label>
            <textarea id="profile-capability" rows={4} value={profile.capability_statement}
              onChange={(e) => setProfile({ ...profile, capability_statement: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2" />
          </div>
          <div className="mb-3 flex gap-3">
            <div className="flex-1">
              <label htmlFor="profile-contact-name" className="mb-1 block text-sm text-slate-600">Contact name</label>
              <input id="profile-contact-name" value={profile.contact_name}
                onChange={(e) => setProfile({ ...profile, contact_name: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2" />
            </div>
            <div className="flex-1">
              <label htmlFor="profile-contact-email" className="mb-1 block text-sm text-slate-600">Contact email</label>
              <input id="profile-contact-email" type="email" value={profile.contact_email}
                onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
                className="w-full rounded border border-slate-300 px-3 py-2" />
            </div>
          </div>
        </fieldset>
        {canWrite && (
          <button type="submit" disabled={saving}
            className="rounded bg-navy px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50">
            {saving ? "Saving…" : "Save profile"}
          </button>
        )}
        {savedMsg && <span className="ml-3 text-sm text-green-700">Saved.</span>}
      </form>
    </div>
  );
}
