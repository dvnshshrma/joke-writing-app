# Comedica

A web application for stand-up comedians to organize, edit, and manage versions of jokes and sets with feedback. Analyze your performances and track your progress with detailed metrics.

## Features

### ✅ Joke Writing (Implemented)
- **Write New Jokes**: Create jokes with structured sections (Context and Punchline)
- **One Liners**: Quick one-liner jokes with dedicated editor
- **Edit Existing Jokes**: Continue working on saved jokes
- **Line-by-Line Commenting**: Click on any line to add comments and feedback
- **Strike-Through & Replacement**: Mark lines for revision and add replacement text
- **Draft & Finalize**: Save jokes as drafts or finalize them
- **Version Control**: All edits, comments, and revisions are saved with timestamps

### ✅ Set Management (Implemented)
- **Short Sets**: Create sets for open mics by selecting and ordering jokes
- **Long Sets**: Create longer sets for full performances
- **Set Header**: Define the bigger idea behind your set
- **Joke Selection**: Choose from all your saved jokes (headers only in dropdown)
- **Sequential Ordering**: Arrange jokes in your performance order
- **Transitions**: Add transitions between jokes in your set
- **Draft & Finalize**: Save sets as drafts or finalize them
- **Text Export**: Download finalized sets as formatted text files
- **Joke Preview**: Hover/tap on jokes in sets to see full joke content
- **Saved Sets**: View, edit, and manage all your saved sets

### ✅ Performance Analysis (Implemented)
- **Audio Upload**: Upload audio recordings of your performances
- **Real AI Analysis**: Uses AssemblyAI for accurate speech and laugh detection
- **Mock Analysis Fallback**: Works without API key using simulated data
- **Laughs per Minute**: Track overall audience engagement
- **Laughs per Topic**: Topic-level bars with laughs summed across jokes
- **Timeline Graph**: Visual timeline showing laughs throughout your set
- **Category Classification**: Automatically categorizes sets as "Good", "Average", or "Bad"
- **Exclude Applause**: Remove start and end applause for more accurate metrics
- **View Old Analyses**: Browse and review all your previous analyses
- **Tab-Based Interface**: Easy navigation between new analysis and saved analyses

### ✅ Advanced Analytics (Implemented)
- **Speaking Pace**: Words per minute analysis
- **Word Count**: Total words spoken in your set
- **Laugh Moments**: Detected pauses where audience laughed
- **Performance Tips**: AI-generated suggestions for improvement
- **Top Performing Jokes**: Ranking of your best jokes
- **Set Duration Tracking**: Analyzed vs total time metrics

### ✅ Video Analysis Support (Implemented)
- **Video Upload**: Upload MP4, MOV, WEBM video recordings
- **High-Quality Audio Extraction**: Professional FFmpeg.wasm conversion to MP3 (192 kbps, 44.1kHz, stereo)
- **No File Size Limit**: FFmpeg.wasm handles large video files efficiently (no 100MB/1GB restrictions)
- **User-Controlled Conversion**: Toggle to convert videos to audio before analysis
- **Progress Tracking**: Real-time conversion progress with visual indicators
- **Same Metrics**: All audio analysis features work with video files

### ✅ Performance Trends (Implemented)
- **Progress Tracking**: See improvement over time (LPM change since first analysis)
- **Trend Chart**: Interactive graph showing LPM across all performances
- **Category Breakdown**: Visual count of Good/Average/Bad sets
- **Best/Worst Performance**: Highlight your peak and low points
- **Performance History**: Complete list of all analyzed sets with metrics
- **Hover Details**: Interactive tooltips on trend chart for detailed data
- **Exclude Sets**: Toggle sets on/off from trend analysis with checkboxes
- **Bulk Actions**: Include All / Exclude All buttons for quick selection
- **Sorting**: Sort performance history by Date, LPM, Name, or Category (ascending/descending)

### ✅ Interval Comparison (Implemented)
- **Interval Analysis**: Compare performance across time segments (1, 2, 3, or 5 minute intervals)
- **Best/Worst Intervals**: Identify which parts of your set work best
- **Momentum Tracking**: See how audience engagement changes between intervals
- **Visual Bar Chart**: Color-coded bars showing above/below average performance

### ✅ AI Topic Modeling (Implemented)
- **Taxonomy-Based**: Fixed comedy taxonomy (10 broad topics + subtopics), Groq (Llama) classifies each joke
- **Joke Extraction**: Automatically extracts jokes from transcript using silence gaps
- **Topic Summaries**: Laughs and joke counts aggregated per topic for analysis
- **Normalized Aggregation**: Merges duplicate topic labels caused by case/whitespace differences
- **Smart Headers**: Subtopic-based or keyword-based when Groq unavailable
- **Minimum Joke Detection**: Ensures at least 4 jokes for a 7-minute set
- **Comedy Categories**: Fallback classification into 15+ comedy topic categories

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

#### 1. Install Frontend Dependencies

```bash
npm install
```

#### 2. Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

#### 3. Set Up Supabase Database

1. Create a free account at https://supabase.com/dashboard
2. Create a new project
3. Get your Project URL and anon key from Settings > API
4. Create database tables (see `SETUP.md` for SQL scripts)

#### 4. Configure Environment

Create `server/.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here
PORT=3001

# Optional: For real AI audio analysis (get free key at https://www.assemblyai.com)
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here

# Topic modeling (taxonomy-based – optional, free tier):
GROQ_API_KEY=your_groq_api_key_here      # Get free at console.groq.com/keys

# Optional: For OpenAI-powered "Find Your Style" chat (paid)
OPENAI_API_KEY=your_openai_api_key_here
```

Create `.env` in root directory (for frontend):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> **Note**: 
> - Without an AssemblyAI API key, the app uses simulated analysis data. The free tier includes 100 hours of audio analysis.
> - **Topic modeling** uses a fixed comedy taxonomy and Groq (Llama) to classify jokes into topics. Get a free key at [console.groq.com](https://console.groq.com/keys). Without it, keyword-based topic extraction is used.
> - Without an OpenAI API key, "Find Your Style" uses keyword-based style detection. Adding the key enables AI-powered zero-shot classification.

#### 5. Start the Backend Server

```bash
cd server
npm start
```

The server will run on `http://localhost:3001`

#### 6. Start the Frontend Development Server

In a new terminal:

```bash
npm run dev
```

#### 7. Open Your Browser

Navigate to `http://localhost:5173`

### Database

- The backend uses **Supabase** (PostgreSQL) for cloud storage
- Data persists across app restarts and devices
- Free tier includes 500MB database and 2GB bandwidth
- See `SETUP.md` for detailed setup instructions

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Joke Writing Features

### Writing a New Joke

1. Navigate to **Joke Writing** from the homepage
2. Click **"Write a new joke idea"**
3. Fill in the joke details:
   - **Header/Title**: Give your joke a name
   - **Context**: Write the setup/context (displayed in blue)
   - **Punchline**: Write the punchline (displayed in red/pink)

### Editing and Feedback Features

#### Line-by-Line Interaction
- As you type in the textareas, your text appears as individual lines below
- **Click any line** to open the comments panel for that specific line
- Each line can have multiple comments and feedback

#### Strike-Through and Replacement
- Use the strike-through button (⊘) on any line to mark it for revision
- Struck-through text will be grayed out with a line through it
- Add replacement text in the replacement input field that appears
- Click the button again (✓) to remove the strike-through

#### Comments and Feedback
- Click on any line to view all comments for that line
- Add new comments by typing in the comment input and pressing Enter
- All comments include timestamps for tracking feedback over time
- Comments are preserved when you save the joke

#### Saving Options
- **Save as Draft**: Keep working on the joke later
- **Finalise the Joke**: Mark the joke as complete
- Both options save all your work: text, comments, strike-throughs, and replacements

### Working on Old Jokes

1. Click **"Work on an old joke"** from the Joke Writing section
2. View all your saved jokes in the sidebar
3. Click any joke to see its details:
   - Header, Context, and Punchline
   - Draft or Final status
   - Creation and last updated dates
4. Click **"Edit Joke"** to continue editing with all previous comments and revisions intact
5. Delete jokes using the × button on any joke tab

### One Liners

1. Click **"One Liners"** from the Joke Writing section
2. Write quick one-liner jokes in a simple text editor
3. Save as draft or finalize
4. View all saved one-liners with filtering options (All, Drafts, Final)
5. Edit or delete existing one-liners

### Performance Analysis

1. Navigate to **"Analyse your sets"** from the homepage
2. Choose between **"New Analysis"** or **"View Old Analyses"** tabs
3. For new analysis:
   - Enter a set name for this analysis
   - Upload an audio or video file (MP3, WAV, M4A, OGG, MP4, MOV, WEBM)
   - **Video files**: Use the conversion toggle for high-quality audio extraction (FFmpeg.wasm)
   - **No file size limit**: Large videos are handled efficiently
   - Optionally exclude start and end applause for more accurate metrics
   - Click "Analyze Set" to process
4. View results:
   - Category (Good/Average/Bad)
   - Laughs per minute
   - Average laughs per joke
   - Timeline graph showing laughs throughout the set
   - Per-topic metrics with visual bars (laughs summed by topic)
   - Advanced insights and analytics
5. View old analyses:
   - Browse all previous analyses
   - Click any analysis to see summary
   - Click "View Full Analysis" to see complete results
   - Re-analyze any previous analysis
   - Delete analyses you no longer need

### Find Your Style

1. Navigate to **"Find your Style"** from the homepage
2. Choose input method:
   - **Audio/Video Upload**: Upload your comedy set recording
     - Toggle "Convert video to audio" for high-quality MP3 conversion
     - No file size limit - handles large files efficiently
     - Progress bar shows conversion status
   - **Paste Transcript**: Directly paste your comedy set transcript
3. Click **"Analyze My Style"** to process
4. View comprehensive results:
   - **Style Tags**: Your comedy styles with confidence scores
   - **Writing Elements**: Detected writing techniques and percentages
   - **Adam Bloom Tools**: Analysis of specific comedy writing tools
   - **Trimming Suggestions**: Rule-based suggestions plus AI suggestions (`original -> suggestion` with reason)
   - **Summary**: AI-generated overview of your comedy style

### Current Analysis Algorithms

#### Topic Modeling + Laugh Aggregation
- Transcript is segmented into candidate joke chunks (time/structure heuristics).
- Each chunk is classified into `topic` + `subtopic` using Groq taxonomy prompts (batched), with keyword fallback when Groq is unavailable.
- Laugh timeline is computed from transcript timing and pause-derived signals.
- Laughs are distributed across extracted jokes for display metrics.
- Topic totals are then aggregated from joke metrics and normalized by topic key (`trim + lowercase`) so repeated labels collapse into one topic row.

#### Find Your Style Trimming
- Rule-based trimming detects filler words and redundant qualifier patterns.
- Optional Groq pass (`llama-3.1-8b-instant`) analyzes up to ~2500 chars and returns 5-8 JSON suggestions:
  - `original`
  - `suggestion`
  - `reason`
- If Groq fails or no key is set, trimming gracefully falls back to rule-based only.
- UI renders both rule-based opportunities and AI suggestions.

### Data Storage

All jokes, sets, and analyses are saved in **Supabase** (PostgreSQL cloud database), ensuring your data persists across sessions and devices:
- Joke content (header, sections with contexts and punchlines)
- One-liners
- Draft/final status
- Comments per line
- Strike-through markings
- Replacement texts
- Sets with selected jokes, transitions, and ordering
- Analysis results with metrics, timelines, and categories
- Timestamps (created and updated)

See `SETUP.md` for database setup instructions.

## Project Structure

```
joke-writing-app/
├── src/
│   ├── components/
│   │   ├── Homepage.jsx         # Main homepage with navigation options
│   │   ├── JokeWriting.jsx      # Joke writing section with routing
│   │   ├── NewJokeEditor.jsx    # Editor for creating/editing jokes
│   │   ├── OldJokesList.jsx     # List and detail view of saved jokes
│   │   ├── OneLinersEditor.jsx  # Editor for one-liner jokes
│   │   ├── OneLinersList.jsx    # List and view of saved one-liners
│   │   ├── Set.jsx              # Set management section
│   │   ├── ShortSetEditor.jsx   # Editor for short sets (open mics)
│   │   ├── LongSetEditor.jsx    # Editor for long sets
│   │   ├── SavedSetsList.jsx    # List and management of saved sets
│   │   ├── Analysis.jsx         # Performance analysis section
│   │   ├── ComedyStyle.jsx      # Find Your Style analysis component
│   │   ├── JokeRecommendations.jsx  # AI-powered joke recommendations
│   │   ├── DataManager.jsx      # Export/import data manager
│   ├── services/
│   │   ├── api.js               # API service for jokes
│   │   ├── setsAPI.js           # API service for sets
│   │   └── analysisAPI.js       # API service for analyses
│   ├── App.jsx                  # Main app component with routing
│   ├── App.css                  # Global app styles
│   ├── main.jsx                 # Entry point
│   └── index.css                # Base styles
├── server/
│   ├── server-supabase.js       # Express backend server
│   ├── api/
│   │   └── index.js             # Legacy API entry
│   ├── database-supabase.js     # Supabase database connection
│   ├── create-analysis-table.sql # SQL script for analysis table
│   └── create-sets-table.sql    # SQL script for sets table
├── api/
│   └── index.js                 # Primary Vercel serverless API (analysis + comedy style)
├── index.html
├── package.json
└── vite.config.js
```

## Development Status

### ✅ Completed
- Homepage with navigation (Joke, Set, Analyse, Recommendations, Export/Import)
- Joke Writing section with three options:
  - Write new jokes
  - Work on old jokes
  - One Liners
- New joke editor with multiple Context and Punchline sections
- Line-by-line commenting system
- Strike-through and replacement functionality
- Draft and finalize save options
- Old jokes list and detail view
- Edit existing jokes functionality
- One Liners editor and list
- Short Set editor for open mics
- Long Set editor for full performances
- Transitions between jokes
- Set draft and finalize options
- Text file export for finalized sets
- Saved sets list with edit/delete functionality
- Performance Analysis:
  - Audio upload and analysis
  - Laughs per minute and topic-aggregated metrics
  - Timeline graph visualization
  - Category classification (Good/Average/Bad)
  - Exclude applause feature
  - View old analyses
  - Tab-based interface
- Cloud database persistence (Supabase)
- RESTful API backend
- Mobile responsive design
- Export/Import data manager
- AI-powered joke recommendations
- Performance trends with exclusion and sorting
- Interval-by-interval comparison
- **Full Data Export**: Export jokes, one-liners, sets, and analyses to JSON
- **Selective Export**: Choose which data types to include
- **Easy Import**: Upload backup files to restore data
- **Preview Before Import**: See what's in a backup file before importing
- **Timestamped Backups**: Auto-named files with export date

### ✅ AI Joke Recommendations (Implemented)
- **Top Performers**: See which jokes get the most laughs
- **Needs Work**: Identify jokes that aren't landing
- **Rising Stars**: Track jokes that are improving over time
- **Untested Material**: See which jokes haven't been performed yet
- **Best Topics**: Discover which comedy topics work best for you
- **Key Insights**: AI-generated actionable advice
- **Set Builder**: Pre-built set recommendations (Power Set, Test Run Set)
- **Set Building Tips**: Expert advice on structuring your set

### ✅ User Authentication (Implemented)
- **Google Sign-In**: Quick login with Google account
- **Facebook Sign-In**: Login with Facebook account
- **Email/Password**: Traditional email registration and login
- **Multi-User Support**: Each user has their own private data
- **Row Level Security**: Data isolation enforced at database level
- **Session Management**: Persistent login across sessions

### 🚧 In Progress / Planned
- Collaboration features
- Social sharing of sets

## API Endpoints

The backend provides REST API endpoints:

### Jokes
- `GET /api/jokes` - Get all jokes
- `GET /api/jokes/:id` - Get a specific joke
- `POST /api/jokes` - Create a new joke
- `PUT /api/jokes/:id` - Update an existing joke
- `DELETE /api/jokes/:id` - Delete a joke

### Sets
- `GET /api/sets` - Get all sets
- `GET /api/sets/:id` - Get a specific set
- `POST /api/sets` - Create a new set
- `PUT /api/sets/:id` - Update an existing set
- `DELETE /api/sets/:id` - Delete a set

### Analysis
- `POST /api/analysis/analyze` - Start an analysis job (AssemblyAI flow via uploaded media)
- `GET /api/analysis/job/:jobId` - Poll analysis job status and fetch computed metrics
- `GET /api/analysis` - Get all analyses
- `GET /api/analysis/:id` - Get a specific analysis
- `DELETE /api/analysis/:id` - Delete an analysis

### Comedy Style
- `POST /api/comedy-style/analyze` - Start style analysis from uploaded media
- `GET /api/comedy-style/job/:jobId` - Poll style analysis job status and fetch style results
- `POST /api/comedy-style/analyze-text` - Analyze pasted transcript text directly

## Database Tables

The application uses the following Supabase tables:

1. **jokes** - Stores all jokes with sections, comments, and revisions
2. **sets** - Stores sets with selected jokes, transitions, and metadata
3. **analysis_results** - Stores performance analysis results with metrics and timelines

See `server/create-analysis-table.sql` and `server/create-sets-table.sql` for table schemas.

