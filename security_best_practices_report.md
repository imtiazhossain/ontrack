# onTrack Security Audit (post N1–N5 fixes)

_Date: 2026-07-30 · Scope: Expo Router (client + `*+api.ts`), Supabase (RLS/RPC/migrations/Auth config), edge `nutrition-api`_

## Executive summary

Prior Critical/High remediations (F1–F17) remain in place on the working tree and hosted project `grstlvxuonqzgumiqgzd` (migration tip `202607300001`). The Medium residuals from the re-audit (**N1–N5**) are addressed in code:

- JWT gate on `nutrition-targets/calculate`
- Fail-closed API auth unless `ALLOW_UNAUTHENTICATED_API=true`
- Stronger private-IP classification (mapped IPv6 / CGNAT) + double DNS resolve before meal/recipe fetch
- Per-subject sliding-window rate limits on paid API buckets

Remaining items are **Low** defense-in-depth residuals (test-trip flag, web `localStorage` sessions, legacy push `chatCode`, etc.). DNS rebinding cannot be fully eliminated without connection pinning (undici Agent not available in this runtime).

---

## Verification of prior fixes (F1–F17)

All **FIXED** as previously documented. Hosted migration `202607300001` applied; Auth/CORS/`ALLOWED_ORIGINS`/server `SUPABASE_*` configured.

---

## Critical / High

_None._

---

## Medium (N1–N5) — fixed this pass

| ID | Fix |
|----|-----|
| N1 | `src/app/nutrition-targets/calculate+api.ts` calls `assertNutritionAuthenticated` |
| N2 | `src/services/http/api-auth.ts` blocks `unconfigured` unless `ALLOW_UNAUTHENTICATED_API=true` (documented in `.env.example`) |
| N3 | `src/services/nutrition/url-safety.ts` classifies CGNAT, IPv4-mapped IPv6 (`::ffff:dotted` and `::ffff:7f00:1`), ULA, link-local |
| N4 | Shared `assertPublicDns` double-resolves and requires overlapping public addresses before fetch (meal + recipe) |
| N5 | `src/services/http/api-rate-limit.ts` + `api-gate.ts`; wired into nutrition/recipe/plant/movies/flights asserts (429 on limit) |

---

## Low (still open / accepted)

| ID | Notes |
|----|-------|
| N6 | Flag-gated test-trip chat code in `src/constants/travel.ts` |
| N7 | `returnTo` validated on set; not re-validated on consume |
| N8 | Push handler still accepts legacy `chatCode` |
| N9 | `Math.random` only for local UI IDs |
| N10 | Web sessions in `localStorage` (known XSS residual; CSP meta helps) |

---

## Clean categories

- CORS wildcards
- `service_role` / secrets in `EXPO_PUBLIC_*`
- Invite entropy + expiry
- Clinical `search_path` at migration tip
- `eval` / raw SQL string building
- Edge `nutrition-api` anonymous use

---

## Local development note

Paid API routes require `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` **or** `ALLOW_UNAUTHENTICATED_API=true` for unauthenticated local-only use. Do not set the opt-in on production Hosting.
