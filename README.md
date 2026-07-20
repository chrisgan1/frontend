# Defence Compliance Evidence Hub (V1 MVP)

A pain-focused MVP for defence SMEs: stop digging through SharePoint every
time a prime asks "do you have Cyber Essentials Plus, insurance, and
BPSS-cleared staff?" This is deliberately narrow — a validation vehicle to
show ~20 defence SMEs and see whether "would this save you time every
week?" gets a "can I start using this next month?" response, not a full
GRC platform.

## What's here

- **Document vault** — upload certs/policies/insurance/evidence, tag each
  with a category (Security, Quality, Insurance, People, Export Control).
- **Certification tracking** — named certs (Cyber Essentials Plus, ISO
  27001, insurance, etc.) with valid-until dates and a computed status:
  valid / expiring soon (≤45 days) / expired.
- **Security clearance tracker** — employees with BPSS/SC/DV status and
  expiry, plus **project matching**: pick a project and its required
  clearance level, instantly see who's eligible (and not expired).
- **Supplier pack generator** — one click produces a ZIP with a dated
  cover-sheet PDF (company profile, certification summary, clearance
  headcounts — not individual names) plus copies of the underlying
  certificate/policy documents, ready to send to a prime.
- **Dashboard** — certification status tiles, BPSS/SC/DV headcounts,
  supplier packs generated counter.
- **RBAC** — Admin, Compliance Manager, Contributor, Auditor (read-only).
- **Audit trail** — logged server-side for every mutation (not currently
  surfaced in the UI — this build keeps the UI to just the four features
  above, per the "MVP not platform" brief).

## Stack

- Client: React + TypeScript + Vite + Tailwind
- Server: Node.js + TypeScript + Express + PostgreSQL (plain SQL
  migrations in `server/migrations/`, no ORM)
- Supplier pack: `pdfkit` for the cover sheet, `archiver` for the ZIP
- Auth: JWT + bcrypt. **Not production-grade** — fine for a demo, would
  need SSO/MFA for real MOD-supplier use.

## Setup

Requires Node 18+ and PostgreSQL.

```bash
createdb mod_compliance
npm install
cp server/.env.example server/.env   # edit DATABASE_URL/JWT_SECRET
npm run migrate
npm run seed    # loads a fictional demo company ("Acme Defence Engineering Ltd")
npm run dev      # server on :3001, client on :5173 (proxies /api)
```

The seed script prints a login (`demo.admin@acmedefence.example` /
`password123`) with a fictional company, certifications (including one
expiring in ~45 days, to show the warning state), employees across every
clearance level, and two demo projects — enough to run a full walkthrough
without manual data entry. All of it is fictional placeholder data, not a
real company or real personnel records.

Register your own account from the login screen — the first account
becomes `admin` automatically; further accounts must be created by an
admin via `POST /api/auth/register` with an admin bearer token.

Run the backend test suite (spins up a throwaway `mod_compliance_test`
database and re-applies migrations against it):

```bash
createdb mod_compliance_test
npm test
```

## What's deliberately not built

This is the sharp end of the wedge, not the platform. Cut from an earlier,
broader GRC-platform pass and not brought forward here: framework/control
libraries (DEFSTAN-style control mapping), formal policy version/approval
lifecycles, supplier assurance scoring, risk registers, incident
management, continuous control monitoring, regulatory change alerts,
export control (ITAR/EAR) tracking, chain-of-custody, air-gapped hosting,
SIEM/HR/procurement integrations, and email expiry reminders (the
dashboard's status badges cover the same signal for now; real reminders
need SMTP/domain setup that doesn't serve a demo).
