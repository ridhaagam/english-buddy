# EnglishBuddy — Code Conventions

This file guides Claude (and human contributors) on the patterns and constraints that govern this codebase.

---

## Architecture Overview

```
apps/api/        FastAPI backend (Python 3.12, async SQLAlchemy 2)
apps/web/        React 18 + TypeScript frontend (Vite, TanStack Query)
```

Shared values live in `apps/web/src/styles/tokens.css` (CSS custom properties) and `apps/api/app/core/`.

---

## Backend conventions (FastAPI / SQLAlchemy)

### Route files
- One file per domain: `api/auth.py`, `api/me.py`, `api/sessions.py`, `api/modules.py`
- Admin routes live under `api/admin/`: `modules.py`, `users.py`, `recordings.py`, etc.
- Every route file is included in `app/core/app.py` with an `include_router` call and a `/api/v1` prefix

### Models
- All SQLAlchemy models inherit from `Base` defined in `app/core/database.py`
- Use `Mapped[T]` + `mapped_column()` (SQLAlchemy 2 declarative style)
- Table names: `english_{entity}` (e.g. `english_users`, `english_sessions`)
- UUID primary keys everywhere: `id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)`
- Timestamps always with timezone: `created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())`

### Pydantic request/response bodies
- Inline `BaseModel` subclasses at the top of the route file, near the routes that use them
- Keep response dicts inline (`return { "key": value }`) for simple endpoints; use a `class …Out(BaseModel)` only when the shape is reused

### Migrations
- Alembic with `async` engine in `alembic/env.py`
- File naming: `00N_short_description.py`
- Always wrap DDL in `op.execute()` for custom SQL (enum additions, etc.)
- Enum values added with: `op.execute("ALTER TYPE ... ADD VALUE IF NOT EXISTS '...'")`
- Never drop columns in migrations; only add

### Scoring / XP
- Correct MCQ/fill/match: determined in `sessions.py` → `submit_answer`
- Dictation answers: case-insensitive `.strip().lower()` comparison
- XP per correct answer: `10` — lives in `app/services/xp.py`
- Score % computed on finish: `correct / total * 100`

### Celery tasks
- `app/workers/tasks.py` — single file for all background tasks
- Always import heavy deps inside `async def _run()` to avoid import-time cost
- Pre-compute ALL stats in batched queries before the evaluation loop (no N+1)

---

## Frontend conventions (React / TypeScript)

### File structure
```
src/features/{screen}/
  {Screen}.tsx      # Main component
  {Screen}.css      # Scoped styles (BEM-ish: .scr-foo, .scr-foo-bar)
src/components/ui.tsx   # All shared atoms (icons, AnimatedNumber, Avatar, …)
src/lib/api.ts          # Typed fetch wrapper + all API calls
src/styles/tokens.css   # CSS custom properties (colours, radii, fonts)
```

### Styling
- **No Tailwind, no CSS-in-JS.** Plain CSS with custom properties from `tokens.css`
- Class prefix matches file: `fp-` for FeedbackPanel, `ts-` for TestScreen, `adm-` for admin pages, etc.
- Colour palette uses OKLCH: `var(--accent)` = `oklch(0.55 0.12 158)` (green)
- Typography: Newsreader (serif display), Plus Jakarta Sans (body), JetBrains Mono (mono labels)
- `var(--ink)`, `var(--ink-2)`, `var(--ink-3)` for text hierarchy
- `var(--bg)`, `var(--bg-2)` for background layers
- `var(--line)`, `var(--line-2)` for borders
- `var(--r-sm)`, `var(--r-md)`, `var(--r-lg)` for border radii

### State
- Server state: **TanStack Query** (`useQuery` / `useMutation`)
  - Query keys: lowercase kebab arrays, e.g. `["admin-users"]`, `["library"]`
  - On mutation success: `qc.invalidateQueries({ queryKey: [...] })`
- Local UI state: `useState` + `useReducer` — no global store
- Persistent auth: JWT in `localStorage` via `apps/web/src/lib/auth.ts`

### API client (`src/lib/api.ts`)
- All calls go through the `request<T>()` helper (handles auth headers and JSON)
- Organised as `api.{domain}.{action}`, e.g. `api.admin.users.list`, `api.sessions.finish`
- For `multipart/form-data` requests, pass `noContentType: true` so `request()` doesn't set `Content-Type`

### Components
- Export named functions (no default exports)
- Props typed inline or with a `type {Name}Props` above the component
- Icons live in `ui.tsx` as `{Name}Icon` components accepting `{ size?: number }`
- Shared primitives: `AnimatedNumber`, `Avatar`, `ArrowRightIcon`, etc. — always import from `../../components/ui`

### Question kinds
| Kind | Selection shape | Scoring |
|---|---|---|
| `mcq` | `{ choice: "id" }` | exact match on choice id |
| `fill` | `{ text: "..." }` | case-insensitive trim |
| `match` | `{ pairs: [{left, right}] }` | all pairs must match |
| `listen_choice` | `{ choice: "id" }` | same as mcq |
| `dictation` | `{ text: "..." }` | case-insensitive trim |

---

## Git hygiene

- **No Claude co-author lines** in any commit message
- **No AI traces** — do not mention Claude, Anthropic, or AI tools in commit messages, PR bodies, or code comments
- Excluded via `.gitignore`: `.claude/`, `BUILD_PROMPT.md`, `seed_dewi.py`, `seed_gery_week.py`, `seed_gery_audio.py`
- Commit messages: short imperative phrases, e.g. `add exam corner`, `fix streak counter`, `dictation question type`
- Never amend published commits

---

## Seeding / demo data

- `apps/api/seed.py` — canonical demo seed (runs inside Docker: `docker compose exec api python seed.py`)
- Seeds: `admin@example.com / admin123`, `student@example.com / student123`
- Personal seeds (`seed_dewi.py`, etc.) are gitignored — not for the repo

---

## Feature flags / environment

All configuration is in `docker-compose.yml`. Do not add `.env` files to the repo.

Key variables: `SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `FILES_ROOT`, `CORS_ORIGINS`.

---

## What to avoid

- No `any` casts in TypeScript unless unavoidable (add a `// TODO: type this` comment)
- No raw `fetch()` calls in components — always go through `api.*`
- No `console.log` left in production code
- No inline `style={{ ... }}` for anything that repeats — use a CSS class
- No `useEffect` for derived values — compute them inline or with `useMemo`
- No N+1 queries in backend routes — batch with JOINs or subqueries
