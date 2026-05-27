<p align="center">
  <img src="assets/logo.png" alt="EnglishBuddy" width="180" />
</p>

<h1 align="center">EnglishBuddy</h1>

<p align="center">
  A web-based English practice platform for adult learners. Short daily sessions — vocabulary, grammar, listening — with camera-based integrity monitoring and a local-AI import pipeline that turns PDFs and audio files into practice modules without sending anything to a cloud.
</p>

---

## What it does

**For learners**
- Library shows only the modules assigned to you, grouped by course
- Pick a module and take a 10-minute session — timed, scored, and recorded (with consent)
- Resume interrupted sessions — the app remembers exactly which questions you've answered
- Streak tracking, XP, and a daily-goal ring keep progress visible without being noisy
- Results show per-question breakdowns — what you got right, how long each answer took

**For admins**
- Create **courses** (named groups of modules) and enroll specific learners per course
- Assign individual modules directly to learners when a full course isn't needed
- Set **deadlines** and **max attempts** per module; close a module instantly with a toggle
- Drop a PDF or Word vocabulary list — the app extracts words and auto-generates MCQ and match questions
- Upload audio for listening modules — whisper.cpp transcribes locally, a quantized Qwen LLM drafts comprehension questions
- Review session recordings with a per-question answer overlay, flag anything suspicious, export to CSV

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 · TypeScript · Vite · TanStack Query |
| Backend | Python 3.12 · FastAPI · SQLAlchemy 2 async |
| Database | PostgreSQL 16 + pgvector |
| Queue | Redis 7 · Celery |
| Storage | Local filesystem (S3-compatible in production) |
| AI / ASR | whisper.cpp · llama.cpp (Qwen2-1.5B GGUF) |
| Auth | JWT with rotating refresh tokens |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Compose)
- Git

That's it. No Python, Node, or database installs needed on the host.

---

## Quick start

```bash
git clone https://github.com/ridhaagam/english-buddy.git
cd english-buddy
./init.sh
```

`init.sh` starts Docker Compose, runs migrations, seeds demo data, and opens the browser.

**Default credentials**

| Account | Email | Password |
|---|---|---|
| Admin (owner) | admin@example.com | admin123 |
| Student (learner) | student@example.com | student123 |

The app runs at **http://localhost:5173**.

> **Camera on local network IP (e.g. 192.168.x.x)**  
> Browsers only allow `getUserMedia` on localhost or HTTPS origins. Camera works at `localhost:5173`. On a LAN IP over plain HTTP the browser will block it — this is a browser security rule, not a bug.

---

## Manual setup

```bash
# Build and start everything
docker compose up -d --build

# Stream logs
docker compose logs -f api
```

Vite HMR is active — frontend edits reflect immediately without a rebuild.

To add a user or reset data:

```bash
docker compose exec api python seed.py
```

---

## Folder layout

```
apps/
  api/          FastAPI backend
    app/
      api/      Route handlers (auth, modules, sessions, admin/*)
      models/   SQLAlchemy models
      services/ Business logic (scoring, XP, streaks)
      workers/  Celery tasks (achievements, ASR pipeline)
  web/          React frontend
    src/
      features/ One folder per screen (auth, library, test, results, profile, admin/*)
      components/ui.tsx  Shared atoms
      lib/api.ts         API client
      styles/tokens.css  Design tokens
assets/         Static assets (logo, etc.)
```

---

## Admin import

**Document import (PDF / DOCX)**

1. Admin → Import document
2. Drop a vocabulary PDF or Word file
3. The backend extracts word–definition pairs and generates MCQ + match questions
4. Review, adjust the title and CEFR level, then click Import
5. Publish the module from the Modules page

**Audio import (whisper + Qwen)**

1. Admin → Import audio
2. Upload an MP3, WAV, or M4A file
3. whisper.cpp transcribes locally (no cloud)
4. Qwen2-1.5B drafts comprehension questions from the transcript
5. Review, edit, finalize

The AI models run in the `worker` container. First run downloads weights — this takes a few minutes on a cold start.

---

## System flow diagrams

After starting the app, open **http://localhost:5173/flows.html** in a browser to see:

- **Learner flow** — login → library → exam vs practice → test → results
- **Admin flow** — module creation, course enrollment, recording review
- **Content pipeline** — PDF/audio import through whisper and Qwen to published module

The diagrams are static HTML (no server needed) and live at `apps/web/public/flows.html`.

---

## Design principles

- **No confetti, no mascots.** XP and streaks are present but quiet. The UI is a study journal, not a game.
- **Serif for display, mono for labels.** Newsreader + Plus Jakarta Sans + JetBrains Mono — all from Google Fonts, loaded in the HTML.
- **Single green accent** — `oklch(0.55 0.12 158)`. Nothing competes with it.
- **Privacy first on recordings.** Consent is per-session. The recording chunk is uploaded only after the session finishes. Declining has no impact on scoring.

---

## Environment variables

Set in `docker-compose.yml`. For production, replace these:

| Variable | Default | Notes |
|---|---|---|
| `SECRET_KEY` | `supersecretkey-...` | Must be changed — 32+ random chars |
| `DATABASE_URL` | local Postgres | `postgresql+asyncpg://user:pass@host/db` |
| `REDIS_URL` | local Redis | `redis://host:6379/0` |
| `FILES_ROOT` | `/app/files` | Path for recordings and imports |
| `CORS_ORIGINS` | localhost + LAN | Comma-separated allowed origins |

---

## License

MIT
