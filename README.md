# Comedica

A web application for stand-up comedians to organize, edit, and manage versions of jokes and sets with feedback. Also integrates AI to help with editing jokes.

## Features

### ✅ Joke Writing (Implemented)
- **Write New Jokes**: Create jokes with structured sections (Context and Punchline)
- **Edit Existing Jokes**: Continue working on saved jokes
- **Line-by-Line Commenting**: Click on any line to add comments and feedback
- **Strike-Through & Replacement**: Mark lines for revision and add replacement text
- **Draft & Finalize**: Save jokes as drafts or finalize them
- **Version Control**: All edits, comments, and revisions are saved with timestamps

### 🚧 Set Management (Coming Soon)
- Organize and work on your stand-up sets

### 🚧 AI Analysis (Coming Soon)
- Analyze your audio and video performances
- Track metrics like Laughs Per Joke, Engagement Per Joke, etc. 

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

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

### Data Storage

All jokes are saved to your browser's localStorage, including:
- Joke content (header, context, punchline)
- Draft/final status
- Comments per line
- Strike-through markings
- Replacement texts
- Timestamps (created and updated)

## Project Structure

```
joke-writing-app/
├── src/
│   ├── components/
│   │   ├── Homepage.jsx         # Main homepage with navigation options
│   │   ├── JokeWriting.jsx      # Joke writing section with routing
│   │   ├── NewJokeEditor.jsx    # Editor for creating/editing jokes
│   │   ├── OldJokesList.jsx     # List and detail view of saved jokes
│   │   └── Set.jsx              # Set management section (coming soon)
│   ├── App.jsx                  # Main app component with routing
│   ├── App.css                  # Global app styles
│   ├── main.jsx                 # Entry point
│   └── index.css                # Base styles
├── index.html
├── package.json
└── vite.config.js
```

## Development Status

### ✅ Completed
- Homepage with navigation
- Joke Writing section with two main options
- New joke editor with Context and Punchline sections
- Line-by-line commenting system
- Strike-through and replacement functionality
- Draft and finalize save options
- Old jokes list and detail view
- Edit existing jokes functionality
- LocalStorage persistence

### 🚧 In Progress / Planned
- Set Management features
- AI integration for joke editing assistance
- Performance analysis tools
- Export/import functionality
- Cloud sync capabilities
