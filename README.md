# Comedica

The ultimate comedian training app. Write material, build sets, analyze performances, track growth, and develop your voice — all in one place.

## What It Does

Comedica connects every part of a comedian's workflow:

**Write** → **Perform** → **Analyze** → **Improve** → repeat.

---

## Features

### Writing
- **Joke Editor** — Structured setup/punchline sections, inline comments, strike-through revisions, word replacements
- **Material Lifecycle Tags** — Tag every joke as New, Testing, Proven, or Retired to track where your material stands
- **One-liners** — Quick dedicated editor for short-form jokes
- **Performance History per Joke** — See every show a joke appeared in, laughs per show, avg, best, and trend direction — right inside the joke browser
- **Rewrite Suggestions** — When a joke underperforms (avg < 2 laughs, 2+ shows), get AI-powered (Groq/Llama) or keyword-based rewrite tips

### Set Building
- **Short Sets** (open mic) and **Long Sets** (full performance)
- **Set Intelligence** — Live warnings as you build:
  - Retired material detected
  - Back-to-back jokes covering similar ground (keyword overlap)
  - Too much new material front-loaded
  - Proven jokes available as stronger openers
- **Transitions** — Write bridging material between every joke
- **Text Export** — Download finalized sets as formatted text files
- **Pre-show Run-through Mode** — Fullscreen joke-by-joke view with:
  - Elapsed timer
  - Per-joke notes (saved in localStorage)
  - Keyboard navigation (← → Esc)

### Performance Analysis
- **Audio/Video Upload** — MP3, WAV, M4A, MP4, MOV, WEBM — no file size limit
- **FFmpeg.wasm** — Browser-side video-to-audio conversion (no server upload needed)
- **AssemblyAI transcription** — Full transcript with word-level timestamps
- **Laugh detection** — Silence gaps ≥ 1200ms as laugh proxy, with sentiment boost
- **Venue/Room tagging** — Tag every analysis as Open Mic, Comedy Club, Show/Festival, Corporate, or Other
- **6-dimensional performance profile** replacing a single Good/Average/Bad label:
  - Laughs Per Minute (engagement)
  - Consistency (LPM variance across intervals)
  - Trajectory (second half vs first half)
  - Hit Rate (% of jokes that landed)
  - Peak Moments (3s+ silences)
  - Dead Zones (30s windows with 0 laughs)
- **9 named performance profiles** — Killing It, Strong Set, Peaks and Valleys, Front-Loaded, Slow Burn, Polite Room, Finding Your Footing, Rough Night, Needs Work
- **Per-joke metrics** — Laughs mapped to each segment by time window (not evenly distributed)
- **Topic classification** — Groq (Llama 3.1-8b) classifies each joke against a 10-topic comedy taxonomy
- **Mock fallback** — Works without API keys using simulated data

### Comedian Dashboard
- **Growth chart** — LPM per show, bars colored by profile, chronological
- **Material health snapshot** — Top 3 and bottom 3 performing jokes across all analyses
- **Venue breakdown** — Average LPM by room type
- **Lifecycle summary** — Count of jokes at each stage with link to manage them
- **Current vs previous LPM** — Last 3 shows vs previous 3 shows

### Joke Health & Recommendations
- **Joke Health Score (0-100)** — Composite of avg laughs, trend direction, consistency, and hit rate
- **Auto lifecycle suggestions** — "Consider Proven" if score >70, "Consider retiring" if <30
- **Top Performers / Needs Work / Rising Stars / Untested** — Aggregated across all show data
- **Best Topics** — Which comedy topics land best for you

### Find Your Style
- Upload audio/video or paste transcript
- Detects **18 comedy style tags** (Observational, Self-deprecation, Surrealism, Edgy, Heartfelt, etc.)
- Detects **14 writing elements** (Callbacks, Rule of Three, Misdirection, Contrast, etc.)
- **Adam Bloom Tools** — Seesaw Theory, Balloon Pop, Word Smuggling, Toppers, Trimming opportunities
- Groq-powered AI suggestions + keyword fallback

### Data Management
- Export all jokes, sets, one-liners, and analyses as JSON backup
- Selective export by data type
- Import and restore from backup with preview

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Router |
| Backend | Vercel Serverless (`api/index.js`) |
| Database | Supabase (PostgreSQL + Storage + RLS) |
| Transcription | AssemblyAI |
| AI / LLM | Groq (llama-3.1-8b-instant) + OpenAI (optional) |
| Media processing | FFmpeg.wasm (browser-side) |
| Auth | Supabase Auth (Google, Facebook, Email) |

---

## Getting Started

### Prerequisites
- Node.js v16+
- A [Supabase](https://supabase.com) project (free)
- API keys (see below — all have free tiers)

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies (local dev)
cd server && npm install && cd ..
```

### Environment Variables

**`server/.env`** (local dev backend):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here
PORT=3001
ASSEMBLYAI_API_KEY=your_assemblyai_key   # free at assemblyai.com
GROQ_API_KEY=your_groq_key               # free at console.groq.com
OPENAI_API_KEY=your_openai_key           # optional, paid
```

**`.env`** (root, frontend):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

**Vercel environment variables** (production): same keys set in Vercel dashboard.

### Database Setup

Run the SQL scripts in Supabase SQL Editor (Dashboard → SQL Editor):

```
server/create-analysis-table.sql
server/create-sets-table-complete.sql
server/add-user-id-migration.sql
server/add-performance-columns.sql
server/add-venue-type-column.sql
server/add-joke-lifecycle-column.sql
```

### Run Locally

```bash
# Terminal 1 — backend
cd server && npm start

# Terminal 2 — frontend
npm run dev
```

Open `http://localhost:5173`

### Deploy to Vercel

```bash
npm run build
vercel --prod
```

Set all environment variables in the Vercel dashboard. The `api/index.js` serverless function handles all backend routes automatically.

---

## API Reference

### Jokes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jokes` | List all jokes |
| POST | `/api/jokes` | Create joke |
| GET | `/api/jokes/:id` | Get joke |
| PUT | `/api/jokes/:id` | Update joke (includes lifecycle) |
| DELETE | `/api/jokes/:id` | Delete joke |
| GET | `/api/jokes/:id/performance` | Performance history across shows |
| POST | `/api/jokes/:id/rewrite-suggestions` | AI rewrite tips for underperforming jokes |

### Sets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sets` | List all sets |
| POST | `/api/sets` | Create set |
| GET | `/api/sets/:id` | Get set |
| PUT | `/api/sets/:id` | Update set |
| DELETE | `/api/sets/:id` | Delete set |

### Analysis
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/analysis/analyze` | Start analysis job |
| GET | `/api/analysis/job/:jobId` | Poll job + compute metrics |
| GET | `/api/analysis` | List all analyses |
| GET | `/api/analysis/:id` | Get analysis |
| DELETE | `/api/analysis/:id` | Delete analysis |

### Comedy Style
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/comedy-style/analyze` | Start style analysis from audio |
| GET | `/api/comedy-style/job/:jobId` | Poll style job |
| POST | `/api/comedy-style/analyze-text` | Analyze pasted transcript directly |

---

## Database Schema

### `jokes`
`id, header, sections (JSONB), is_draft, is_one_liner, lifecycle, comments (JSONB), strikethrough_texts (JSONB), replacements (JSONB), user_id, created_at, updated_at`

### `sets`
`id, header, type, jokes (JSONB), joke_details (JSONB), transitions (JSONB), is_draft, user_id, created_at, updated_at`

### `analysis_results`
`id, set_id, set_name, venue_type, audio_file_name, laughs_per_minute, avg_laughs_per_joke, category, timeline (JSONB), joke_metrics (JSONB), extracted_jokes (JSONB), topic_summaries (JSONB), performance_profile, performance_dimensions (JSONB), transcript_text, speaking_pace, word_count, silence_count, effective_duration, full_duration, excluded_start, excluded_end, user_id, created_at`

---

## Project Structure

```
comedica/
├── src/
│   ├── components/
│   │   ├── Homepage.jsx            # Navigation hub
│   │   ├── Dashboard.jsx           # Comedian growth dashboard
│   │   ├── JokeWriting.jsx         # Joke section router
│   │   ├── NewJokeEditor.jsx       # Joke editor (lifecycle tags)
│   │   ├── OldJokesList.jsx        # Joke browser + performance history + rewrite tips
│   │   ├── OneLinersEditor.jsx
│   │   ├── OneLinersList.jsx
│   │   ├── Set.jsx                 # Set section router
│   │   ├── ShortSetEditor.jsx      # Set builder (+ set intelligence warnings)
│   │   ├── LongSetEditor.jsx
│   │   ├── SavedSetsList.jsx       # Set list + pre-show run-through mode
│   │   ├── Analysis.jsx            # Performance analysis (+ venue tagging)
│   │   ├── ComedyStyle.jsx         # Find Your Style
│   │   ├── JokeRecommendations.jsx # Recommendations + joke health scores
│   │   └── DataManager.jsx
│   ├── services/
│   │   ├── api.js                  # Jokes API (+ performance + rewrite suggestions)
│   │   ├── setsAPI.js
│   │   └── analysisAPI.js
│   ├── context/AuthContext.jsx
│   ├── lib/supabase.js
│   └── App.jsx
├── api/
│   └── index.js                    # All Vercel serverless routes (~2500 lines)
├── server/
│   ├── audioAnalyzer.js            # Local dev audio processing
│   ├── server-supabase.js          # Local dev Express server
│   └── *.sql                       # Database migrations
├── comedyTaxonomy.js               # 10-topic comedy taxonomy for Groq
└── test-analysis-models.mjs        # 27 unit tests for analysis models
```

---

## How Analysis Works

1. User uploads audio/video → FFmpeg.wasm converts video → Supabase Storage
2. Backend requests signed URL → sends to AssemblyAI
3. AssemblyAI returns transcript with word timestamps + auto-chapters
4. Backend detects laughs: silence gaps ≥ 1200ms between words, boosted by positive sentiment
5. Transcript segmented into jokes: largest N gaps as boundaries (capped to ~1 per minute)
6. Each segment classified by Groq (Llama) against the comedy taxonomy
7. Laugh events time-mapped to joke segments
8. 6 performance dimensions computed → 1 of 9 named profiles derived
9. Results saved to `analysis_results` table + returned to frontend

---

## Running Tests

```bash
node test-analysis-models.mjs
```

27 tests covering laugh detection, category thresholds, joke segmentation, style tags, writing elements, and speaking pace.
