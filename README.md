# Comedica

A web application for stand-up comedians to organize, edit, and manage versions of jokes and sets with feedback. Also integrates AI to help with editing jokes.

## Features

- **Joke Writing**: Write, edit, and manage your jokes with version control and feeback
- **Set Management**: Organize and work on your stand-up sets
- **Analyse Your Sets**: Put your audios and videos in, and AI will analyse your jokes and sets based on metrics like Laughs Per Joke, Engagement Per Joke etc. 

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

## Project Structure

```
joke-writing-app/
├── src/
│   ├── components/
│   │   ├── Homepage.jsx      # Main homepage with navigation
│   │   ├── JokeWriting.jsx   # Joke writing section
│   │   └── Set.jsx           # Set management section
│   ├── App.jsx               # Main app component with routing
│   └── main.jsx              # Entry point
├── index.html
└── package.json
```

## Next Steps

- Implement joke writing functionality
- Add version control for jokes
- Implement set management features
- Add feedback system
- Integrate AI for joke editing assistance
