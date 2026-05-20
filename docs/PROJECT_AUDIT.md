# AgroTrack — Production Readiness Audit

**Audit date:** May 20, 2026  
**Version:** 0.2.0 (pilot-ready)  
**Status:** Build ✅ | Typecheck ✅ | Unit tests ✅ | ESLint warnings (legacy cleanup backlog)

---

## 1. Executive summary

AgroTrack has been upgraded from a demo prototype toward a **secure, Firestore-first pilot platform** while preserving all existing AI flows, routes, and UI patterns.

| Area | Before | After |
|------|--------|-------|
| Data store | Firestore + unused Prisma | **Firestore only** (Prisma archived under `backend/prisma/`) |
| Auth | Open routes, weak rules | **Middleware + JWT roles + Firebase custom token bridge** |
| Climate AI | Prompt-only | **Open-Meteo → cached → Gemini** |
| Irrigation | Static arrays | **Firestore `sensorData` + 5s simulator fallback** |
| Farm passport | Missing | **`/farm-passport` + PDF export** |
| Risk map | Missing | **`/climate-map` (Leaflet)** |
| Rate limits | None | **Upstash** (optional; skipped if unset) |
| CI | None | **GitHub Actions** (lint, typecheck, test, build) |

---

## 2. Architecture (current)

```
AgroTrack/
├── frontend/                 # Next.js 15 App Router
│   ├── src/middleware.ts     # Route protection + buyer role limits
│   ├── src/app/api/          # NextAuth, register, firebase-token
│   ├── src/components/maps/  # Leaflet climate map
│   ├── src/hooks/            # useRealtimeSensor
│   └── src/lib/reports.ts    # Owner-scoped client reports
│
├── backend/
│   ├── src/lib/db/           # Firestore services (users, reports, passport, …)
│   ├── src/services/weather/ # Open-Meteo + Genkit tool
│   ├── src/lib/actions.ts    # Server actions + rate limit + cache
│   ├── src/ai/flows/         # All Genkit flows (preserved)
│   └── prisma/               # Legacy SQLite (not used at runtime)
│
├── firestore.rules           # Production rules
├── firestore.indexes.json    # Composite indexes
└── .github/workflows/ci.yml
```

---

## 3. Feature matrix

| Feature | Route | Status |
|---------|-------|--------|
| Climate risk (AI + weather) | `/climate-risk` | ✅ Open-Meteo integrated |
| Climate map | `/climate-map` | ✅ Leaflet layers |
| Soil analysis | `/soil-analysis` | ✅ + owner reports |
| Plant doctor | `/plant-doctor` | ✅ rate limited |
| Marketplace | `/marketplace` | ✅ cached AI |
| Profit planner | `/profit-planner` | ✅ |
| Irrigation (live/sim) | `/irrigation` | ✅ sensor hook |
| Farm passport | `/farm-passport` | ✅ UUID + timeline + PDF |
| Onboarding | `/onboarding` | ✅ `farmProfiles` |
| Dashboard | `/dashboard` | ✅ scoped reports |
| Auth | `/auth` | ✅ Google + credentials |

**Still pilot / mock:** crop-management data, equipment catalog, govt-schemes upload simulation.

---

## 4. Firestore collections

| Collection | Purpose | Access |
|------------|---------|--------|
| `users` | Profile + role (`farmer` \| `admin` \| `buyer`) | Owner / admin |
| `auth_users` | Password hashes | Server only |
| `reports` | Saved AI reports | Owner |
| `farmProfiles` | Onboarding | Owner |
| `farmPassports` | Digital passport | Owner |
| `sensorData` | IoT readings | Authenticated read |
| `weatherCache` | Open-Meteo cache | Server write |
| `marketplaceListings` | Future deals | Owner create |

---

## 5. Security

### Implemented

- `middleware.ts` protects all tool routes; redirects to `/auth`
- Buyer role limited to dashboard, marketplace, onboarding
- Production `firestore.rules` (owner email + admin)
- Firebase custom token bridge (`/api/auth/firebase-token`) for client SDK
- Security headers + CSP in `next.config.ts`
- Server actions require session
- AI rate limits when Upstash configured

### Required before public launch

1. Set **`FIREBASE_ADMIN_CREDENTIALS`** (service account JSON) — custom tokens fail without it
2. Deploy **`firestore.rules`** and **`firestore.indexes.json`**
3. Rotate **`NEXTAUTH_SECRET`** and API keys if ever exposed
4. Tighten CSP (`unsafe-inline` / `unsafe-eval` are pilot concessions)
5. Complete ESLint `any` cleanup in Firebase hooks (warnings today)

---

## 6. Environment variables

See `backend/.env.example` and `frontend/.env.example`.

**Critical:**

- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GEMINI_API_KEY` or `GOOGLE_GENAI_API_KEY`
- `NEXT_PUBLIC_FIREBASE_*` (six keys)
- `FIREBASE_ADMIN_CREDENTIALS` (production)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google sign-in)

**Optional:**

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`

**Removed / unused:** `SUPABASE_*`, runtime `DATABASE_URL` / Prisma

---

## 7. Commands

```bash
npm run dev          # http://localhost:9002
npm run build
npm run typecheck
npm run lint
npm run test         # Vitest
npm run test:e2e     # Playwright
npm run genkit:dev
```

Legacy Prisma (optional): `npm run db:legacy:migrate`

---

## 8. Testing & CI

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Vitest | `firebaseUid`, expand toward 80% |
| E2E | Playwright | Auth redirect smoke tests |
| CI | GitHub Actions | install → lint → typecheck → test → build |

**Coverage target 80%:** foundation in place; add tests per flow in next sprint.

---

## 9. Remaining backlog (post-pilot)

1. Sentry wiring (`@sentry/nextjs` installed — add `sentry.client.config.ts` / `instrumentation.ts`)
2. Full PWA service worker (`next-pwa` deferred — `manifest.json` added)
3. PDF for soil/climate/dashboard (passport PDF done)
4. Migrate remaining ESLint errors in legacy Firebase files
5. Blockchain anchoring for passports (currently Firestore UUID)
6. Official hazard layers on map (government APIs)
7. IoT device ingestion API for `sensorData`

---

## 10. Conclusion

AgroTrack is **pilot-deployable** with Firestore as the single runtime database, protected routes, real weather-backed climate forecasts, and new passport/map/onboarding capabilities. Prisma remains only for optional legacy migration. Follow `docs/PRODUCTION_GUIDE.md` for deploy steps.
