# Compliance Passport (V1 MVP)

A pain-focused MVP for defence SMEs, built around a specific bet: the
expensive part of supplier assurance isn't finding your certificates —
it's re-answering the same questions in a different shape for every prime.
So instead of a generic "export our documents" button, this centres on a
**reusable Q&A passport** applied to each **incoming request** via text
matching, so you're confirming pre-written answers instead of retyping
them.

## Why this shape, not a static export

An earlier pass of this MVP had a one-click "supplier pack" that zipped up
your certs and a capability statement. That's thin — most SMEs already
have a folder of PDFs somewhere, so it doesn't solve much. The actual
expensive step is that BAE, Leonardo, Thales, and DE&S all ask for the
same underlying information in their own portal/spreadsheet format, and
answering each one from scratch is where the hours go. This build tests
whether "answer once, reuse everywhere" is the real value, not "store
your files for you."

## What's here

- **Compliance Passport** — a structured Q&A library (topic, question,
  answer, linked evidence), answered once, organised by topic (Security,
  Quality, Insurance, People, Export Control, Data Protection, Modern
  Slavery, Financial).
- **Requests** — when a prime sends an assurance ask, paste their
  questions in (however they're phrased) and the system suggests a
  passport match for each one using text-similarity scoring — no external
  API, a transparent word-overlap algorithm (`server/src/utils/match.ts`).
  Accept the suggestion, edit it, or write a one-off answer for anything
  with no good match.
- **Export** — a per-request ZIP: a formatted Q&A response PDF (dated,
  scoped to that requester) plus the actual evidence files cited by the
  confirmed answers.
- **Document vault** — upload certs/policies/insurance/evidence, tagged
  by category, used as the evidence layer behind passport answers.
- **Certification tracking** — named certs with valid-until dates and a
  computed status: valid / expiring soon (≤45 days) / expired.
- **Security clearance tracker** — employees with BPSS/SC/DV status and
  expiry, plus **project matching**: pick a project and its required
  clearance level, instantly see who's eligible and not expired. Still
  the sharpest single feature in the build — it's the one thing here that
  isn't "faster access to something you already have."
- **Dashboard** — cert status tiles, clearance headcounts, passport
  answer count, open/submitted request counts.
- **RBAC** — Admin, Compliance Manager, Contributor, Auditor (read-only).

## Stack

- Client: React + TypeScript + Vite + Tailwind
- Server: Node.js + TypeScript + Express + PostgreSQL (plain SQL
  migrations in `server/migrations/`, no ORM)
- Matching: deterministic Jaccard word-overlap scoring, not an LLM call —
  transparent and free to run
- Export: `pdfkit` for the response PDF, `archiver` for the ZIP
- Auth: JWT + bcrypt. **Not production-grade** — fine for a demo, would
  need SSO/MFA for real MOD-supplier use.

## Setup

Requires Node 18+ and PostgreSQL.

```bash
createdb mod_compliance
npm install
cp server/.env.example server/.env   # edit DATABASE_URL/JWT_SECRET
npm run migrate
npm run seed    # fictional demo company + starter passport + a demo request
npm run dev      # server on :3001, client on :5173 (proxies /api)
```

The seed script prints a login (`demo.admin@acmedefence.example` /
`password123`) for a fictional company ("Acme Defence Engineering Ltd")
with: 11 starter passport answers across every topic, certifications
(including one expiring in ~45 days), employees across every clearance
level, two demo projects, and one incoming request from a fictional prime
("Northbridge Systems Ltd") with real, differently-worded questions
already run through the matcher — open it to see suggested/unmatched
items ready to confirm. All fictional placeholder data, not a real
company or real personnel records.

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

Cut from earlier, broader passes and not brought forward: framework/
control libraries (DEFSTAN-style control mapping), formal policy version/
approval lifecycles, the generic static supplier-pack export (superseded
by per-request passport matching), automatic parsing of uploaded
questionnaire files (currently paste-only — no Excel/PDF ingestion),
supplier assurance scoring of *your own* suppliers, risk registers,
incident management, continuous control monitoring, regulatory change
alerts, chain-of-custody, air-gapped hosting, SIEM/HR/procurement
integrations, and email expiry reminders (dashboard badges cover the same
signal for now).
