# Monetization Plan: Free vs Premium Tiers

## Proposed Feature Split

### Free Tier

- Manual sync with rate limiting (2 syncs/hour, max 6 per day)
- Basic YNAB ↔ Splitwise sync functionality
- Sync history (last 7 days only)
- Error email notifications
- Standard 1:1 split ratio only
- Standard payee naming only
- Standard support

### Premium Tier ($4.99/month or $49/year)

- Everything in Free, plus:
- **Hourly automatic sync** (scheduled, set-and-forget)
- **Unlimited manual syncs** (only constrained by API rate limits)
- **API key access** for programmatic syncs
- **Extended sync history** (unlimited retention)
- **Custom split ratios** (e.g., 60/40, 70/30)
- **Custom YNAB payee names** (use description as payee, custom naming)
- **Priority support** badge/indicator

## Implementation Approach

This plan is designed for **incremental implementation with manual review checkpoints**. After each phase:

1. Run `npm run test:run` to verify tests pass
2. Manual review and approval required
3. Only then proceed to next phase

---

## Implementation Phases

### ✅ Phase 1: Foundation - Database & Subscription Service

**Deliverables:**

- ✅ Updated Prisma schema with subscription fields
- ✅ Database migration created and applied
- ✅ `services/subscription.ts` with helper functions
- ✅ Tests for subscription service

**Status:** COMPLETED ✅

---

### ✅ Phase 2: Stripe Integration Core

**Deliverables:**

- ✅ Stripe packages installed (`stripe`, `@stripe/stripe-js`)
- ✅ `services/stripe.ts` server-side wrapper
- ✅ `lib/stripe.ts` client-side integration
- ✅ Environment variables configured (`.env.example` created)
- ✅ Tests for Stripe service

**Status:** COMPLETED ✅

---

### ✅ Phase 3: Stripe API Routes

**Deliverables:**

- ✅ `app/api/stripe/create-checkout-session/route.ts`
- ✅ `app/api/stripe/create-portal-session/route.ts`
- ✅ `app/api/stripe/webhooks/route.ts` (with date safety fixes)
- ✅ Tests for API routes (164 tests passing)
- ✅ Test UI component (`components/subscription-test-card.tsx`)

**Status:** COMPLETED ✅ (Tested and working end-to-end!)

---

### ✅ Phase 4: Rate Limiting & Feature Gating

**Deliverables:**

- ✅ Updated `lib/rate-limit.ts` for subscription-based limits (2/hour, 6/day free; unlimited premium)
- ✅ Updated `app/actions/sync.ts` with subscription-aware rate limiting
- ✅ Gating for split ratio in Splitwise settings (premium only)
- ✅ Gating for YNAB payee in Splitwise settings (premium only)
- ✅ Filter auto-sync to premium users only in `services/sync.ts`
- ✅ API access restricted to premium users in `app/api/sync/route.ts`
- ✅ Updated test factories to create premium users
- ✅ All 166 tests passing

**Status:** COMPLETED ✅

---

### ✅ Phase 5: UI Components

**Deliverables:**

- ✅ `components/subscription-card.tsx` (production version)
- ✅ `components/upgrade-modal.tsx`
- ✅ `components/premium-badge.tsx`
- ✅ Updated `components/api-key-card.tsx` (show upgrade prompt for free users)
- ✅ Updated `components/scheduled-sync-info.tsx` (premium badge)
- ✅ Updated `components/splitwise-settings-form.tsx` (gate split ratio & payee settings)
- ✅ TypeScript errors fixed
- ✅ All 197 tests passing

**Status:** COMPLETED ✅

---

### ✅ Phase 6: Dashboard & Marketing Pages

**Deliverables:**

- ✅ Updated `app/dashboard/page.tsx` (subscription status card)
- ✅ New `app/pricing/page.tsx`
- ✅ Updated `app/page.tsx` (pricing section)
- ✅ Updated dashboard FAQ with subscription info
- ✅ Updated SignInButton component to support children and variants
- ✅ All 197 tests passing
- ✅ TypeScript errors fixed

**Status:** COMPLETED ✅

---

### Phase 7: Email Templates

**Deliverables:**

- [ ] Updated `emails/welcome.tsx`
- [ ] `emails/subscription-confirmed.tsx`
- [ ] `emails/subscription-canceled.tsx`
- [ ] `emails/payment-failed.tsx`

**Checkpoint:** Preview emails, approve to continue

---

### Phase 8: Data Migration & Backfill

**Deliverables:**

- [ ] Script to backfill existing users (grandfather to premium)
- [ ] Run migration on database

**Checkpoint:** Verify user data looks correct, approve to continue

---

### Phase 9: Documentation & Final Testing

**Deliverables:**

- [ ] Updated README.md
- [ ] Complete end-to-end test suite
- [ ] Manual testing checklist completed

**Checkpoint:** Final approval for production deployment

---

## Progress Summary

✅ **6/9 phases completed**

**Completed:**

- Phase 1: Database & Subscription Service
- Phase 2: Stripe Integration Core
- Phase 3: Stripe API Routes
- Phase 4: Rate Limiting & Feature Gating
- Phase 5: UI Components
- Phase 6: Dashboard & Marketing Pages

**Current:** Phase 7 - Email Templates

**Next:** Phase 8 - Data Migration & Backfill
