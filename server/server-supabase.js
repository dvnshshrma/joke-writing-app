import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { supabase, setupDatabase } from './database-supabase.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on startup
(async () => {
  try {
    await setupDatabase();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
})();

// Get all jokes
app.get('/api/jokes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jokes')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    // Convert Supabase format to API format
    const parsedJokes = (data || []).map(joke => ({
      id: joke.id,
      header: joke.header,
      sections: joke.sections || [],
      isDraft: joke.is_draft !== false,
      comments: joke.comments || {},
      strikethroughTexts: joke.strikethrough_texts || [],
      replacements: joke.replacements || {},
      createdAt: joke.created_at,
      updatedAt: joke.updated_at
    }));
    
    res.json(parsedJokes);
  } catch (error) {
    console.error('Error fetching jokes:', error);
    res.status(500).json({ error: 'Failed to fetch jokes' });
  }
});

// Get a single joke by ID
app.get('/api/jokes/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('jokes')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Joke not found' });
      }
      throw error;
    }
    
    const parsedJoke = {
      id: data.id,
      header: data.header,
      sections: data.sections || [],
      isDraft: data.is_draft !== false,
      comments: data.comments || {},
      strikethroughTexts: data.strikethrough_texts || [],
      replacements: data.replacements || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    res.json(parsedJoke);
  } catch (error) {
    console.error('Error fetching joke:', error);
    res.status(500).json({ error: 'Failed to fetch joke' });
  }
});

// Create a new joke
app.post('/api/jokes', async (req, res) => {
  try {
    const {
      id,
      header,
      sections,
      isDraft,
      comments,
      strikethroughTexts,
      replacements,
      createdAt,
      updatedAt
    } = req.body;
    
    const jokeDoc = {
      id,
      header: header || '',
      sections: sections || [],
      is_draft: isDraft !== false,
      comments: comments || {},
      strikethrough_texts: strikethroughTexts || [],
      replacements: replacements || {},
      created_at: createdAt || new Date().toISOString(),
      updated_at: updatedAt || new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('jokes')
      .insert([jokeDoc]);
    
    if (error) throw error;
    
    res.status(201).json({ id, message: 'Joke created successfully' });
  } catch (error) {
    console.error('Error creating joke:', error);
    res.status(500).json({ error: 'Failed to create joke' });
  }
});

// Update an existing joke
app.put('/api/jokes/:id', async (req, res) => {
  try {
    const {
      header,
      sections,
      isDraft,
      comments,
      strikethroughTexts,
      replacements
    } = req.body;
    
    const updateDoc = {
      header: header || '',
      sections: sections || [],
      is_draft: isDraft !== false,
      comments: comments || {},
      strikethrough_texts: strikethroughTexts || [],
      replacements: replacements || {},
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('jokes')
      .update(updateDoc)
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.json({ message: 'Joke updated successfully' });
  } catch (error) {
    console.error('Error updating joke:', error);
    res.status(500).json({ error: 'Failed to update joke' });
  }
});

// Delete a joke
app.delete('/api/jokes/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('jokes')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.json({ message: 'Joke deleted successfully' });
  } catch (error) {
    console.error('Error deleting joke:', error);
    res.status(500).json({ error: 'Failed to delete joke' });
  }
});

// ========== SETS API ==========

// Get all sets
app.get('/api/sets', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sets')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    const parsedSets = (data || []).map(set => ({
      id: set.id,
      header: set.header,
      type: set.type,
      jokes: set.jokes || [],
      jokeDetails: set.joke_details || [],
      transitions: set.transitions || [],
      isDraft: set.is_draft !== undefined ? set.is_draft : true,
      createdAt: set.created_at,
      updatedAt: set.updated_at
    }));
    
    res.json(parsedSets);
  } catch (error) {
    console.error('Error fetching sets:', error);
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

// Get a single set by ID
app.get('/api/sets/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sets')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Set not found' });
      }
      throw error;
    }
    
    const parsedSet = {
      id: data.id,
      header: data.header,
      type: data.type,
      jokes: data.jokes || [],
      jokeDetails: data.joke_details || [],
      transitions: data.transitions || [],
      isDraft: data.is_draft !== undefined ? data.is_draft : true,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    res.json(parsedSet);
  } catch (error) {
    console.error('Error fetching set:', error);
    res.status(500).json({ error: 'Failed to fetch set' });
  }
});

// Create a new set
app.post('/api/sets', async (req, res) => {
  try {
    const {
      id,
      header,
      type,
      jokes,
      jokeDetails,
      transitions,
      isDraft,
      createdAt,
      updatedAt
    } = req.body;
    
    const setDoc = {
      id,
      header: header || '',
      type: type || 'short',
      jokes: jokes || [],
      joke_details: jokeDetails || [],
      transitions: transitions || [],
      is_draft: isDraft !== undefined ? isDraft : true,
      created_at: createdAt || new Date().toISOString(),
      updated_at: updatedAt || new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('sets')
      .insert([setDoc]);
    
    if (error) {
      console.error('Supabase error creating set:', error);
      throw error;
    }
    
    res.status(201).json({ id, message: 'Set created successfully' });
  } catch (error) {
    console.error('Error creating set:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    const errorMessage = error.message || error.details || 'Failed to create set';
    const errorCode = error.code || '';
    
    // Check if it's a column error
    if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
      res.status(500).json({ 
        error: `Database column missing: ${errorMessage}. Please run the SQL migration to add the missing column.`,
        code: errorCode,
        details: errorMessage
      });
    } 
    // Check if table doesn't exist
    else if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
      res.status(500).json({ 
        error: `Table 'sets' does not exist. Please run the SQL script to create the sets table.`,
        code: errorCode,
        details: errorMessage
      });
    }
    // Check for RLS (Row Level Security) issues
    else if (errorCode === '42501' || errorMessage.includes('permission denied') || errorMessage.includes('policy')) {
      res.status(500).json({ 
        error: `Permission denied. Please check Row Level Security policies on the sets table.`,
        code: errorCode,
        details: errorMessage
      });
    }
    else {
      res.status(500).json({ 
        error: errorMessage,
        code: errorCode,
        details: error.details || errorMessage
      });
    }
  }
});

// Update an existing set
app.put('/api/sets/:id', async (req, res) => {
  try {
    const {
      header,
      type,
      jokes,
      jokeDetails,
      transitions,
      isDraft
    } = req.body;
    
    const updateDoc = {
      header: header || '',
      type: type || 'short',
      jokes: jokes || [],
      joke_details: jokeDetails || [],
      transitions: transitions || [],
      updated_at: new Date().toISOString()
    };
    
    if (isDraft !== undefined) {
      updateDoc.is_draft = isDraft;
    }
    
    const { error } = await supabase
      .from('sets')
      .update(updateDoc)
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.json({ message: 'Set updated successfully' });
  } catch (error) {
    console.error('Error updating set:', error);
    res.status(500).json({ error: 'Failed to update set' });
  }
});

// Delete a set
app.delete('/api/sets/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('sets')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    res.json({ message: 'Set deleted successfully' });
  } catch (error) {
    console.error('Error deleting set:', error);
    res.status(500).json({ error: 'Failed to delete set' });
  }
});

// ========== ANALYSIS API ==========

// Mock audio analysis function
// TODO: Replace with real AI audio analysis (e.g., AssemblyAI, Deepgram, or custom ML model)
async function analyzeAudio(audioFilePath, setData, audioDurationSeconds = null, excludeStartSeconds = 0, excludeEndSeconds = 0) {
  // Simulate analysis delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Handle both camelCase (from API) and snake_case (from database) formats
  const jokeDetails = setData.joke_details || setData.jokeDetails || [];
  const jokes = setData.jokes || [];
  const numJokes = jokeDetails.length || jokes.length || 5;
  // Use actual audio duration if provided, otherwise default to 300 seconds (5 minutes)
  const fullDuration = audioDurationSeconds || 300;
  
  // Calculate effective duration after excluding start and end
  const effectiveDuration = Math.max(0, fullDuration - excludeStartSeconds - excludeEndSeconds);
  const analysisStartTime = excludeStartSeconds;
  const analysisEndTime = fullDuration - excludeEndSeconds;
  
  // Generate mock timeline data (laughs over time) - only for the analyzed portion
  const timeline = [];
  for (let i = analysisStartTime; i <= analysisEndTime; i += 10) {
    const laughs = Math.floor(Math.random() * 5); // 0-4 laughs per 10 seconds
    timeline.push({ time: i, laughs });
  }
  
  // Adjust timeline times to be relative to the start of analysis (for display)
  const adjustedTimeline = timeline.map(point => ({
    time: point.time - analysisStartTime,
    laughs: point.laughs
  }));
  
  // Generate mock joke metrics with headers
  const jokeMetrics = [];
  let totalLaughs = 0;
  for (let i = 0; i < numJokes; i++) {
    const laughs = Math.floor(Math.random() * 15) + 2; // 2-16 laughs per joke
    totalLaughs += laughs;
    
    // Get joke header from jokeDetails array (contains full joke objects with header)
    let jokeHeader = `Joke ${i + 1}`; // Default fallback
    if (jokeDetails && jokeDetails[i]) {
      jokeHeader = jokeDetails[i].header || jokeHeader;
    } else if (jokes && jokes[i]) {
      // If jokes array contains objects with headers
      if (typeof jokes[i] === 'object' && jokes[i].header) {
        jokeHeader = jokes[i].header;
      }
    }
    
    jokeMetrics.push({ 
      jokeIndex: i, 
      laughs,
      header: jokeHeader
    });
  }
  
  const avgLaughsPerJoke = totalLaughs / numJokes;
  // Calculate laughs per minute based on effective duration (excluding applause)
  const laughsPerMinute = effectiveDuration > 0 ? (totalLaughs / effectiveDuration) * 60 : 0;
  
  // Categorize based on metrics
  let category = 'average';
  if (laughsPerMinute >= 8 && avgLaughsPerJoke >= 8) {
    category = 'good';
  } else if (laughsPerMinute < 4 || avgLaughsPerJoke < 4) {
    category = 'bad';
  }
  
  return {
    laughsPerMinute: parseFloat(laughsPerMinute.toFixed(2)),
    avgLaughsPerJoke: parseFloat(avgLaughsPerJoke.toFixed(2)),
    category,
    timeline: adjustedTimeline, // Use adjusted timeline (relative to analysis start)
    originalTimeline: timeline, // Keep original timeline with absolute times
    jokeMetrics,
    maxLaughs: Math.max(...jokeMetrics.map(m => m.laughs), 1),
    excludedStart: excludeStartSeconds,
    excludedEnd: excludeEndSeconds,
    effectiveDuration: effectiveDuration,
    fullDuration: fullDuration
  };
}

// Analyze audio file
app.post('/api/analysis/analyze', (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 100MB.' });
      }
      if (err.message === 'Only audio files are allowed') {
        return res.status(400).json({ error: 'Only audio files are allowed (MP3, WAV, M4A, OGG, etc.)' });
      }
      return res.status(400).json({ error: 'File upload error', details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { setId, setName, audioDuration } = req.body;
    
    if (!setId) {
      return res.status(400).json({ error: 'Set ID is required' });
    }

    // Parse audio duration if provided
    const audioDurationSeconds = audioDuration ? parseInt(audioDuration, 10) : null;

    // Get set data
    const { data: setData, error: setError } = await supabase
      .from('sets')
      .select('*')
      .eq('id', setId)
      .single();

    if (setError) {
      console.error('Error fetching set:', setError);
      return res.status(404).json({ error: 'Set not found', details: setError.message });
    }

    if (!setData) {
      return res.status(404).json({ error: 'Set not found' });
    }

    // Analyze audio (mock for now)
    const analysis = await analyzeAudio(req.file.path, setData, audioDurationSeconds, excludeStartSeconds, excludeEndSeconds);

    // Save analysis to database
    const analysisDoc = {
      id: Date.now().toString(),
      set_id: setId,
      set_name: setName || setData.header || 'Untitled Set',
      audio_file_name: req.file.originalname,
      laughs_per_minute: analysis.laughsPerMinute,
      avg_laughs_per_joke: analysis.avgLaughsPerJoke,
      category: analysis.category,
      timeline: analysis.timeline,
      joke_metrics: analysis.jokeMetrics,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('analysis_results')
      .insert([analysisDoc]);

    if (insertError) {
      console.error('Error inserting analysis:', insertError);
      // Check if table doesn't exist
      if (insertError.code === '42P01' || insertError.message?.includes('relation') || insertError.message?.includes('does not exist')) {
        return res.status(500).json({ 
          error: 'Analysis table not found. Please run the SQL script to create it.',
          details: 'Run server/create-analysis-table.sql in Supabase SQL Editor'
        });
      }
      throw insertError;
    }

    // Clean up uploaded file (optional - you might want to keep it)
    // fs.unlinkSync(req.file.path);

    res.json({
      id: analysisDoc.id,
      setName: analysisDoc.set_name,
      ...analysis
    });
  } catch (error) {
    console.error('Error analyzing audio:', error);
    res.status(500).json({ error: 'Failed to analyze audio', details: error.message });
  }
});

// Get all analyses
app.get('/api/analysis', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const parsedAnalyses = (data || []).map(analysis => ({
      id: analysis.id,
      setId: analysis.set_id,
      setName: analysis.set_name,
      audioFileName: analysis.audio_file_name,
      laughsPerMinute: parseFloat(analysis.laughs_per_minute),
      avgLaughsPerJoke: parseFloat(analysis.avg_laughs_per_joke),
      category: analysis.category,
      timeline: analysis.timeline || [],
      jokeMetrics: analysis.joke_metrics || [],
      createdAt: analysis.created_at,
      updatedAt: analysis.updated_at
    }));

    res.json(parsedAnalyses);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
});

// Get analysis by ID
app.get('/api/analysis/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Analysis not found' });
      }
      throw error;
    }

    const parsedAnalysis = {
      id: data.id,
      setId: data.set_id,
      setName: data.set_name,
      audioFileName: data.audio_file_name,
      laughsPerMinute: parseFloat(data.laughs_per_minute),
      avgLaughsPerJoke: parseFloat(data.avg_laughs_per_joke),
      category: data.category,
      timeline: data.timeline || [],
      jokeMetrics: data.joke_metrics || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };

    // Calculate maxLaughs for display
    const maxLaughs = parsedAnalysis.jokeMetrics.length > 0
      ? Math.max(...parsedAnalysis.jokeMetrics.map(m => m.laughs), 1)
      : 1;

    res.json({ ...parsedAnalysis, maxLaughs });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// Delete analysis
app.delete('/api/analysis/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('analysis_results')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ message: 'Analysis deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ error: 'Failed to delete analysis' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Comedica server running on http://localhost:${PORT}`);
  console.log(`☁️  Using Supabase cloud database`);
});

