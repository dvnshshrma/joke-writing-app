import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import { supabase, setupDatabase } from './database-supabase.js';
import { analyzeAudio } from './audioAnalyzer.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads (audio and video)
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit for videos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and video files are allowed'), false);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Auth middleware to extract user from JWT
const extractUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        req.user = user;
      }
    } catch (e) {
      console.log('Auth error:', e.message);
    }
  }
  next();
};

app.use(extractUser);

// Initialize database on startup
(async () => {
  try {
    await setupDatabase();
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
})();

// Get all jokes (filtered by user if authenticated)
app.get('/api/jokes', async (req, res) => {
  try {
    let query = supabase
      .from('jokes')
      .select('*')
      .order('updated_at', { ascending: false });
    
    // Filter by user if authenticated
    if (req.user) {
      query = query.eq('user_id', req.user.id);
    } else {
      query = query.is('user_id', null);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const parsedJokes = (data || []).map(joke => ({
      id: joke.id,
      header: joke.header,
      sections: joke.sections || [],
      isDraft: joke.is_draft !== false,
      isOneLiner: joke.is_one_liner || false,
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
      updated_at: updatedAt || new Date().toISOString(),
      user_id: req.user?.id || null
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

// Analyze audio file (using imported analyzeAudio from audioAnalyzer.js)
app.post('/api/analysis/analyze', (req, res, next) => {
  upload.single('audio')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 1GB.' });
      }
      if (err.message === 'Only audio and video files are allowed') {
        return res.status(400).json({ error: 'Only audio and video files are allowed (MP3, WAV, M4A, MP4, MOV, WEBM, etc.)' });
      }
      return res.status(400).json({ error: 'File upload error', details: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio/video file uploaded' });
    }

    const { setId, setName, audioDuration, useTranscript } = req.body;
    
    // Set name is required (either from text input or existing set)
    if (!setName && !setId) {
      return res.status(400).json({ error: 'Set name is required' });
    }

    // Parse parameters
    const audioDurationSeconds = audioDuration ? parseInt(audioDuration, 10) : null;
    const excludeStartSeconds = req.body.excludeStartSeconds ? parseInt(req.body.excludeStartSeconds, 10) : 0;
    const excludeEndSeconds = req.body.excludeEndSeconds ? parseInt(req.body.excludeEndSeconds, 10) : 0;
    const useTranscriptMode = useTranscript === 'true' || useTranscript === true;

    let setData = null;
    
    // If setId provided, try to fetch existing set data
    if (setId) {
      const { data, error } = await supabase
        .from('sets')
        .select('*')
        .eq('id', setId)
        .single();
      
      if (!error && data) {
        setData = data;
      }
    }

    // Fetch all saved jokes to use their headers as topic references
    let savedJokeHeaders = [];
    try {
      const { data: jokes, error: jokesError } = await supabase
        .from('jokes')
        .select('header')
        .order('updated_at', { ascending: false });
      
      if (!jokesError && jokes) {
        savedJokeHeaders = jokes.map(j => j.header).filter(h => h && h.trim());
      }
      console.log(`📋 Loaded ${savedJokeHeaders.length} joke headers for topic matching`);
    } catch (e) {
      console.log('⚠️ Could not load joke headers:', e.message);
    }

    // Analyze audio with optional transcript-based joke extraction
    console.log(`🎬 Analyzing: ${req.file.originalname}`);
    console.log(`📝 Set name: ${setName || setData?.header || 'Untitled'}`);
    console.log(`🔍 Transcript mode: ${useTranscriptMode}`);
    
    const analysis = await analyzeAudio(
      req.file.path, 
      setData, 
      audioDurationSeconds, 
      excludeStartSeconds, 
      excludeEndSeconds,
      useTranscriptMode,
      savedJokeHeaders
    );

    // Save analysis to database (including transcript and extracted jokes)
    const analysisDoc = {
      id: Date.now().toString(),
      set_id: setId || null,
      set_name: setName || setData?.header || 'Untitled Set',
      audio_file_name: req.file.originalname,
      laughs_per_minute: analysis.laughsPerMinute,
      avg_laughs_per_joke: analysis.avgLaughsPerJoke,
      category: analysis.category,
      timeline: analysis.timeline,
      joke_metrics: analysis.jokeMetrics,
      // Advanced analytics fields
      word_count: analysis.wordCount || null,
      speaking_pace: analysis.speakingPace || null,
      silence_count: analysis.silenceCount || null,
      positive_moments: analysis.positiveMoments || null,
      chapters: analysis.chapters || [],
      is_mock_data: analysis.isMockData || false,
      excluded_start: analysis.excludedStart || 0,
      excluded_end: analysis.excludedEnd || 0,
      effective_duration: analysis.effectiveDuration || null,
      full_duration: analysis.fullDuration || null,
      // New: transcript and extracted jokes
      transcript_text: analysis.transcriptText || null,
      extracted_jokes: analysis.extractedJokes || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Clean up uploaded file after analysis
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.log('Note: Could not delete temp file:', e.message);
    }

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
      // Advanced analytics
      wordCount: analysis.word_count,
      speakingPace: analysis.speaking_pace,
      silenceCount: analysis.silence_count,
      positiveMoments: analysis.positive_moments,
      chapters: analysis.chapters || [],
      isMockData: analysis.is_mock_data,
      excludedStart: analysis.excluded_start,
      excludedEnd: analysis.excluded_end,
      effectiveDuration: analysis.effective_duration,
      fullDuration: analysis.full_duration,
      // Transcript data
      transcriptText: analysis.transcript_text,
      extractedJokes: analysis.extracted_jokes || [],
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
      // Advanced analytics
      wordCount: data.word_count,
      speakingPace: data.speaking_pace,
      silenceCount: data.silence_count,
      positiveMoments: data.positive_moments,
      chapters: data.chapters || [],
      isMockData: data.is_mock_data,
      excludedStart: data.excluded_start,
      excludedEnd: data.excluded_end,
      effectiveDuration: data.effective_duration,
      fullDuration: data.full_duration,
      // Transcript data
      transcriptText: data.transcript_text,
      extractedJokes: data.extracted_jokes || [],
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

