import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { supabase, setupDatabase } from './database-supabase.js';
import { analyzeAudio } from './audioAnalyzer.js';

const require = createRequire(import.meta.url);
const ffmpeg = require('fluent-ffmpeg');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads (audio and video)
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB limit for videos
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and video files are allowed'), false);
    }
  }
});

// Configure multer specifically for video compression (5GB max - memory-optimized for 1GB Railway)
const MAX_VIDEO_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5GB
const videoUpload = multer({ 
  dest: 'uploads/',
  limits: { 
    fileSize: MAX_VIDEO_SIZE_BYTES,
    fieldSize: MAX_VIDEO_SIZE_BYTES,
    fields: 10,
    fieldNameSize: 100,
    files: 1,
    parts: 100
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  }
});

// Middleware
app.use(cors());
// Body size limits for video uploads (5GB max)
app.use(express.json({ limit: '5gb' }));
app.use(express.urlencoded({ extended: true, limit: '5gb' }));

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
      useTranscriptMode
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

// ========== VIDEO COMPRESSION API ==========

// Compress video to under 2GB while maintaining quality
app.post('/api/compress-video', (req, res, next) => {
  // Log request info for debugging
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2);
    const sizeGB = (parseInt(contentLength) / 1024 / 1024 / 1024).toFixed(2);
    console.log(`📥 Incoming request: ${sizeMB} MB (${sizeGB} GB)`);
  }
  
  videoUpload.single('video')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err);
      console.error('❌ Error code:', err.code);
      console.error('❌ Error message:', err.message);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        const maxSizeGB = 5;
        const fileSizeGB = contentLength ? (parseInt(contentLength) / 1024 / 1024 / 1024).toFixed(2) : 'unknown';
        return res.status(413).json({ 
          error: 'File too large', 
          details: `Maximum file size is ${maxSizeGB}GB. Your file (${fileSizeGB}GB) exceeds this limit.`,
          maxSize: `${maxSizeGB}GB`,
          currentLimit: '5GB',
          yourFileSize: `${fileSizeGB}GB`
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          error: 'Unexpected file field', 
          details: 'Please use the field name "video" for the file upload.'
        });
      }
      if (err.code === 'LIMIT_PART_COUNT') {
        return res.status(413).json({ 
          error: 'Too many parts', 
          details: 'The request contains too many parts. Please upload a single video file.'
        });
      }
      if (err.code === 'LIMIT_FIELD_KEY') {
        return res.status(413).json({ 
          error: 'Field name too long', 
          details: 'The field name is too long.'
        });
      }
      if (err.code === 'LIMIT_FIELD_VALUE') {
        return res.status(413).json({ 
          error: 'Field value too large', 
          details: 'A field value is too large.'
        });
      }
      if (err.code === 'LIMIT_FIELD_COUNT') {
        return res.status(413).json({ 
          error: 'Too many fields', 
          details: 'The request contains too many fields.'
        });
      }
      return res.status(400).json({ 
        error: 'File upload error', 
        details: err.message,
        code: err.code
      });
    }
    next();
  });
}, async (req, res) => {
  let inputPath = null;
  let outputPath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    console.log(`📤 Received video file: ${req.file.originalname}, size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

    // Ensure uploads directory exists
    const outputDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created uploads directory: ${outputDir}`);
    }

    // Check if ffmpeg is available
    try {
      await new Promise((resolve, reject) => {
        ffmpeg.getAvailableCodecs((err) => {
          if (err) {
            console.error('FFmpeg codec check error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
      console.log('✅ FFmpeg is available');
    } catch (ffmpegError) {
      console.error('❌ FFmpeg not available:', ffmpegError);
      return res.status(500).json({ 
        error: 'FFmpeg is not installed or not available on the server',
        details: ffmpegError.message || 'Please install FFmpeg on your system. Visit https://ffmpeg.org/download.html for installation instructions.'
      });
    }

    inputPath = req.file.path;
    const originalSize = req.file.size;
    const targetSize = 2 * 1024 * 1024 * 1024; // 2GB in bytes
    
    // Generate output filename
    const ext = path.extname(req.file.originalname) || '.mp4';
    const baseName = path.basename(req.file.originalname, ext);
    outputPath = path.join(outputDir, `${baseName}_compressed_${Date.now()}${ext}`);
    
    console.log(`📁 Input: ${inputPath}`);
    console.log(`📁 Output: ${outputPath}`);

    console.log(`🎬 Compressing video: ${req.file.originalname} (${(originalSize / 1024 / 1024 / 1024).toFixed(2)} GB)`);

    // If file is already under 2GB, we still compress it for optimization
    // Calculate target bitrate to achieve ~1.8GB (90% of 2GB to be safe)
    const targetFileSize = targetSize * 0.9; // 1.8GB
    
    // Get video duration first to calculate bitrate
    const getVideoDuration = () => {
      return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputPath, (err, metadata) => {
          if (err) {
            console.error('❌ FFprobe error:', err);
            reject(new Error(`Failed to analyze video: ${err.message}`));
          } else if (!metadata || !metadata.format || !metadata.format.duration) {
            reject(new Error('Could not determine video duration'));
          } else {
            resolve(metadata.format.duration);
          }
        });
      });
    };

    let duration;
    try {
      duration = await getVideoDuration();
      console.log(`⏱️  Video duration: ${Math.floor(duration / 60)}:${Math.floor(duration % 60)}`);
    } catch (durationError) {
      throw new Error(`Failed to get video duration: ${durationError.message}`);
    }

    // Calculate target bitrate (in kbps)
    // Formula: bitrate (kbps) = (target_size_bytes * 8) / (duration_seconds * 1000)
    // We reserve 128kbps for audio, so video bitrate = total - 128
    const targetBitrateKbps = Math.floor((targetFileSize * 8) / (duration * 1000)) - 128;
    
    // Ensure minimum quality (at least 2000 kbps for good quality)
    const videoBitrate = Math.max(targetBitrateKbps, 2000);
    
    console.log(`🎯 Target bitrate: ${videoBitrate} kbps`);

    // Compress video with optimal settings
    await new Promise((resolve, reject) => {
      const ffmpegProcess = ffmpeg(inputPath)
        .videoCodec('libx264') // H.264 codec
        .audioCodec('aac') // AAC audio codec
        .videoBitrate(videoBitrate) // Dynamic bitrate based on target size
        .audioBitrate('128k') // High quality audio
        .outputOptions([
          '-threads 2', // Limit encoding threads to reduce memory (1GB Railway)
          '-preset fast', // Balance of speed & memory (vs slow/veryslow)
          '-crf 23', // Constant Rate Factor for quality (18-28 range, 23 is good balance)
          '-movflags +faststart', // Enable fast start for web playback
          '-pix_fmt yuv420p', // Ensure compatibility
          '-profile:v high', // H.264 high profile
          '-level 4.0', // H.264 level
          '-maxrate', `${videoBitrate * 1.2}k`, // Max bitrate (20% buffer)
          '-bufsize', `${videoBitrate * 2}k`, // Buffer size
        ])
        .on('start', (commandLine) => {
          console.log('🔄 FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`⏳ Compression progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log('✅ Compression complete');
          // Verify output file exists
          if (!fs.existsSync(outputPath)) {
            reject(new Error('Compression completed but output file not found'));
            return;
          }
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ FFmpeg error:', err);
          console.error('❌ Error message:', err.message);
          reject(new Error(`FFmpeg compression failed: ${err.message}`));
        })
        .save(outputPath);
      
      // Add timeout (30 minutes max)
      setTimeout(() => {
        if (ffmpegProcess && ffmpegProcess.ffmpegProc) {
          console.error('⏰ Compression timeout - killing process');
          ffmpegProcess.kill('SIGKILL');
          reject(new Error('Compression timeout - process took too long'));
        }
      }, 30 * 60 * 1000);
    });

    // Check output file size
    const stats = fs.statSync(outputPath);
    const compressedSize = stats.size;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

    console.log(`📊 Original: ${(originalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`📊 Compressed: ${(compressedSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`📊 Compression: ${compressionRatio}% reduction`);

    // If still over 2GB, apply more aggressive compression
    if (compressedSize > targetSize) {
      console.log('⚠️  File still over 2GB, applying more aggressive compression...');
      const tempPath = outputPath;
      outputPath = path.join(outputDir, `${baseName}_compressed_aggressive_${Date.now()}${ext}`);
      
      // More aggressive settings
      const aggressiveBitrate = Math.floor((targetFileSize * 8) / (duration * 1000)) - 128;
      const finalBitrate = Math.max(aggressiveBitrate, 1500); // Minimum 1500 kbps

      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .videoBitrate(finalBitrate)
          .audioBitrate('96k')
          .outputOptions([
            '-threads 2', // Limit encoding threads to reduce memory
            '-preset fast',
            '-crf 26', // Slightly lower quality for more compression
            '-movflags +faststart',
            '-pix_fmt yuv420p',
            '-profile:v high',
            '-level 4.0',
            '-maxrate', `${finalBitrate * 1.2}k`,
            '-bufsize', `${finalBitrate * 2}k`,
          ])
          .on('end', () => {
            // Clean up intermediate file
            try {
              fs.unlinkSync(tempPath);
            } catch (e) {
              console.log('Note: Could not delete temp file:', e.message);
            }
            resolve();
          })
          .on('error', reject)
          .save(outputPath);
      });

      const finalStats = fs.statSync(outputPath);
      console.log(`📊 Final size: ${(finalStats.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
    }

    // Send compressed video file
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(outputPath)}"`);
    
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);

    // Clean up files after sending
    fileStream.on('end', () => {
      try {
        if (inputPath && fs.existsSync(inputPath)) {
          fs.unlinkSync(inputPath);
        }
        if (outputPath && fs.existsSync(outputPath)) {
          // Give it a moment before deleting output
          setTimeout(() => {
            try {
              fs.unlinkSync(outputPath);
            } catch (e) {
              console.log('Note: Could not delete output file:', e.message);
            }
          }, 1000);
        }
      } catch (e) {
        console.log('Note: Could not clean up files:', e.message);
      }
    });

  } catch (error) {
    console.error('Error compressing video:', error);
    
    // Clean up on error
    try {
      if (inputPath && fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }
      if (outputPath && fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (e) {
      console.log('Note: Could not clean up files on error:', e.message);
    }

    res.status(500).json({ 
      error: 'Failed to compress video', 
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Comedica server running on http://localhost:${PORT}`);
  console.log(`☁️  Using Supabase cloud database`);
});

