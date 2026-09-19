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
| 7 | Move account **switcher** out of More to a central **top bar** | mobile, web | Mobile: `AccountSwitchHeader` is the header title on Home/BizHome (shows account + ⌄, tap = switch); removed from More. Web: already in nav. | ✅ Mobile done (web already had it in nav) |
| 10 | **More menu** must differ by account type (currently identical) | mobile | `MoreScreen` reads the active account mode: BUSINESS hides Inbox/Schedules/Postings/Reports; both keep Accounts/Subscription/Users/Change password. | ✅ Done |
| 8 | **Switcher balance shows 0** for other accounts | backend | Fixed: `calculateBalance` branches on `mode` — PERSONAL = income−expense; BUSINESS = non-cancelled Orders − Costs (matches P&L). | ✅ Done (shipped) |

### EPIC B — Transaction detail & deep-linking
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 3 | **View transaction** on income & expense (read-only detail) | mobile, web | Mobile: `TransactionDetailScreen` (amount, category, account, date, note, line items + Edit/Delete); list row tap opens it, long-press = quick actions. Web: notification/report deep-links open the entry via the existing modal. | ✅ Mobile done; web via modal (dedicated read-only web page = future polish) |
| 6 | **In-app notification → transaction detail** | mobile, web | Mobile: NotificationsScreen entry rows → `TransactionDetail` (registered in Home stack; detail fetches by id, account-agnostic). Web: NotificationBell entry rows → `/entries?entry=<id>`. | ✅ Done |

### EPIC C — Auth
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 5 | **Change password** when logged in (old → new) | backend, mobile, web | `POST /api/auth/change-password` (actor-gated, verifies current, min 8). Mobile: `ChangePasswordScreen` (More → Change password). Web: form on `/settings`. Plaintext to match login (tech debt §4). | ✅ Done (shipped) |

### EPIC D — Smart & quick entry
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 4 | On expense entry, **category select → 3 amount + 3 note suggestions** | backend, mobile, web | `GET /api/entries/suggest-details?accountId=&categoryId=` → top 3 most-used amounts + notes. Chips under the amount/note fields (mobile TransactionFormScreen + web EntriesPage). | ✅ Done (shipped) |
| 1a | Quick-add polish: **amount-first** + **recent-category chips** | mobile | Transaction form now leads with the Amount field (autofocus) and shows quick-pick category chips above the picker. (Full custom on-screen keypad = future.) | ✅ Done |
| 1b | **Home-screen widget** + **add-from-notification** | mobile (native) | Android App Widget (Kotlin, `xml/` provider + layout) opening a quick-add deep link; a persistent/ongoing notification with an "Add" action. Requires native work + device testing — separate track. | ⬜ Next (native track) |

### EPIC E — Reports & analytics
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 2 | Dashboard "top category vs last month": also show **last-month amount**; line graph of top 10 | mobile, web | Endpoint bumped to top 10; both clients now show the last-month amount per category alongside the current amount + % badge. (Multi-series line chart of top-10 = future enhancement.) | ✅ Amounts + top-10 done; chart = future |
| 11 | **Spending-by-category** in Reports → **clickable to show the entries** | mobile, web | Web: reports summary now carries `categoryId`; category rows link to `/entries?categoryId=&year=&month=`. Mobile: pending (needs categoryId in the breakdown + a categoryId filter on the entries list). | ✅ Web done; ⬜ mobile next |
| 12 | **Compare a category across years** (e.g. Bag 2026 vs 2025 vs 2024) | backend, mobile, web | `GET /api/entries/category-yearly?categoryId=&years=` → yearly totals + 12-month series per year. Web Reports has a "Compare across years" card (multi-line chart + yearly totals). Mobile pending. | ✅ Backend + web done; ⬜ mobile next |

### EPIC F — Business cost categories
| # | Item | P | Design | Status |
|---|---|---|---|---|
| 9 | Business **Cost** should have a **category dropdown** (like personal), migrating existing free-text | backend, mobile, web | Done: reuse EXPENSE `Category`; `Cost.categoryId` + migration 023 (create categories from distinct labels per account + backfill). APIs resolve by id or find-or-create by name; return categoryId + categoryName. Cost forms (mobile + web) use a category dropdown with "+ New category". Legacy `category` kept for back-compat. | ✅ Done (shipped) |

---

## 3b. Feedback round (refinements)

| Item | What changed | Status |
|---|---|---|
| Switcher not obvious | Mobile header pill restyled (tinted, bordered, ⇅ icon); web adds a top-bar account pill | ✅ |
| Remove old switcher | Removed from mobile Business dashboard + web More menu | ✅ |
| Business notifications | Orders/Costs now notify account members (in-app + push) via `notifyBusinessChange` | ✅ |
| Change password location | Moved from Tools → **Security** section (mobile) | ✅ |
| Reports features missing on mobile | Mobile Reports: "spending by category" rows open the entries (`CategoryEntries`); added "Compare across years" | ✅ |
| Category before amount | Mobile entry form reordered: category (with chips) → amount | ✅ |
| Quick categories by frequency | New `GET /api/entries/frequent-categories`; chips ranked by usage, not DB order | ✅ |
| Items as dropdown + migration | Migration 024 backfills the `CategoryItem` catalog + links; mobile item name is now a catalog dropdown with "+ New item" | ✅ mobile; ⬜ web parity |
| Who created the transaction | Detail shows "Created by" (resolved from the audit trail) | ✅ mobile; ⬜ web |
| Luka widget | Android home-screen widget (Add expense / income) that opens Luka — **how to add:** long-press the home screen → Widgets → Luka → drag. Deep-link straight into the add form = next step. | ✅ widget opens app; ⬜ deep-link routing |

Remaining web parity: item-name dropdown + category-first order + "created by" on the web entry view. Widget deep-link routing (open the add form directly) needs a small native→JS intent bridge.

## 4. Known tech debt / production notes

- **Plaintext passwords** (`users.password`): login and change-password compare
  plaintext. Migrating to hashed requires updating login simultaneously — do it as
  a dedicated task (backoffice users already use scrypt as the pattern).
- **Vercel Hobby**: only once-per-day crons (see daily-reminder).
- **Offline cache (mobile)**: TanStack Query persistence can surface stale
  account/balance data briefly after changes.
