# AgroTrack — Production & Migration Guide

## 1. Migration from pre-0.2.0

### Database

- **Runtime:** Firestore only. Prisma/SQLite is **not** used by the app anymore.
- Existing `users` documents keyed by email remain valid.
- Update user `role` to lowercase: `farmer`, `admin`, or `buyer` (not `Farmer`).
- Reports previously saved as `userId: 'public_user'` will **not** appear in the dashboard until re-saved under the signed-in owner.

### Deploy Firestore

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### Auth bridge

After login, the client calls `POST /api/auth/firebase-token` and signs into Firebase with a custom token. Requires **Firebase Admin service account** in `FIREBASE_ADMIN_CREDENTIALS`.

### Environment

Copy examples:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Populate `NEXT_PUBLIC_FIREBASE_*` in **both** files (or frontend only if using next.config backend load).

---

## 2. Deployment (Vercel / Node host)

1. Set root directory to `frontend` **or** run `npm run build` from repo root (builds frontend).
2. Add all env vars from `backend/.env.example`.
3. Set `FIREBASE_ADMIN_CREDENTIALS` as single-line JSON.
4. Add Upstash for production AI rate limits.
5. Configure Google OAuth redirect: `https://<domain>/api/auth/callback/google`

---

## 3. Testing instructions

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run dev
# E2E (dev server running):
npm run test:e2e
```

Manual checklist:

- [ ] Register / login
- [ ] Dashboard shows only your reports
- [ ] Climate risk returns forecast (needs `GEMINI_API_KEY`)
- [ ] Plant Doctor: upload leaf photo — CNN if weights installed, else Gemini (see §9)
- [ ] Each AI result page shows **Why this result?** explainability panel
- [ ] `/climate-map` renders map
- [ ] Create farm passport + export PDF
- [ ] Complete `/onboarding`
- [ ] Irrigation shows simulator or Firestore sensor

---

## 4. Production checklist

- [ ] Strong `NEXTAUTH_SECRET`
- [ ] Firestore rules deployed
- [ ] Indexes deployed
- [ ] Admin credentials for Firebase
- [ ] Upstash Redis for rate limits
- [ ] Sentry DSN (optional)
- [ ] Remove fallback Firebase keys from `config.ts` if using strict env-only policy
- [ ] Enable HTTPS only
- [ ] Review CSP for your CDN domains

---

## 5. Security checklist

- [ ] No secrets in git
- [ ] `auth_users` denied in rules
- [ ] Owner-scoped reports/passports
- [ ] Middleware on all tool routes
- [ ] Custom token claims include `email` + `role`
- [ ] Rate limits on AI endpoints

---

## 6. Performance checklist

- [ ] Open-Meteo cache (`weatherCache` collection)
- [ ] In-memory AI cache (30 min TTL per instance)
- [ ] Firestore composite indexes for reports query
- [ ] Leaflet loaded client-only (dynamic import)

---

## 7. Added dependencies (0.2.0)

| Package | Purpose |
|---------|---------|
| `@upstash/ratelimit`, `@upstash/redis` | AI rate limiting |
| `leaflet`, `react-leaflet`, `@types/leaflet` | Climate map |
| `@react-pdf/renderer` | Passport PDF |
| `@sentry/nextjs` | Monitoring (wire-up pending) |
| `vitest` | Unit tests |
| `@playwright/test` | E2E tests |
| `eslint`, `eslint-config-next` | Lint in CI |

**Removed from runtime:** `@prisma/client`, `better-sqlite3`, `@prisma/adapter-better-sqlite3` (still in lockfile via dev `prisma` CLI only if needed)

---

## 8. File tree (major additions)

```
backend/src/lib/db/          users, reports, passport, farmProfile, weather, marketplace
backend/src/services/weather/ weatherService, weatherTypes, genkitTool
backend/src/types/auth.ts
backend/src/lib/rateLimit.ts
backend/src/lib/aiResponseCache.ts
frontend/src/middleware.ts
frontend/src/components/FirebaseAuthBridge.tsx
frontend/src/components/maps/ClimateRiskMap.tsx
frontend/src/hooks/useRealtimeSensor.ts
frontend/src/app/onboarding/
frontend/src/app/farm-passport/
frontend/src/app/climate-map/
.github/workflows/ci.yml
firestore.rules
firestore.indexes.json
tests/unit/
tests/e2e/
```

---

## 9. Plant Doctor (CNN + Gemini) & AI explainability

### Local CNN (primary)

Weights are **not** in git. Follow `backend/ml/plant_disease/README.md`:

1. `pip install torch torchvision pillow pandas numpy`
2. Download `plant_disease_model_1_latest.pt` from the [Plant Village Drive folder](https://drive.google.com/drive/folders/1ewJWAiduGuld_9oGSrTuLumg9y62qS6A?usp=share_link)
3. Place at `backend/ml/plant_disease/plant_disease_model_1_latest.pt` or set `PLANT_DISEASE_MODEL_PATH`

Env (see `backend/.env.example`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `PLANT_DISEASE_PYTHON` | `python` | Interpreter for `predict.py` |
| `PLANT_DISEASE_MIN_CONFIDENCE` | `55` | Min softmax % to trust CNN without Gemini |
| `PLANT_DISEASE_ML_DIR` | auto | Override ML bundle path |

Flow: `backend/src/ai/flows/diagnose-plant.ts` runs CNN first; Gemini refines when confidence is low or the image is classified as background.

The original `Plant_Disease_Detection/` Flask UI is **not** used — you may delete that folder after confirming the `.pt` file works.

### Explainability (all AI features)

Every Genkit flow returns an `explainability` block (`backend/src/ai/schemas/explainability.ts`). The UI shows it via `ExplainabilityPanel` on Plant Doctor, Climate Risk, Soil Analysis, Profit Planner, and Marketplace results.

Sources: `local_cnn`, `open_meteo`, `gemini`, `hybrid`, `rules`.
