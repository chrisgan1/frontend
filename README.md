# Muster (vertical-slice MVP)

A document-in/document-out compliance platform for UK defence and
aerospace SMEs: upload your evidence once, and answer a prime's supplier
assurance questionnaire against a structured, human-verified **Fact
Base** instead of retyping the same answers into a different spreadsheet
every time.

This is the vertical-slice build from the "Muster" product spec — one
questionnaire format (`.xlsx`) end to end: ingest, extraction, parsing,
answer engine, triage board, gap register, template-preserving export,
attestation. It supersedes the earlier "Compliance Passport" build in
this repo (passport Q&A + text-matching), which this replaces rather
than sits alongside.

## The core loop

1. **Upload evidence documents** to the vault (certs, policies,
   insurance schedules). Each one is run through Gemini vision/text
   extraction against a canonical Fact schema (~27 facts across 5
   domains in this slice: Corporate identity, Insurance, Quality, Cyber,
   Personnel counts) — see `server/src/services/factExtraction.ts` and
   `server/src/services/canonicalFacts.ts`.
2. **Review the Fact Base.** Every extracted fact starts `unverified`,
   with the source document, page reference, and verbatim snippet shown
   alongside it. A human confirms or corrects each one before it counts
   — this is the step that makes a later attestation legally meaningful.
   If two documents disagree on an already-verified fact, it's flagged
   as a **conflict** and blocked from producing a green answer until a
   human resolves it.
3. **Upload a questionnaire** (`.xlsx`). The parser auto-detects the
   question/response columns per sheet via header-row keyword matching
   (`server/src/services/questionnaireParser.ts`); a sheet it can't
   confidently map returns `needsMapping` rather than guessing.
4. **Run the Answer Engine.** Per question, in order: match against the
   org's reusable Answer Library (deterministic word-overlap scoring,
   reusing `server/src/utils/match.ts`) → draft a fact-grounded answer
   via Gemini, citing which facts it used → abstain if nothing supports
   an answer. Abstention beats hallucination: a question with no
   supporting evidence goes **red** and lands in the Gap Register rather
   than getting a plausible-sounding guess.
5. **Work the Triage Board.** Every question is red / amber / green.
   Green still requires an explicit accept (individually or
   bulk-accepted) before it counts as a real answer — nothing an AI
   drafted reaches an export or attestation unconfirmed, however
   confident the engine was. Editing AI-suggested text is logged as a
   human override.
6. **Export.** Fills confirmed answers back into a copy of the prime's
   own uploaded workbook (not a bespoke format) and bundles it with the
   evidence documents behind every cited fact into a ZIP.
7. **Attest.** An Approver (or Owner) signs off, capturing an immutable
   snapshot of every answer and its evidence at that moment. Attesting
   is blocked while any drafted answer is still unconfirmed, and the
   questionnaire locks against further edits once attested.

## What's here vs. what's deferred

Built in this slice: multi-tenant organisations from day one (every
table is `organisation_id`-scoped, even though this build only exercises
one org per account), fact extraction with conflict detection, real
`.xlsx` parsing and template-preserving fill-back, a layered answer
engine, the triage board, a lightweight gap register, attestation with
an immutable snapshot, and an answer library that captures every
human-confirmed answer for reuse on the next questionnaire.

Deliberately not built in this pass (see the plan history for the full
reasoning): Word/PDF/portal-paste questionnaire ingest (`.xlsx` only),
email-in and cloud-folder document ingestion (drag-drop only),
contributor passwordless single-purpose links (contributors are regular
accounts with restricted permissions for now), the full 120–150-fact
canonical schema (this slice wires 5 of 12 domains), automated gap
remedies — policy generation for type-b gaps, cost estimation for
type-c — (the register exists, those actions are manual notes),
semantic/embedding retrieval (keyword + LLM-reasoning over a small
per-org fact/library set, no vector store), framework-change monitoring,
cross-tenant answer-library learning, and billing/admin.

Also cut from the earlier Compliance Passport build and not brought
forward: the standalone Certifications and Clearance Tracker /
project-matching pages. Certification and personnel-clearance data now
live as aggregate Facts (domains C/D and F) rather than dedicated
tracking UI — the Muster spec explicitly excludes personnel clearance
*case management* from v1.

## Stack

- Client: React + TypeScript + Vite + Tailwind
- Server: Node.js + TypeScript + Express + PostgreSQL (plain SQL
  migrations in `server/migrations/`, no ORM)
- Questionnaire parsing/fill-back: `exceljs` (not the `xlsx`/SheetJS npm
  package — its registry release has known unpatched prototype-pollution
  and ReDoS CVEs, not something to run against untrusted uploaded files)
- AI (extraction + answer drafting): `@google/genai` (Gemini Developer
  API, free tier), model `gemini-flash-latest`, structured JSON output.
  Both features share one hardened client
  (`server/src/services/gemini.ts`) — retries transient 429/503s once,
  enforces a request timeout, and converts every failure mode observed
  during live testing (bad-key `ApiError`s at any status, timeout
  `AbortError`s, and a plain `fetch failed` from undici's own internal
  timeout racing the SDK's) into one clean error type rather than a raw
  crash.
- Matching (answer library reuse): deterministic Jaccard word-overlap
  scoring, not an LLM call
- Export: `archiver` for the ZIP
- Auth: JWT + bcrypt, organisation-scoped RBAC (Owner, Editor,
  Contributor, Approver, Read-only). **Not production-grade** — no
  SSO/MFA, which the spec itself flags as required before real
  MOD-supplier use.

## Setup

Requires Node 18+ and PostgreSQL.

```bash
createdb mod_compliance
npm install
cp server/.env.example server/.env   # edit DATABASE_URL/JWT_SECRET/GEMINI_API_KEY
npm run migrate
npm run seed    # fictional demo org, verified facts, a sample questionnaire
npm run dev      # server on :3001, client on :5173 (proxies /api)
```

The seed script creates a fictional organisation ("Acme Defence
Engineering Ltd") with five demo users (one per role, all
`password123`), evidence documents, a curated set of verified facts
(guaranteed to populate even without a live `GEMINI_API_KEY` — real
extraction also runs best-effort on top if a key is configured), and a
generated sample `.xlsx` questionnaire already uploaded and parsed. All
fictional placeholder data, not a real company or real personnel
records.

Registering from the login screen with no existing account creates a
**new organisation** and makes you its Owner. Inviting a teammate into
your own organisation is `POST /api/auth/register` with your Owner
bearer token (not built into the UI in this pass).

Run the backend test suite (spins up a throwaway `mod_compliance_test`
database and re-applies migrations against it):

```bash
createdb mod_compliance_test
npm test
```

**AI features need `GEMINI_API_KEY` set** in `server/.env` to actually
call the model — get one free, no payment method required, at
https://aistudio.google.com/apikey. Without a key, extraction and the
answer engine fail cleanly (covered by tests) rather than crashing —
uploads and questionnaire parsing still work, they just won't populate
facts or draft answers automatically.

## What's deliberately not built

Beyond the per-module deferrals above: continuous control monitoring
and technical integrations (no telemetry to monitor by design — SMEs in
this space run a server in a cupboard, not a cloud stack with APIs to
pull from), automatic submission into prime portals or the Defence
Sourcing Portal, bid/tender writing, export control classification
advice (facts only — ITAR/OGEL/dual-use determinations carry liability
this build doesn't take on), sub-tier supplier assurance (a strong v2,
per the spec), risk registers, incident management, regulatory change
alerts beyond a manually curated feed, chain-of-custody, air-gapped
hosting, and SSO/SAML/mobile.
