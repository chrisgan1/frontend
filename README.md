# MOD Compliance Platform (MVP)

A GRC (governance, risk, assurance) tool for demonstrating compliance
against MOD supplier security standards. This is a **core skeleton**, not
the full platform described in the original capability spec — see
[Roadmap](#roadmap--phase-2) below for what's deliberately out of scope.

## What's here

- **Control library** seeded with a representative set of controls inspired
  by **DEFSTAN 05-138** (Cyber Security for Defence Suppliers), grouped by
  category and risk-based profile level (very low / low / moderate / high).
  This is **not** a verbatim reproduction of the official standard — swap
  `server/src/seed/defstan-05-138.ts` for the licensed control text before
  any real use.
- **Evidence management** — upload artefacts and map them to one or more
  controls, with basic versioning and expiry tracking.
- **Policy lifecycle** — draft, version, approve, and attest to policies.
- **Compliance posture dashboard** — % of controls with evidence, overdue
  attestations, overdue policy renewals, breakdown by category.
- **RBAC** — Admin, Compliance Manager, Contributor, Auditor (read-only).
- **Audit trail** — every control/evidence/policy mutation is logged and
  visible on the relevant control/policy detail page.

## Stack

- Client: React + TypeScript + Vite + Tailwind
- Server: Node.js + TypeScript + Express + PostgreSQL (`pg`, no ORM —
  plain SQL migrations in `server/migrations/`)
- Auth: JWT + bcrypt. **Not production-grade** — see Roadmap.

## Setup

Requires Node 18+ and a running PostgreSQL instance.

```bash
createdb mod_compliance
npm run install:all   # or: npm install
cp server/.env.example server/.env   # edit DATABASE_URL/JWT_SECRET
npm run migrate
npm run seed           # loads the DEFSTAN 05-138 control set
npm run dev             # server on :3001, client on :5173 (proxies /api)
```

Register the first account from the login screen — it automatically
becomes `admin`. Every subsequent account must be created by an admin via
`POST /api/auth/register` with an admin bearer token.

Run the backend test suite (spins up a throwaway `mod_compliance_test`
database and re-applies migrations against it):

```bash
createdb mod_compliance_test
npm test
```

## Roadmap / Phase 2+

Deliberately **not** built in this pass — these were in the original
capability spec but are each substantial workstreams of their own:

- Supplier assurance scoring and monitoring
- Risk register / threat modelling, and incident response linkage
- Continuous automated control monitoring
- Regulatory change monitoring/alerts
- Export control (ITAR/EAR) tracking
- Chain-of-custody tracking
- Air-gapped / sovereign deployment packaging
- Training tracking beyond policy attestation
- SIEM / HR / procurement / ticketing integrations
- SSO/MFA (Entra ID or PKI-based) — current auth is email/password + JWT,
  fine for a demo, not for real MOD-supplier use
- Personnel security: SC/DV clearance tracking, List X site management
- Evidence storage hardening: the current storage adapter writes to local
  disk (`server/uploads`); production use needs immutable/WORM object
  storage (S3/Azure Blob with object lock)
