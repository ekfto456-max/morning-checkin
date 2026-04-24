# CLAUDE.md — morning-checkin

Guidance for AI assistants working in this repository.

---

## Project Overview

**morning-checkin** (서비스명: **죽기스** — 죽음의 기상스터디) is a Korean morning study accountability app. Members check in daily by uploading a photo before their personal deadline. Late check-ins incur monetary penalties (2,000원 or 5,000원). The app includes a social feed, leaderboard, weekly exemptions, push notifications, and a virtual pet (뭉치 seal).

**Deployed on Vercel.** Database and file storage via Supabase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5.5 (strict) |
| Styling | Tailwind CSS 3.4 (mobile-first) |
| Database | Supabase (PostgreSQL + Storage) |
| Push Notifications | web-push 3.6.7 (VAPID) |
| 3D Graphics | @splinetool/react-spline |
| Image Processing | sharp (server-side) |
| Deployment | Vercel (cron jobs configured in vercel.json) |

---

## Directory Structure

```
/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Single-page app entry (tab navigation)
│   │   ├── layout.tsx            # Root layout — PWA metadata, theme color #FF4757
│   │   ├── globals.css           # Global styles
│   │   └── api/                  # API route handlers (Next.js Route Handlers)
│   │       ├── checkin/          # Check-in submit & status
│   │       ├── calendar/         # Monthly attendance data
│   │       ├── comments/         # Feed item comments
│   │       ├── exemptions/       # Weekly exemption management
│   │       ├── feed/             # Combined social feed
│   │       ├── leaderboard/      # Penalty + attendance rankings
│   │       ├── members-status/   # Today's member overview
│   │       ├── messages/         # Chat messages
│   │       ├── penalty-fund/     # Penalty payment tracking
│   │       ├── posts/            # Free-form posts
│   │       ├── reactions/        # Emoji reactions
│   │       ├── seal/             # Virtual pet (뭉치) state + feeding
│   │       ├── seal-logs/        # Seal EXP history
│   │       ├── stats/            # User statistics
│   │       ├── users/            # Profile CRUD + avatar upload
│   │       ├── push/subscribe/   # Push notification subscription
│   │       └── cron/morning-reminder/  # Scheduled reminder (Vercel cron)
│   ├── components/               # React components (17 total)
│   └── lib/
│       ├── supabase.ts           # Supabase client initializer
│       ├── penalty.ts            # Penalty calculation logic (KST-aware)
│       ├── weekly-exemption.ts   # Auto-grant weekly exemptions
│       └── mock-store.ts         # In-memory fallback store (dev without Supabase)
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service Worker
│   └── seals/                    # Virtual pet images (levels 1–5)
├── migrations/                   # Incremental SQL migrations (run in Supabase SQL editor)
│   ├── 001_add_avatar_and_push.sql
│   ├── 002_add_reactions.sql
│   ├── 003_exemption_reactions.sql
│   ├── 004_add_posts.sql
│   └── 005_custom_deadline.sql
├── supabase-setup.sql            # Initial schema (run first on a new project)
├── vercel.json                   # Cron job schedule
├── next.config.js                # Image remote patterns for Supabase storage
├── tailwind.config.ts            # Custom `skull` color palette
└── .env.local.example            # Environment variable template
```

---

## Development Workflow

### Running Locally

```bash
npm install
cp .env.local.example .env.local  # Fill in Supabase credentials
npm run dev                        # http://localhost:3000
```

If Supabase credentials are omitted, the app falls back to `src/lib/mock-store.ts` (in-memory data, reset on server restart).

### Build & Deploy

```bash
npm run build   # Type-check + production build
npm start       # Start production server locally
```

Production deploys automatically via Vercel on push to `main`.

### No Test Suite

There are no automated tests. TypeScript strict mode provides compile-time safety. Manual testing is expected before merging.

---

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anonymous key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | Push notification public key |
| `VAPID_SUBJECT` | Server | VAPID subject (e.g., `mailto:...`) |
| `VAPID_PRIVATE_KEY` | Server | Push notification private key |
| `CRON_SECRET` | Server | Bearer token for `/api/cron/*` authorization |

Server-only variables are never exposed to the client. The `CRON_SECRET` must be sent as `Authorization: Bearer <CRON_SECRET>` when calling cron endpoints.

---

## Database Schema

### Setup Order

1. Run `supabase-setup.sql` on a new project to create the base schema.
2. Run migration files in order (`001` → `002` → ... → `005`) in the Supabase SQL editor.

### Core Tables

| Table | Key Columns | Notes |
|---|---|---|
| `users` | `id`, `name` (UNIQUE), `batch`, `purpose`, `avatar_url`, `custom_deadline_time` | No auth — identified by name |
| `checkins` | `user_id`, `image_url`, `checkin_time`, `status`, `penalty` | One per user per KST day |
| `exemptions` | `user_id`, `reason`, `granted_at`, `used_at`, `used_for_date` | Auto-granted weekly |
| `push_subscriptions` | `user_id`, `endpoint` (UNIQUE), `p256dh`, `auth` | Web Push API |
| `reactions` | `user_id`, `emoji`, `checkin_id`/`exemption_id`/`post_id` | Flexible FK (Migration 003) |
| `posts` | `user_id`, `content`, `image_url` | Free-form social posts |
| `seal` | `name`, `level`, `exp`, `hp`, `accessories` | Single shared virtual pet |
| `seal_feeds` | `user_id`, `exp_gained`, `message` | Seal activity log |

**Row Level Security:** All tables use `USING (true)` policies — public access is intentional (no auth system).

---

## Key Business Logic

### Penalty Calculation (`src/lib/penalty.ts`)

All time calculations are **KST (UTC+9)**, regardless of server location.

```
≤ onTimeLimit              → on_time, 0원
onTimeLimit+1 ~ +12 min    → late,    2,000원
> onTimeLimit+12 min       → late,    5,000원
```

- Default deadline: **10:03 KST** (`parseDeadlineMinutes()` returns `10*60+3`)
- Per-user override: `users.custom_deadline_time` field (e.g., `"07:03"`)
- The `+12 minute` grace window is hardcoded relative to the user's deadline

### Check-in EXP Awards (`/api/checkin/route.ts`)

Check-ins grant EXP to the shared seal:
- Before 7:00 AM KST → **+4 EXP**
- On-time → **+2 EXP**
- Late → **−2 EXP**
- Bonus **+1 EXP** if user has a 5+ day on-time streak

### Seal Level Thresholds (`/api/seal/route.ts`)

Levels 1–5 based on cumulative EXP: `[0, 200, 600, 1200, 1800]`

### Weekly Exemptions (`src/lib/weekly-exemption.ts`)

- Auto-grants 1 exemption per user per Monday-based week
- Idempotent: safe to call multiple times
- Named: `"X월 Y주차 면제권"` (e.g., `"4월 2주차 면제권"`)

### Cron Job (`/api/cron/morning-reminder`)

- Schedule: `30 0 * * 1-6` = 09:30 KST, Monday–Saturday
- Sends push notifications to users who haven't checked in yet
- Requires `Authorization: Bearer <CRON_SECRET>` header

---

## API Routes Reference

All routes are under `src/app/api/`. Every route file exports named HTTP method handlers (`GET`, `POST`, `PATCH`, `DELETE`).

| Endpoint | Methods | Description |
|---|---|---|
| `/api/checkin` | GET, POST | Today's check-in status / submit check-in with image |
| `/api/feed` | GET | Paginated combined feed (check-ins + exemptions + posts) |
| `/api/posts` | GET, POST, DELETE | Free-form post management |
| `/api/comments` | GET, POST | Feed item comments |
| `/api/reactions` | GET, POST, DELETE | Emoji reactions on feed items |
| `/api/exemptions` | GET, POST | List / use exemptions |
| `/api/leaderboard` | GET | Rankings by penalty and attendance |
| `/api/members-status` | GET | Today's check-in status for all members |
| `/api/stats` | GET | User statistics (count, streak) |
| `/api/calendar` | GET | Monthly attendance calendar |
| `/api/penalty-fund` | GET, POST | Penalty transaction log |
| `/api/users` | GET, PATCH | User profile read/update |
| `/api/users/avatar` | POST | Avatar image upload to Supabase storage |
| `/api/seal` | GET, POST | Virtual pet state / feed the seal |
| `/api/seal-logs` | GET | Seal activity history |
| `/api/messages` | GET, POST | Chat messages |
| `/api/push/subscribe` | POST | Register push notification subscription |
| `/api/cron/morning-reminder` | GET | Cron-triggered morning reminder push |

Feed pagination: `?page=1` (10 items per page).

---

## Frontend Architecture

### Navigation (tabs in `src/app/page.tsx`)

```
home → TodayFeed (social feed + check-in upload)
seal → SealCard + SealFeed (virtual pet)
fund → PenaltyFund (penalty payment history)
calendar → AttendanceCalendar + StatsCard
members → MemberBoard (today's status overview)
my → ProfileCard + ExemptionCard + Leaderboard + NotificationToggle
```

### State Management

- No external state library (Zustand, Redux, etc.)
- User session stored in `localStorage` under key `"checkin_user"`
- `refreshKey` state incremented to trigger data re-fetches after mutations
- Optimistic UI updates via `optimisticFeedItem` state for instant feedback

### Lazy Tab Loading

Tabs are conditionally rendered and only mounted after first visit (`visitedTabs` set). This prevents unnecessary API calls for unvisited tabs.

### Real-Time Clock

`currentTime` state updates every second via `setInterval`. Used to display KST deadline countdown.

---

## Coding Conventions

### TypeScript

- Strict mode is enabled — no `any` unless unavoidable
- Path alias `@/*` maps to `src/*`
- Inline type definitions preferred for small shapes; named types for shared structures
- No separate `types/` directory — types are colocated with usage

### Tailwind CSS

- Mobile-first, responsive design
- Custom color token: `skull-*` (red gradient, defined in `tailwind.config.ts`)
- Container: `max-w-md mx-auto` wraps main content for mobile layout

### API Route Pattern

Each route file in `src/app/api/` follows this pattern:
1. Parse request params (`searchParams` for GET, `request.json()` for POST/PATCH)
2. Check if Supabase is configured — fall back to mock store if not
3. Run Supabase query
4. Return `NextResponse.json(data)` or `NextResponse.json({ error }, { status: N })`

### Mock Store Fallback

`src/lib/mock-store.ts` mirrors the Supabase data shapes. Call `isUsingMockMode()` to check if mock mode is active. Mock data is persisted on `globalThis` within the Node.js process lifetime.

### Commit Message Style

Follow the existing convention — conventional commits with Korean descriptions:

```
feat: 기능 설명
fix: 버그 수정 설명
chore: 유지보수 작업
ci: CI/CD 변경
```

---

## Supabase Storage

Avatar images and check-in images are stored in Supabase Storage buckets:
- Bucket: `avatars` (user profile photos)
- Bucket: `checkins` (check-in proof photos)

The `next.config.js` whitelists `*.supabase.co` for Next.js `<Image>` optimization.

---

## PWA Configuration

- **Manifest:** `public/manifest.json` — app name, icons, display: `standalone`
- **Service Worker:** `public/sw.js` — handles push notification display
- **Theme color:** `#FF4757` (coral red, set in `layout.tsx`)
- **Service worker registration:** runs in `useEffect` in `page.tsx`

---

## Common Gotchas

1. **Time zone:** Always use KST (UTC+9) for deadline logic. The server may be in a different timezone. Use `getKSTDayRange()` from `src/lib/penalty.ts` for Supabase date queries.

2. **No authentication:** Users are identified only by name stored in `localStorage`. There is no password or session token. Never add auth-dependent logic without updating this model.

3. **Single shared seal:** The `seal` table has one row (the shared community pet). All users feed the same seal.

4. **Reactions flexibility:** Migration 003 removed strict FK constraints on `reactions` so a single reaction row can reference a `checkin_id`, `exemption_id`, or `post_id`. Treat these as nullable foreign keys.

5. **Custom deadline:** Always pass `user.custom_deadline_time` through to `calculatePenalty()`. Defaulting to `null` is acceptable (falls back to 10:03).

6. **Mock mode resets on restart:** Data in `mock-store.ts` is in-memory only. Do not rely on it persisting across dev server restarts.
