# Luka — Product & Technical Reference

> **Living document.** Update it in the same PR/commit as any feature, schema, or
> API change. See [Update protocol](#update-protocol) at the bottom.
>
> **Last updated:** 2026-07-28 · **Doc version:** 1.0

---

## 1. Overview

**Luka** is a personal & business finance tracker. Users record income and
expenses across multiple accounts, categorise them, and get dashboards, reports,
and analytics. It is multi-tenant (many teams/"customers"), collaborative
(multiple users per account with granular access), works offline on mobile, and
is progressively adding automation so the ledger largely fills itself.

**Surfaces**

| Surface | Stack | Distribution |
|---|---|---|
| Web app | Next.js 16 (App Router), TypeScript, Tailwind, Prisma, MySQL | Vercel → `https://luka-18dx.vercel.app` (repo `Zimax-Company/luka`) |
| Mobile app | React Native 0.86 (Android), TypeScript, React Navigation, TanStack Query v5, AsyncStorage | Sideloaded release APK (points at the Vercel API); dev build → localhost |

Both surfaces talk to the same Next.js API (`/api/*`) backed by one MySQL
database (AWS RDS in prod).

---

## 2. Architecture

- **API:** Next.js Route Handlers under `src/app/api`. No server-side session —
  the acting user is identified by `x-user-id` / `x-user-email` request headers,
  resolved server-side by `getActor()` (`src/lib/actor.ts`). Clients attach these
  after login.
- **DB access:** Prisma. Always instantiate via `createPrismaClient()`
  (`src/lib/prismaClient.ts`) which composes `DATABASE_URL` from `DB_*` env parts
  (Vercel doesn't set a literal `DATABASE_URL`). **Never use bare
  `new PrismaClient()`** in code that runs on Vercel.
- **Multi-tenancy:** every user belongs to a `Customer` (billable account) via
  `customerId`. Accounts denormalise `customerId`. The customer "root" is the user
  whose email equals `customer.rootEmail` (only they see billing history).
- **Mobile config:** `src/config.ts` → `__DEV__` uses `10.0.2.2`/`localhost`;
  release uses the Vercel URL.
- **Auth/security note (tech debt):** passwords are not yet hashed (seed admin is
  `admin123`); there is no token/JWT. Treat header-based identity as trusted-client
  for now. See [Known gaps](#8-known-gaps--tech-debt).

---

## 3. Data model

MySQL tables (Prisma models in `prisma/schema.prisma`). All created/altered
exclusively through the [migration framework](#71-database-migrations-auto-run).

| Table | Purpose | Key fields |
|---|---|---|
| `users` | People. Global role. | `email`, `role` (ADMIN/EDITOR/VIEWER), `adminId`, `customerId` |
| `customers` | Billable tenant. | `name`, `rootEmail`, `plan`, `status`, `onboardingDismissed` |
| `subscription_events` | Billing history (root-only view). | `customerId`, `plan`, `type`, `amount` |
| `audit_logs` | Write-action trail (admin-only view). | `customerId`, `actorEmail`, `action`, `resource`, `resourceId`, `summary` |
| `accounts` | Money containers. | `userId` (owner), `customerId`, `handle` (unique), `name`, `type`, `currency` |
| `account_access` | Per-account membership grants. | `userId`, `accountId` (unique pair) |
| `notifications` | In-app notifications (per recipient). | `recipientId`, `actorName`, `action`, `resource`, `accountId`, `readAt` |
| `device_tokens` | FCM push tokens per user/device. | `userId`, `token` (unique), `platform` |
| `categories` | Income/expense buckets, per account. | `accountId`, `name`, `type` (INCOME/EXPENSE) |
| `category_items` | Reusable item catalog under a category. | `categoryId`, `name` |
| `entries` | The ledger lines (was `transactions`). | `accountId`, `categoryId`, `date`, `amount`, `note?` |
| `entry_items` | Optional line-item breakdown of an entry. | `entryId`, `name`, `amount`, `categoryItemId?` |
| `transfers` | Handle-addressed postings between accounts. | `fromAccountId`, `toAccountId`, `amount`, `status`, `fromEntryId`, `toEntryId` |
| `recurring_templates` | Scheduled entries. | `accountId`, `categoryId`, `cadence`, `nextRunOn`, `autoPost` |
| `draft_entries` | Review-inbox items awaiting confirmation. | `accountId`, `categoryId?`, `source`, `status`, `fingerprint` |
| `migrations` | Migration tracking (id + batch). | — |

---

## 4. Access & permissions model

Two orthogonal concepts:

- **Global role** (`users.role`) = *capability*: `ADMIN` (manage everything),
  `EDITOR` (read + write entries/categories), `VIEWER` (read-only).
- **Account access** (`account_access`) = *scope*: which accounts a non-admin user
  can see/act on. **Admins implicitly access every account in their customer**
  (no rows needed).

`getAccessibleAccountIds(actor)` (`src/lib/access.ts`) is the single source of
truth and is threaded through **every** read path so amounts everywhere respect
access: accounts list, categories, entries (+ `summary`, `trend`,
`monthly-comparison`), reports. Write paths (entry/category create·update·delete,
transfers) additionally check `canAccessAccount` + non-VIEWER → **403** otherwise.
Access is managed from **Account → Members** (admin only).

---

## 5. Feature catalogue

Status legend: ✅ Shipped · 🟡 Partial · ⛔ Planned (see [Roadmap](#9-roadmap)).

### 5.1 Core ledger ✅
- **Accounts** — multi-account (PERSONAL/BUSINESS/SAVINGS/CHECKING/CREDIT/INVESTMENT),
  currency, real-time balance (computed from entries, not stored). Unique `@handle`.
- **Categories** — INCOME/EXPENSE, scoped per account; searchable pickers.
- **Entries** — date (human-friendly picker), amount, category (primary label),
  note (optional, secondary). Income and Expenses are separate tabs with
  type-scoped categories.
- **Reports** — totals, category breakdown, recent activity; shared Category-type +
  Year filters drive both the trend chart and the breakdown.
- **Users** — CRUD, roles, invited users belong to an admin/customer.
- **Auth** — email/password login; identity via headers.

### 5.2 Dashboard & analytics ✅
- **Dashboard** — net balance, income/expenses, stat cards, year filter (defaults
  to current year). **Show/hide figures** toggle (hidden by default for privacy).
- **Category trend** — per-category monthly totals over a year; filter by year /
  category type / category (`/api/entries/trend`).
- **Top categories vs last month** — top-5 by current-month total with %-change
  badges (New / ▲ / ▼). **Account-based** (`?accountId`) and access-gated
  (`/api/entries/monthly-comparison`).

### 5.3 Filters, search, pagination, grouping ✅
- Period filter (Today / Month / Year / All), account filter, keyword search
  (note + category).
- Entries **grouped by day** in Month view and **by month** in Year view, with
  per-group subtotals.
- Server pagination for entries; client pagination for categories (web); infinite
  scroll (mobile).

### 5.4 Offline mode (mobile) ✅
NetInfo → TanStack `onlineManager`; cache persisted to AsyncStorage
(`PersistQueryClientProvider`). Entry create/update/delete are queued when offline
(optimistic + resumable via keyed mutation defaults), auto-sync on reconnect and
survive app restarts. Offline banner shows connectivity, pending count, and
"last synced" time. See `src/query/queryClient.ts`, `src/context/NetworkContext.tsx`.

### 5.5 In-app notifications ✅
Bell icon + unread badge (polled). On any entry create/update/delete, a
notification fans out to everyone with access to that account (members + admins)
**except the actor**. Also used for transfer decisions and inbox drafts.
`/api/notifications`, `/notifications/unread-count`, `POST /notifications` (mark read).

### 5.5b Push notifications (FCM) 🟡
Backend shipped; mobile wiring pending Firebase credentials. Every in-app
notification (entry CRUD, postings, inbox drafts from the cron) also sends a
Firebase Cloud Messaging push via `lib/push.sendPushToUsers` (FCM HTTP v1,
`google-auth-library`). No-ops until `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL`
/ `FIREBASE_PRIVATE_KEY` are set on Vercel; dead tokens are pruned. Devices
register their token via `POST /api/devices`. **Remaining:** add
`android/app/google-services.json`, install `@react-native-firebase/*`, request
POST_NOTIFICATIONS, register the token on login, and handle foreground/background
messages — then rebuild the APK.

### 5.6 Account access & members ✅
Per-account membership (see [§4](#4-access--permissions-model)). Admin-only Members
UI on each account (web modal, mobile screen): list members, grant from candidate
users, revoke; admins shown as all-access, non-removable.
`/api/accounts/[id]/members`, `.../members/[userId]`.

### 5.7 Handle-addressed postings (transfers) ✅
Send an expense from one account to another by its `@handle` (globally unique,
cross-team). **Posting model:** the sender's **expense posts immediately**; the
recipient's **income posts only on accept**; **reject reverses** the sender's
expense. Incoming/outgoing views, accept/reject, and notifications to both sides.
`/api/transfers`, `/transfers/[id]/accept|reject`, `/api/accounts/resolve`.

### 5.8 Category items ✅
- **Catalog:** reusable items under a category (e.g. Milk under Groceries) —
  `/api/categories/[id]/items`.
- **Entry line items:** optionally break an entry's amount into named items;
  **sum must not exceed the entry amount** (validated server + client). Items are
  optional; choose from the catalog or free-type. Stored in `entry_items`.

### 5.9 Onboarding ✅
New-customer checklist derived from data (step 1: create an account, step 2: add a
category), dismissible per customer. Shown on the web dashboard and as a mobile
card; auto-hides when complete. `/api/onboarding`, `/onboarding/dismiss`.

### 5.10 Billing & audit ✅
`Customer` holds plan/status; `subscription_events` history is visible only to the
customer root. `audit_logs` records write actions and is viewable by admins only.
`/api/subscription`, `/api/audit`.

### 5.11 Theming & UX polish ✅
Light/dark theme (persisted, matches web). Web entry/account **edit modals**
redesigned (icon headers, sectioned fields). Mobile replaces native OS action
dialogs with a themed `ActionSheet` (entry/account/category menus). Toasts on all
actions. Luka logo + adaptive launcher icon.

### 5.12 Security — biometric lock (mobile) ✅
Optional "Require fingerprint" setting (`react-native-biometrics`). When on, the
app is gated behind a fingerprint prompt on launch and on resume from background.
`src/context/BiometricContext.tsx`, `src/components/BiometricGate.tsx`.

### 5.13 Automation — Phase 1 ✅
The runway for all future capture features.
- **Review Inbox** — automated sources create *draft* entries (`draft_entries`) that
  the user confirms/edits/dismisses (bulk approve). `/api/drafts`,
  `/drafts/[id]/approve|dismiss`, `/drafts/approve-all`, `/drafts/count`.
  Web `/inbox`, mobile `InboxScreen`.
- **Recurring schedules** — templates (`recurring_templates`) draft or auto-post on
  a cadence. Driven by a daily **Vercel Cron** → `/api/cron/run-schedules`
  (guarded by `CRON_SECRET`, idempotent via `nextRunOn` advance + draft fingerprint).
  `/api/recurring`, web `/schedules`, mobile `SchedulesScreen`/`RecurringFormScreen`.
- **Auto-categorise** — suggests a category from history (per-account Naive Bayes over
  note tokens + amount bucket, with merchant-memory fast path).
  `/api/entries/suggest-category`, model store in `src/lib/categorizeStore.ts`.
- **Quick-add polish** 🟡 — searchable category picker shipped; amount-first keypad /
  home-screen widget / clone-last remain.

---

## 6. Notifications, cron & scheduling summary

- **Notifications:** polled (no websockets). Per-recipient rows; read state per user.
- **Cron:** `vercel.json` → `crons: [{ path: "/api/cron/run-schedules", schedule: "0 5 * * *" }]`
  = 05:00 UTC (06:00 WAT) daily. Runs only on the **production** deployment. Auth via
  `Authorization: Bearer $CRON_SECRET`; **env-var changes require a redeploy** to take
  effect. Confirm in Vercel dashboard → Settings → Cron Jobs.

---

## 7. Cross-cutting engineering

### 7.1 Database migrations (auto-run) ✅
Laravel-style framework in `src/lib/migrations.ts` — an ordered `MIGRATIONS[]` of
`{ id, description, up, down }` using guarded, idempotent raw SQL; tracked in the
`migrations` table. **No manual migrations.** `src/instrumentation.ts` runs all
pending migrations on each deployment's first server boot (server-global advisory
lock, `INSERT IGNORE`, `createPrismaClient`). CLI (`migrate.ts` / `npm run migrate:*`)
and `/api/migrate` (status/run) remain for inspection. Current head: **018**.
**To change schema:** edit `schema.prisma`, add the next `NNN_*` migration entry,
`prisma generate` — it applies automatically on deploy.

### 7.2 Offline & sync
See [§5.4](#54-offline-mode-mobile-). Reads served from persisted cache; writes
queued and replayed; `onlineManager` drives connectivity from NetInfo.

### 7.3 Auto-categorisation algorithm
Per-account multinomial Naive Bayes over tokenised notes + a log-bucketed amount
feature, with a deterministic merchant-memory override and optional user rules;
counts updated incrementally on every entry write (a correction improves the next
suggestion). Confidence thresholds drive auto-fill vs suggest vs none. Dedup for
inbox drafts uses a fingerprint of `account + day + amount + counterparty`.

---

## 8. API reference (by area)

Auth headers (`x-user-id`, `x-user-email`) required on all except `/auth/login`.

- **Auth:** `POST /auth/login`
- **Accounts:** `GET/POST /accounts`, `GET/PUT/DELETE /accounts/[id]`,
  `GET /accounts/resolve?handle=`, `GET/POST /accounts/[id]/members`,
  `DELETE /accounts/[id]/members/[userId]`
- **Categories:** `GET/POST /categories`, `GET/PUT/DELETE /categories/[id]`,
  `GET/POST /categories/[id]/items`, `DELETE /categories/[id]/items/[itemId]`
- **Entries:** `GET/POST /entries`, `GET/PUT/DELETE /entries/[id]`,
  `GET /entries/summary`, `GET /entries/trend`, `GET /entries/monthly-comparison`,
  `GET /entries/suggest-category`
- **Transfers:** `GET/POST /transfers`, `POST /transfers/[id]/accept|reject`
- **Drafts (inbox):** `GET /drafts`, `GET /drafts/count`, `POST /drafts/[id]/approve`,
  `POST /drafts/[id]/dismiss`, `POST /drafts/approve-all`
- **Recurring:** `GET/POST /recurring`, `GET/PUT/DELETE /recurring/[id]`
- **Notifications:** `GET /notifications`, `GET /notifications/unread-count`,
  `POST /notifications`
- **Onboarding:** `GET /onboarding`, `POST /onboarding/dismiss`
- **Devices (push):** `POST /devices`, `DELETE /devices`
- **Billing/audit:** `GET /subscription`, `GET /audit`
- **Users:** `GET/POST /users`, `GET/PUT/DELETE /users/[id]`
- **Ops:** `GET /migrate`, `POST /migrate`, `POST /migrate/rollback`,
  `GET/POST /cron/run-schedules`

---

## 9. Roadmap

The automation vision: turn Luka from "a ledger you feed" into "a ledger that
mostly fills itself and asks you to nod." The **Review Inbox + auto-categorise**
foundation (Phase 1) is shipped; Phases 2–3 plug into it.

### Phase 1 — reduce effort per entry ✅ (mostly)
Review Inbox, recurring schedules + cron, auto-categorise. Remaining: quick-add
polish (amount-first keypad, home-screen widget, clone-last, add-from-notification).

### Phase 2 — capture at source ⛔ Planned
Feed drafts into the inbox automatically:
- **Bank SMS / alert parsing (on-device)** — parse Nigerian bank / OPay / PalmPay /
  Kuda debit-credit alerts into draft entries. Viable because we sideload (Play
  Store bans `READ_SMS` for finance apps). Parse on-device; never upload raw SMS.
- **Notification listener** — catch push alerts that don't SMS.
- **Statement import (CSV / PDF / OFX)** — first-class monthly backfill with column
  mapping + dedup.

### Phase 3 — ambitious ⛔ Planned
- **Natural-language / AI quick-add** — "5k fuel yesterday, 2k airtime" → parsed,
  categorised drafts; + voice.
- **WhatsApp / Telegram bot** — log by messaging.
- **Open banking (Mono / Okra / Stitch)** — link accounts, auto-pull transactions.
- **Receipt / screenshot OCR** — ML Kit / cloud OCR; "share to Luka".
- **ML categoriser** — upgrade from Naive Bayes when volume warrants.

Cross-cutting for Phases 2–3: on-device parsing for privacy, dedup by
`amount+date+account+counterparty`, offline-first, and cost-awareness for any
open-banking / cloud OCR / LLM usage.

---

## 10. Known gaps & tech debt

- **Password hashing / real auth** — passwords are stored/compared in plaintext; no
  token. Needs bcrypt + a session/JWT before any untrusted distribution.
- **`CRON_SECRET`** — set on Vercel but requires a **production redeploy** to take
  effect; until then the cron endpoint is unauthenticated (low-risk, idempotent).
- **Single-currency assumptions** in some aggregations (mixes account currencies in
  totals).
- **Handle backfill** — auto-generated handles can collide on legacy data (suffixed
  `_<id4>`); admins can rename.
- **`deploy-schema` route** — legacy, unused; still uses bare `new PrismaClient()`.
- **Dev-only React warning** ("Cannot update a component…") in Metro debug builds;
  stripped from release.

---

## Update protocol

When you add or change a feature:
1. Update the relevant [Feature catalogue](#5-feature-catalogue) entry (or add one)
   and its **status**.
2. If the schema changed: add the migration entry, update [§3 Data model](#3-data-model)
   and bump the migration head in [§7.1](#71-database-migrations-auto-run).
3. If endpoints changed: update [§8 API reference](#8-api-reference-by-area).
4. If it advances the roadmap: move the item's status in [§9 Roadmap](#9-roadmap).
5. Bump **Doc version** + **Last updated** at the top and add a changelog line below.

### Changelog
- **1.2 — 2026-08-02** — Bugfix (couldn't create category): dropped the stale global
  `categories.unique_name_type` index that migration 005 failed to remove (migration
  017); backfilled `accounts.customer_id` for accounts orphaned before their owner had
  a customer (migration 018) and made admin access union customer + owned accounts so
  `customer_id` drift can't hide an admin's own accounts. FCM push mobile wiring shipped
  (google-services, RN Firebase, token registration on login).
- **1.1 — 2026-07-30** — Keyboard-avoiding forms + live thousands separators on all
  amount inputs; "Review Inbox" → "Inbox"; category type filter; account-based
  monthly-comparison. Added FCM push **backend** (device_tokens, `/api/devices`,
  `lib/push`, migration 016) fired on every notification — mobile wiring pending
  Firebase credentials (§5.5b).
- **1.0 — 2026-07-28** — Initial consolidated PRD + technical reference covering all
  shipped features (core ledger, dashboard/analytics, offline, notifications, access
  control, transfers, category items, onboarding, biometric lock, auto-migration,
  Phase 1 automation) and the Phase 2–3 roadmap.
