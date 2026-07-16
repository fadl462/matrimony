# Kindred — Matrimony Platform Prototype

A working full-stack prototype: React frontend, Express/Sequelize API, and a
weighted matching engine with A/B-testable variants and simple online
learning from user feedback.

This is a **prototype**, not a launch-ready system — see [What's production-
ready vs. stubbed](#whats-production-ready-vs-stubbed) before you scope real
work off it. Everything below has been run and verified end-to-end in this
environment (see [What was actually tested](#what-was-actually-tested)).

---

## Architecture

```
matrimony-platform/
├── backend/            Express API, Sequelize ORM, matching engine
│   ├── src/
│   │   ├── models/      Sequelize model definitions + associations
│   │   ├── routes/       auth, users, search, match, messages, video, admin
│   │   ├── services/     matching engine, SMS abstraction, OAuth verification
│   │   ├── middleware/  JWT auth, role-based access, validation, errors
│   │   └── db/           connection + seed script
│   └── Dockerfile
├── frontend/            React 18 + Vite + Tailwind, single-page app
│   ├── src/
│   │   ├── pages/        Landing, Signup, Login, Profile, Search, Matches,
│   │   │                 Messages, Admin
│   │   ├── components/  NavBar, MatchScoreRing (signature visualization),
│   │   │                 ProtectedRoute
│   │   ├── context/      Auth state
│   │   └── api/          Typed-ish fetch client
│   └── Dockerfile + nginx.conf
└── docker-compose.yml    Postgres + backend + frontend, one command
```

**Why Sequelize instead of Prisma:** an earlier pass used Prisma, but
Prisma's CLI (`generate`/`migrate`) needs to download a Rust query-engine
binary from `binaries.prisma.sh` at install time. The sandbox this was built
in blocks that domain, so Prisma could not be verified running here at all.
Sequelize has no such external dependency — everything below was actually
executed, not just written. Functionally the two are comparable for this
schema; Sequelize's raw SQL/migration story is arguably more transparent for
a handover anyway.

---

## Quick start (local, SQLite, zero external services)

```bash
# Backend
cd backend
cp .env.example .env          # generates working defaults; SQLite needs no DB setup
npm install
npm run seed                  # creates demo members + an admin account
npm run dev                   # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173, proxies /api to :4000
```

Demo logins (created by `npm run seed`):
- Member: `ama@example.com` / `Password123!` (also `kwame@`, `efua@`, `priya@`, `rahul@` — same password)
- Admin: `admin@matrimony.local` / `AdminPass123!`

## Quick start (Docker, Postgres)

```bash
cp .env.example .env   # at repo root; fill JWT_SECRET, POSTGRES_PASSWORD
docker compose up --build
# frontend: http://localhost:8080
# backend:  http://localhost:4000
```

Note: the Docker path uses Postgres and starts with an **empty** database —
run `docker compose exec backend npm run seed` once containers are up if you
want demo data.

---

## The matching engine (the "standout" feature)

`backend/src/services/matching.js` computes a 0–100 score across five
weighted dimensions: interests overlap (Jaccard similarity), location
proximity (Haversine distance), horoscope compatibility (a simplified
heuristic — see caveat below), education affinity, and lifestyle
(religion/language) fit.

- **Tunable weighting:** each member has per-dimension weights
  (`Preference.weightInterests`, etc.), editable directly in Profile →
  Preferences, or left at platform defaults.
- **Online learning:** every like/pass calls `adjustWeightsFromFeedback()`,
  which nudges weights toward whichever dimensions scored above-average on
  liked profiles (and below-average on passed ones). It's a small, bounded
  per-swipe adjustment — genuinely adaptive, but it's a heuristic rule, not
  a trained model. Framing it as more than that would be overselling it.
- **A/B testing hooks:** `DEFAULT_VARIANTS` defines named weight presets;
  new members are deterministically bucketed into one by a hash of their
  user ID. Every computed match row stores which variant produced it, and
  `/admin` → A/B tests shows mutual-match rate per variant — the actual
  metric you'd use to decide a winner.
- **Horoscope caveat:** the compatibility score uses declared moon sign +
  manglik status as a stand-in for real Ashtakoot/guna-milan matching, which
  needs a proper panchang engine and is out of scope here. The UI doesn't
  claim more than it does.

---

## What's production-ready vs. stubbed

| Area | This prototype | To go live |
|---|---|---|
| Email/password auth | Fully working (bcrypt, JWT, rate-limited) | Ready as-is |
| Phone OTP | Fully working; SMS delivery mocked (code goes to server log) | Add Twilio credentials in `services/sms.js` — call site doesn't change |
| Social OAuth | Flow fully wired; token verification mocked (no real Google/Facebook app exists in this environment) | Add `google-auth-library` / Graph API `debug_token` check in `services/oauth.js` — flagged clearly in that file |
| Video upload/streaming | Upload, storage, range-request streaming, and a moderation queue all work | Swap local disk for S3, add a real transcode queue (MediaConvert/ffmpeg) for compression, add automated moderation (Rekognition or similar) before "ready" |
| Matching engine | Fully working, see above | Consider a background job to maintain match scores incrementally at scale, rather than recomputing per search |
| Search | Fully working, filters + weighted ranking | At scale, push distance filtering into Postgres via PostGIS instead of in-app Haversine |
| Admin dashboard | Fully working: analytics, A/B test view, user suspend/verify, report queue, video moderation | — |
| Database | SQLite locally, Postgres via Docker Compose — same Sequelize code either way | Add versioned migrations (`sequelize-cli`) instead of `sequelize.sync()`, which is dev-only |
| Deployment | Dockerfiles + Compose provided | Point `DATABASE_URL` at a managed Postgres (RDS/Supabase/Neon), deploy backend behind a real load balancer, frontend to a CDN (Vercel/Netlify/CloudFront) |

---

## What was actually tested

Every one of these was executed against the running server in this
environment, not just written:

- All three signup paths (email/password, mocked OAuth, phone OTP) →
  account creation, JWT issuance
- Search with city/age/interest filters → weighted, scored, sorted results
- Like → pass → mutual match detection → messaging unlocked only after
  mutual like, blocked before
- Video upload → simulated async processing → status polling → range-request
  streaming (`Range: bytes=...` → `206 Partial Content`)
- Admin analytics overview, A/B test breakdown, user suspend/verify, RBAC
  (member hitting `/admin/*` → `403`; no token → `401`)
- Frontend build (`npm run build`) completes cleanly; `npm audit` clean on
  the backend, one dev-server-only advisory on the frontend (esbuild/Vite,
  doesn't affect the production build)
- Full page screenshots (desktop + mobile) of landing, search, profile, and
  admin pages to confirm the responsive layout actually renders correctly

## What wasn't tested here (and why)

- A live independent security audit — not something to self-certify;
  `npm audit` is clean but that's necessary, not sufficient
- Load/performance testing against "industry benchmark" page-load numbers —
  meaningless without real infrastructure and traffic to test against
- Real OAuth/Twilio/S3 integrations — need credentials this environment
  doesn't have; the integration points are built and clearly marked

---

## Environment variables

See `backend/.env.example` for the full list with comments. The important
ones to change before any real deployment: `JWT_SECRET` (generate with
`openssl rand -hex 32`), `DATABASE_URL`/`DB_DIALECT` (Postgres in
production), and anything under the OAuth/SMS/video-storage sections once
you have real provider credentials.
