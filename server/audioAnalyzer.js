import fetch from 'node-fetch';
import fs from 'fs';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;

/**
 * Real AI Audio Analyzer using AssemblyAI
 * Features:
 * - Speech-to-text transcription
 * - Audio intelligence for laughter detection
 * - Silence detection to identify pauses
 * - Sentiment analysis
 */

// Upload audio file to AssemblyAI
async function uploadAudio(filePath) {
  const data = fs.readFileSync(filePath);
  
  const response = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'authorization': ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/octet-stream'
    },
    body: data
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.upload_url;
}

// Start transcription with audio intelligence
async function startTranscription(audioUrl) {
  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'authorization': ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      auto_highlights: true,
      content_safety: false,
      iab_categories: false,
      sentiment_analysis: true,
      entity_detection: false,
      auto_chapters: true,
      punctuate: true,
      format_text: true
    })
  });

  if (!response.ok) {
    throw new Error(`Transcription start failed: ${response.statusText}`);
  }

  return await response.json();
}

// Poll for transcription completion
async function waitForTranscription(transcriptId) {
  const maxAttempts = 60; // 5 minutes max wait
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        'authorization': ASSEMBLYAI_API_KEY
      }
    });

    const result = await response.json();

    if (result.status === 'completed') {
      return result;
    }
    
    if (result.status === 'error') {
      throw new Error(`Transcription failed: ${result.error}`);
    }

    // Wait 5 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Transcription timeout');
}

// Analyze transcription for laughter patterns
function analyzeLaughterPatterns(transcript, setData, excludeStart = 0, excludeEnd = 0) {
  const jokeDetails = setData.joke_details || setData.jokeDetails || [];
  const jokes = setData.jokes || [];
  const numJokes = jokeDetails.length || jokes.length || 5;
  
  const audioDuration = transcript.audio_duration || 300;
  const effectiveDuration = Math.max(0, audioDuration - excludeStart - excludeEnd);
  
  // Analyze sentiment and pauses to detect laughs
  const words = transcript.words || [];
  const sentimentResults = transcript.sentiment_analysis_results || [];
  const chapters = transcript.chapters || [];
  
  // Detect laugh-like patterns:
  // 1. Positive sentiment spikes
  // 2. Silence gaps (where audience is laughing)
  // 3. Speaker pauses
  
  const laughEvents = [];
  
  // Find silence gaps (potential laughter moments)
  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1];
    const currWord = words[i];
    const gap = currWord.start - prevWord.end;
    
    // If gap is > 1.5 seconds and within analyzed range, it might be laughter
    const gapStart = prevWord.end / 1000;
    if (gap > 1500 && gapStart >= excludeStart && gapStart <= (audioDuration - excludeEnd)) {
      laughEvents.push({
        time: gapStart - excludeStart, // Relative to analysis start
        intensity: Math.min(5, Math.floor(gap / 1000)), // Longer gap = more intense laugh
        type: 'silence_gap'
      });
    }
  }
  
  // Analyze sentiment for positive audience reactions
  for (const sentiment of sentimentResults) {
    const time = sentiment.start / 1000;
    if (time >= excludeStart && time <= (audioDuration - excludeEnd)) {
      if (sentiment.sentiment === 'POSITIVE') {
        laughEvents.push({
          time: time - excludeStart,
          intensity: sentiment.confidence > 0.8 ? 3 : 2,
          type: 'positive_sentiment'
        });
      }
    }
  }
  
  // Generate timeline (laughs per 10-second interval)
  const timeline = [];
  for (let t = 0; t <= effectiveDuration; t += 10) {
    const laughsInInterval = laughEvents.filter(
      e => e.time >= t && e.time < t + 10
    ).reduce((sum, e) => sum + e.intensity, 0);
    timeline.push({ time: t, laughs: Math.min(laughsInInterval, 5) });
  }
  
  // Distribute laughs across jokes based on position in set
  const jokeDuration = effectiveDuration / numJokes;
  const jokeMetrics = [];
  let totalLaughs = 0;
  
  for (let i = 0; i < numJokes; i++) {
    const jokeStart = i * jokeDuration;
    const jokeEnd = (i + 1) * jokeDuration;
    
    const jokeLaughs = laughEvents.filter(
      e => e.time >= jokeStart && e.time < jokeEnd
    ).reduce((sum, e) => sum + e.intensity, 0);
    
    let jokeHeader = `Joke ${i + 1}`;
    if (jokeDetails && jokeDetails[i]) {
      jokeHeader = jokeDetails[i].header || jokeHeader;
    }
    
    jokeMetrics.push({
      jokeIndex: i,
      laughs: jokeLaughs,
      header: jokeHeader
    });
    
    totalLaughs += jokeLaughs;
  }
  
  const avgLaughsPerJoke = numJokes > 0 ? totalLaughs / numJokes : 0;
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
    timeline,
    jokeMetrics,
    maxLaughs: Math.max(...jokeMetrics.map(m => m.laughs), 1),
    excludedStart: excludeStart,
    excludedEnd: excludeEnd,
    effectiveDuration,
    fullDuration: audioDuration,
    // Advanced analytics
    transcriptText: transcript.text,
    wordCount: words.length,
    speakingPace: words.length / (effectiveDuration / 60), // words per minute
    silenceCount: laughEvents.filter(e => e.type === 'silence_gap').length,
    positiveMoments: laughEvents.filter(e => e.type === 'positive_sentiment').length,
    chapters: chapters.map(c => ({
      headline: c.headline,
      summary: c.summary,
      start: c.start / 1000,
      end: c.end / 1000
    }))
  };
}

/**
 * Main analysis function - uses AssemblyAI if API key is available,
 * falls back to enhanced mock analysis otherwise
 */
export async function analyzeAudio(audioFilePath, setData, audioDurationSeconds = null, excludeStartSeconds = 0, excludeEndSeconds = 0) {
  // Check if AssemblyAI API key is configured
  if (ASSEMBLYAI_API_KEY && ASSEMBLYAI_API_KEY !== 'your_assemblyai_api_key_here') {
    try {
      console.log('🎙️ Starting real AI audio analysis with AssemblyAI...');
      
      // Upload audio
      const audioUrl = await uploadAudio(audioFilePath);
      console.log('✅ Audio uploaded');
      
      // Start transcription
      const transcriptJob = await startTranscription(audioUrl);
      console.log(`✅ Transcription started: ${transcriptJob.id}`);
      
      // Wait for completion
      const transcript = await waitForTranscription(transcriptJob.id);
      console.log('✅ Transcription completed');
      
      // Analyze for laugh patterns
      const analysis = analyzeLaughterPatterns(
        transcript,
        setData,
        excludeStartSeconds,
        excludeEndSeconds
      );
      
      console.log('✅ AI analysis complete');
      return analysis;
      
    } catch (error) {
      console.error('⚠️ AssemblyAI analysis failed, falling back to mock:', error.message);
      // Fall back to mock analysis
      return mockAnalyzeAudio(audioFilePath, setData, audioDurationSeconds, excludeStartSeconds, excludeEndSeconds);
    }
  }
  
  // Use mock analysis if no API key
  console.log('ℹ️ No AssemblyAI API key configured, using mock analysis');
  return mockAnalyzeAudio(audioFilePath, setData, audioDurationSeconds, excludeStartSeconds, excludeEndSeconds);
}

/**
 * Enhanced mock analysis with realistic patterns
 */
async function mockAnalyzeAudio(audioFilePath, setData, audioDurationSeconds = null, excludeStartSeconds = 0, excludeEndSeconds = 0) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const jokeDetails = setData.joke_details || setData.jokeDetails || [];
  const jokes = setData.jokes || [];
  const numJokes = jokeDetails.length || jokes.length || 5;
  const fullDuration = audioDurationSeconds || 300;
  const effectiveDuration = Math.max(0, fullDuration - excludeStartSeconds - excludeEndSeconds);
  
  // Generate more realistic laugh patterns
  // Early jokes: warming up (fewer laughs)
  // Middle jokes: peak performance (most laughs)
  // Late jokes: audience fatigue or big closer
  
  const timeline = [];
  for (let i = 0; i <= effectiveDuration; i += 10) {
    const position = i / effectiveDuration;
    // Bell curve with slight uptick at end for closer
    const baseIntensity = Math.sin(position * Math.PI) * 3;
    const closerBonus = position > 0.85 ? 2 : 0;
    const randomVariation = Math.random() * 2 - 1;
    const laughs = Math.max(0, Math.min(5, Math.floor(baseIntensity + closerBonus + randomVariation)));
    timeline.push({ time: i, laughs });
  }
  
  // Generate joke metrics with position-based patterns
  const jokeMetrics = [];
  let totalLaughs = 0;
  
  for (let i = 0; i < numJokes; i++) {
    const position = i / numJokes;
    // Opener gets medium, middle builds, closer gets bonus
    let baseLaughs = 5 + Math.sin(position * Math.PI) * 8;
    if (i === numJokes - 1) baseLaughs += 3; // Closer bonus
    if (i === 0) baseLaughs += 2; // Opener bonus (audience excited)
    
    const randomFactor = 0.7 + Math.random() * 0.6; // 70% - 130% variance
    const laughs = Math.max(2, Math.floor(baseLaughs * randomFactor));
    totalLaughs += laughs;
    
    let jokeHeader = `Joke ${i + 1}`;
    if (jokeDetails && jokeDetails[i]) {
      jokeHeader = jokeDetails[i].header || jokeHeader;
    }
    
    jokeMetrics.push({
      jokeIndex: i,
      laughs,
      header: jokeHeader
    });
  }
  
  const avgLaughsPerJoke = totalLaughs / numJokes;
  const laughsPerMinute = effectiveDuration > 0 ? (totalLaughs / effectiveDuration) * 60 : 0;
  
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
    timeline,
    jokeMetrics,
    maxLaughs: Math.max(...jokeMetrics.map(m => m.laughs), 1),
    excludedStart: excludeStartSeconds,
    excludedEnd: excludeEndSeconds,
    effectiveDuration,
    fullDuration,
    // Mock advanced analytics
    transcriptText: null,
    wordCount: Math.floor(effectiveDuration * 2.5), // ~150 words per minute estimate
    speakingPace: 145 + Math.floor(Math.random() * 30), // 145-175 wpm
    silenceCount: Math.floor(totalLaughs * 0.8), // Approximate silence gaps
    positiveMoments: Math.floor(totalLaughs * 0.3),
    chapters: [],
    isMockData: true
  };
}

export default analyzeAudio;

