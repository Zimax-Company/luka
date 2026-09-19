# Luka — Product & Engineering Feature Log

Living document of what has been built and what is planned. Update the **Status**
column as work lands. Two repos:

- **Web + API** — `luka` (Next.js 16 App Router + Prisma/MySQL on Vercel). This is
  also the backend for mobile.
- **Mobile** — `luka-mobile` (React Native 0.86, Android; TanStack Query, offline-first).

Prod API: `https://luka-18dx.vercel.app`. DB migrations live in
`src/lib/migrations.ts` (auto-run on deploy via `src/instrumentation.ts`). All
calendar logic is **Africa/Lagos** (UTC+1).

---

## 1. Architecture & conventions

- **Auth (customer app):** header-based — clients send `x-user-id` / `x-user-email`;
  `getActor()` resolves the user. No sessions/tokens. **Passwords are plaintext**
  (`users.password`) — known tech debt (see §4).
- **Tenancy:** `Customer` = billable account; every `User`/`Account` carries a
  `customerId`. `getAccessibleAccountIds(actor)` + per-account `AccountAccess`
  gate what a user can see.
- **Account modes:** `Account.mode` ∈ `PERSONAL | BUSINESS` drives the whole
  experience (dashboard + navigation). PERSONAL = income/expense tracker;
  BUSINESS = lean P&L (Orders − Costs).
- **Back office:** platform-owner area at `/backoffice` — DB-backed admins
  (`backoffice_users`), signed-cookie auth, default first-run bootstrap login.

---

## 2. Built & shipped

| Area | Feature | Status |
|---|---|---|
| Core | Account modes (PERSONAL/BUSINESS) + profile chooser + mode-routed shell | ✅ |
| Business | Lean module: Orders (revenue), Costs (expenditure), P&L dashboard | ✅ |
| Web | Account-driven shell, business pages, mode picker, active-account persistence | ✅ |
| Push | Daily "record your money" reminder (once/day, Lagos window) | ✅ |
| Back office | `/backoffice` customers + usage + subscriptions; multi-user admins w/ default bootstrap | ✅ |
| Security | `GET /api/users` scoped to caller's customer (cross-customer leak fixed) | ✅ |
| Web nav | Business sub-route nav no longer reverts to personal (persisted active account) | ✅ |

---

## 3. Current batch (this initiative)

Grouped into epics. **P** = platform.

### EPIC A — Navigation & account UX
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 7 | Move account **switcher** out of More to a central **top bar** | mobile, web | Add a persistent account pill/menu in the header (dashboard top bar mobile; nav bar web). Keep it in More too on mobile? No — single central place. | ⬜ Planned |
| 10 | **More menu** must differ by account type (currently identical) | mobile | `MoreScreen` takes a `mode` (or reads active account); PERSONAL keeps Accounts/Inbox/Schedules/Postings/Reports; BUSINESS shows a business-relevant set (Accounts, Subscription, Users, Reports, Settings). Web already mode-driven. | ⬜ Planned |
| 8 | **Switcher balance shows 0** for other accounts | backend | Root cause: `calculateBalance` sums **entries only**, so BUSINESS accounts (balance = Orders − Costs) always read 0. Fix `calculateBalance`/`getAll` to branch on `mode`: PERSONAL = income−expense; BUSINESS = non-cancelled orders − costs (matches P&L). | ⬜ Planned |

### EPIC B — Transaction detail & deep-linking
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 3 | **View transaction** on income & expense (read-only detail) | mobile, web | New detail screen/page showing amount, category, date, note, line items, account; Edit/Delete actions. Mobile: `TransactionDetail` screen pushed from list row tap (replace/augment the action sheet). Web: modal or `/entries/[id]` view. | ⬜ Planned |
| 6 | **In-app notification → transaction detail** | mobile, web | Notifications already carry `resource`/`resourceId`/`accountId`. On tap, if `resource==='entry'`, deep-link to the transaction detail (switch active account if needed). | ⬜ Planned |

### EPIC C — Auth
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 5 | **Change password** when logged in (old → new) | backend, mobile, web | `POST /api/auth/change-password` `{currentPassword,newPassword}` (actor-gated, verifies current, min 8). Mobile: form in More/Security. Web: form in `/settings`. Stays plaintext to match login (tech debt §4). | ⬜ Planned |

### EPIC D — Smart & quick entry
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 4 | On expense entry, **category select → 3 amount + 3 note suggestions** | backend, mobile, web | New `GET /api/entries/suggest-details?accountId=&categoryId=` → most-frequent/recent amounts + notes for that category from history. Render as tappable chips that fill the fields. | ⬜ Planned |
| 1a | Quick-add polish: **amount-first keypad** + **recent-category chips** | mobile | Reorder form to amount-first with a large numeric entry; show recent categories as quick chips above the picker. | ⬜ Planned |
| 1b | **Home-screen widget** + **add-from-notification** | mobile (native) | Android App Widget (Kotlin, `xml/` provider + layout) opening a quick-add deep link; a persistent/ongoing notification with an "Add" action. Requires native work + device testing — separate track. | ⬜ Planned |

### EPIC E — Reports & analytics
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 2 | Dashboard "top category vs last month": also show **last-month amount**; **line graph of top 10** | mobile, web | `monthly-comparison` already returns `current`+`previous` per category → bump to top 10 and render both amounts; add a comparison chart (bars/line) of top-10 current vs previous. | ⬜ Planned |
| 11 | **Spending-by-category** in Reports → **clickable to show the entries** | mobile, web | Category breakdown rows link to a filtered entries view (`/api/entries?categoryId=` exists) within the selected period. | ⬜ Planned |
| 12 | **Compare a category across years** (e.g. Bag 2026 vs 2025 vs 2024) | backend, mobile, web | New `GET /api/entries/category-yearly?categoryId=&years=` (or reuse `trend` per year) → yearly totals (and/or monthly series per year) rendered as multi-series line/bars. | ⬜ Planned |

### EPIC F — Business cost categories
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 9 | Business **Cost** should have a **category dropdown** (like personal), migrating existing free-text | backend, mobile, web | Reuse the `Category` model (`type=EXPENSE`, scoped to the business account). Add `Cost.categoryId`. **Migration** creates a Category per distinct existing `Cost.category` string per account and backfills `categoryId`; keep the old `category` string for one release (nullable) then drop later. Cost form uses the category dropdown + optional new-category create. | ⬜ Planned |

---

## 4. Known tech debt / production notes

- **Plaintext passwords** (`users.password`): login and change-password compare
  plaintext. Migrating to hashed requires updating login simultaneously — do it as
  a dedicated task (backoffice users already use scrypt as the pattern).
- **Vercel Hobby**: only once-per-day crons (see daily-reminder).
- **Offline cache (mobile)**: TanStack Query persistence can surface stale
  account/balance data briefly after changes.
