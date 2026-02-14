// Vercel serverless function entry point
import { createClient } from '@supabase/supabase-js';
import { COMEDY_TAXONOMY, buildSubtopicToTopicMap } from '../comedyTaxonomy.js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// IMPORTANT:
// - The serverless API needs a SERVICE ROLE key to write rows when RLS is enabled.
// - The frontend must use the ANON key.
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  console.error('Missing Supabase credentials');
}

// Admin client (bypasses RLS) for server-side inserts/updates.
const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

// Public client (RLS-enforced) used only for auth user lookup as a fallback.
const supabasePublic = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Log API availability (for debugging)
if (GROQ_API_KEY) {
  console.log('✅ Groq API key found - taxonomy-based topic classification');
} else {
  console.log('⚠️ GROQ_API_KEY not set - will use keyword-based topic fallback');
}
if (OPENAI_API_KEY) {
  console.log('✅ OpenAI API key found - will use for style classification (Find Your Style)');
} else {
  console.log('❌ OpenAI API key NOT FOUND - style classification may be limited');
}

// ---------- Analysis helpers (serverless / mock) ----------
const buildMockTimeline = (effectiveDurationSeconds, stepSeconds = 10) => {
  const timeline = [];
  const total = Math.max(0, Number(effectiveDurationSeconds) || 0);
  for (let t = 0; t <= total; t += stepSeconds) {
    timeline.push({ time: t, laughs: Math.floor(Math.random() * 5) });
  }
  return timeline;
};

const buildMockJokeMetrics = async ({ user, setName }) => {
  // Use user joke headers as "topics"/headers if available; otherwise fallback.
  let headers = [];
  try {
    if (user) {
      const { data } = await supabase
      .from('jokes')
        .select('header')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(12);
      headers = (data || []).map(r => r.header).filter(Boolean);
    }
  } catch (_) {}

  const count = Math.max(4, Math.min(8, headers.length || 6));
  const jokeMetrics = [];
  let totalLaughs = 0;
  for (let i = 0; i < count; i++) {
    const laughs = Math.floor(Math.random() * 15) + 2;
    totalLaughs += laughs;
    jokeMetrics.push({
      jokeIndex: i,
      laughs,
      header: headers[i] || `${setName ? setName + ' - ' : ''}Joke ${i + 1}`,
    });
  }
  return { jokeMetrics, totalLaughs };
};

const categorize = (lpm, avg) => {
  if (lpm >= 8 && avg >= 8) return 'good';
  if (lpm < 4 || avg < 4) return 'bad';
  return 'average';
};

const fetchAssemblyAI = async (path, opts = {}) => {
  if (!ASSEMBLYAI_API_KEY) {
    throw new Error('ASSEMBLYAI_API_KEY is missing in server environment');
  }
  const res = await fetch(`${ASSEMBLYAI_BASE_URL}${path}`, {
    ...opts,
    headers: {
      Authorization: ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `AssemblyAI error (${res.status})`);
  }
  return data;
};

const computeLaughTimelineFromWords = (words = [], effectiveDurationSeconds = 0, stepSeconds = 10) => {
  // Heuristic: treat long pauses as laugh moments.
  // This is not true "laughter detection", but gives a useful approximation without extra models.
  const buckets = new Array(Math.floor((effectiveDurationSeconds || 0) / stepSeconds) + 1).fill(0);
  const gapThresholdMs = 1200;
  for (let i = 1; i < words.length; i++) {
    const gap = (words[i].start ?? 0) - (words[i - 1].end ?? 0);
    if (gap >= gapThresholdMs) {
      const t = Math.max(0, Math.floor((words[i - 1].end ?? 0) / 1000));
      const idx = Math.min(buckets.length - 1, Math.floor(t / stepSeconds));
      buckets[idx] += 1;
    }
  }
  return buckets.map((laughs, i) => ({ time: i * stepSeconds, laughs }));
};

// Robust calculation of advanced analytics from AssemblyAI transcript
const computeAdvancedAnalytics = (job, excludedStartSeconds = 0, excludedEndSeconds = 0, audioDurationSeconds = null) => {
  const words = job.words || [];
  const transcriptText = job.text || '';
  const audioDuration = audioDurationSeconds || (job.audio_duration ? Math.ceil(job.audio_duration / 1000) : null);
  
  if (!words.length && !transcriptText) {
    // No data available
    return {
      wordCount: null,
      speakingPace: null,
      silenceCount: null,
      effectiveDuration: null
    };
  }

  // Calculate effective duration (actual speaking time within analyzed range)
  const excludedStartMs = excludedStartSeconds * 1000;
  const excludedEndMs = excludedEndSeconds * 1000;
  const audioDurationMs = audioDuration ? audioDuration * 1000 : null;

  // Filter words within the analyzed range (excluding start/end applause)
  const filteredWords = words.filter(word => {
    const wordStart = word.start ?? 0;
    const wordEnd = word.end ?? wordStart;
    if (audioDurationMs !== null) {
      return wordStart >= excludedStartMs && wordEnd <= (audioDurationMs - excludedEndMs);
    }
    return true; // If no audio duration, include all words
  });

  // Calculate actual speaking duration from word timestamps (more accurate than audio duration)
  let speakingDurationSeconds = null;
  if (filteredWords.length > 0) {
    const firstWord = filteredWords[0];
    const lastWord = filteredWords[filteredWords.length - 1];
    const firstStart = firstWord.start ?? 0;
    const lastEnd = lastWord.end ?? (lastWord.start ?? firstStart);
    speakingDurationSeconds = Math.max(1, (lastEnd - firstStart) / 1000); // At least 1 second to avoid division by zero
  } else if (audioDuration) {
    // Fallback to audio duration minus excluded time
    speakingDurationSeconds = Math.max(1, audioDuration - excludedStartSeconds - excludedEndSeconds);
  }

  // Word count: count actual words from transcript, filter out filler words
  const fillerWords = new Set(['uh', 'um', 'ah', 'oh', 'hmm', 'er', 'like', 'you know', 'i mean', 'well']);
  const transcriptWords = transcriptText
    .toLowerCase()
    .replace(/[.,!?;:—–\-()\[\]{}'"]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !fillerWords.has(w));
  const wordCount = transcriptWords.length || filteredWords.length;

  // Speaking pace: words per minute using actual speaking duration
  let speakingPace = null;
  if (speakingDurationSeconds && speakingDurationSeconds > 0 && wordCount > 0) {
    speakingPace = Math.round((wordCount / speakingDurationSeconds) * 60);
    // Clamp to reasonable range (50-250 WPM typical for speech)
    speakingPace = Math.max(50, Math.min(250, speakingPace));
  }

  // Silence count: count significant pauses (>= 1200ms) within analyzed range
  let silenceCount = 0;
  if (filteredWords.length > 1) {
    for (let i = 1; i < filteredWords.length; i++) {
      const gap = (filteredWords[i].start ?? 0) - (filteredWords[i - 1].end ?? 0);
      // Pause >= 1200ms (1.2 seconds) is significant
      if (gap >= 1200) {
        silenceCount++;
      }
    }
  }

  return {
    wordCount,
    speakingPace,
    silenceCount,
    effectiveDuration: speakingDurationSeconds ? Math.round(speakingDurationSeconds) : null
  };
};

// Extract full text from a joke (header + all sections)
const extractJokeText = (joke) => {
  const parts = [joke.header || ''];
  if (joke.sections && Array.isArray(joke.sections)) {
    joke.sections.forEach(section => {
      if (section.text) parts.push(section.text);
    });
  }
  return parts.join(' ').toLowerCase().trim();
};

// Build keyword vectors from text (simple bag-of-words with TF-like weighting)
const buildTextVector = (text, stopWords) => {
  const words = text
    .toLowerCase()
    .replace(/[.,!?;:—–\-()\[\]{}'"]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  
  const vector = {};
  words.forEach(word => {
    vector[word] = (vector[word] || 0) + 1;
  });
  
  // Normalize by length (TF-like)
  const totalWords = words.length;
  if (totalWords > 0) {
    Object.keys(vector).forEach(word => {
      vector[word] = vector[word] / totalWords;
    });
  }
  
  return vector;
};

// Calculate cosine similarity between two text vectors
const cosineSimilarity = (vec1, vec2) => {
  const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  keys.forEach(key => {
    const v1 = vec1[key] || 0;
    const v2 = vec2[key] || 0;
    dotProduct += v1 * v2;
    norm1 += v1 * v1;
    norm2 += v2 * v2;
  });
  
  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
  return denominator > 0 ? dotProduct / denominator : 0;
};

// Segment transcript into joke candidates using pauses, chapters, or fixed intervals
const segmentTranscriptIntoJokes = (words = [], transcriptText = '', chapters = null, minJokes = 4, estimatedMinutes = 7) => {
  const segments = [];
  
  // Option 1: Use AssemblyAI chapters if available (best option)
  if (chapters && Array.isArray(chapters) && chapters.length >= minJokes) {
    return chapters.map((chapter, i) => ({
      index: i,
      startTime: chapter.start ? chapter.start / 1000 : null,
      endTime: chapter.end ? chapter.end / 1000 : null,
      text: chapter.summary || '',
      headline: chapter.headline || null
    }));
  }
  
  // Option 2: Use word timestamps to find natural breaks (long pauses)
  if (words.length > 0) {
    const pauseThresholdMs = 1500; // 1.5 second pause indicates joke break
    const breaks = [0]; // Start of first joke
    
    for (let i = 1; i < words.length; i++) {
      const gap = (words[i].start ?? 0) - (words[i - 1].end ?? 0);
      if (gap >= pauseThresholdMs) {
        breaks.push(i);
      }
    }
    breaks.push(words.length); // End of last joke
    
    // Ensure minimum number of jokes
    const targetJokes = Math.max(minJokes, Math.min(12, Math.ceil(estimatedMinutes) + 1));
    
    if (breaks.length - 1 >= minJokes) {
      // Use natural breaks
      for (let i = 0; i < breaks.length - 1; i++) {
        const startIdx = breaks[i];
        const endIdx = breaks[i + 1];
        const segmentWords = words.slice(startIdx, endIdx);
        const startTime = segmentWords[0]?.start ? segmentWords[0].start / 1000 : null;
        const endTime = segmentWords[segmentWords.length - 1]?.end ? segmentWords[segmentWords.length - 1].end / 1000 : null;
        const text = segmentWords.map(w => w.text || w.word || '').join(' ');
        
        segments.push({
          index: i,
          startTime,
          endTime,
          text: text.trim()
        });
      }
    } else {
      // Not enough natural breaks, split evenly
      const wordsPerSegment = Math.floor(words.length / targetJokes);
      for (let i = 0; i < targetJokes; i++) {
        const startIdx = i * wordsPerSegment;
        const endIdx = i === targetJokes - 1 ? words.length : (i + 1) * wordsPerSegment;
        const segmentWords = words.slice(startIdx, endIdx);
        const startTime = segmentWords[0]?.start ? segmentWords[0].start / 1000 : null;
        const endTime = segmentWords[segmentWords.length - 1]?.end ? segmentWords[segmentWords.length - 1].end / 1000 : null;
        const text = segmentWords.map(w => w.text || w.word || '').join(' ');
        
        segments.push({
          index: i,
          startTime,
          endTime,
          text: text.trim()
        });
      }
    }
    
    return segments;
  }
  
  // Option 3: Fallback - split transcript text by sentences/length
  if (transcriptText) {
    const sentences = transcriptText.split(/[.!?]\s+/).filter(s => s.trim().length > 20);
    const wordsPerJoke = Math.max(30, Math.floor(sentences.length / Math.max(minJokes, Math.ceil(estimatedMinutes))));
    const targetJokes = Math.max(minJokes, Math.min(12, Math.ceil(estimatedMinutes) + 1));
    
    for (let i = 0; i < targetJokes; i++) {
      const startIdx = i * wordsPerJoke;
      const endIdx = i === targetJokes - 1 ? sentences.length : (i + 1) * wordsPerJoke;
      const segmentText = sentences.slice(startIdx, endIdx).join('. ').trim();
      
      if (segmentText) {
        segments.push({
          index: i,
          startTime: null,
          endTime: null,
          text: segmentText
        });
      }
    }
  }
  
  return segments;
};

/** Format topic/subtopic for display (e.g. "dating rituals" -> "Dating Rituals") */
function formatHeader(subtopic) {
  if (!subtopic) return '';
  return subtopic.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/** Keyword-based fallback: match text to taxonomy subtopics */
function classifySegmentByKeywords(text, subtopicToTopic) {
  const lower = (text || '').toLowerCase();
  let bestTopic = 'Other';
  let bestSubtopic = 'general';
  let bestLen = 0;
  for (const [sub, topic] of Object.entries(subtopicToTopic)) {
    if (topic === 'Other') continue;
    if (lower.includes(sub) && sub.length > bestLen) {
      bestLen = sub.length;
      bestTopic = topic;
      bestSubtopic = sub;
    }
  }
  return { topic: bestTopic, subtopic: bestSubtopic };
}

/**
 * Classify joke segments using a fixed comedy taxonomy (Groq or keyword fallback)
 * Replaces clustering with explicit topic/subtopic classification
 */
const classifyJokesWithTaxonomy = async (segments) => {
  if (!segments || segments.length === 0) return segments;

  const subtopicToTopic = buildSubtopicToTopicMap();
  const topicKeys = Object.keys(COMEDY_TAXONOMY).filter(k => k !== 'Other');
  const taxonomyStr = JSON.stringify(COMEDY_TAXONOMY, null, 2);

  if (!GROQ_API_KEY || GROQ_API_KEY === 'your_groq_api_key_here') {
    console.log('ℹ️ Groq API key not found, using keyword-based taxonomy classification');
    return segments.map(segment => {
      const { topic, subtopic } = classifySegmentByKeywords(segment.text || '', subtopicToTopic);
      return {
        ...segment,
        topic,
        subtopic,
        matchedHeader: formatHeader(subtopic),
        isAIGenerated: false
      };
    });
  }

  const BATCH_SIZE = 12;
  const results = [];

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);
    const batchIndices = batch.map((_, idx) => i + idx);

    const segmentsList = batch.map((seg, idx) => {
      const text = (seg.text || '').substring(0, 500);
      return `Segment ${batchIndices[idx]}: "${text}"`;
    }).join('\n\n');

    const prompt = `You are a comedy analyst. Classify each joke segment into ONE topic and ONE subtopic from this taxonomy.

TAXONOMY (use EXACT topic and subtopic strings):
${taxonomyStr}

RULES:
- Pick the SINGLE best-matching topic and subtopic. If a joke fits multiple, choose the PRIMARY theme.
- Use ONLY topic/subtopic strings from the taxonomy (e.g. "Relationships_and_Dating", "dating rituals").
- If nothing fits, use topic "Other" and subtopic "general".
- Return valid JSON array, one object per segment in order.

Return ONLY a JSON array (no markdown):
[
  {"segmentIndex": 0, "topic": "Relationships_and_Dating", "subtopic": "dating rituals"},
  {"segmentIndex": 1, "topic": "Work_and_Career", "subtopic": "office politics"}
]

Segments to classify:
${segmentsList}

JSON array:`;

    try {
      console.log(`🤖 Classifying segments ${batchIndices[0]}-${batchIndices[batchIndices.length - 1]} with Groq (taxonomy)...`);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: 'You classify comedy joke segments into topics. Return ONLY a valid JSON array, no other text. Use exact taxonomy strings.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Groq API: ${response.status} - ${err.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = (data.choices[0]?.message?.content || '').trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const arr = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      for (let j = 0; j < batch.length; j++) {
        const seg = batch[j];
        const raw = arr[j] || {};
        let topic = String(raw.topic || 'Other').trim();
        let subtopic = String(raw.subtopic || 'general').trim();
        if (!topicKeys.includes(topic) && topic !== 'Other') {
          topic = 'Other';
          subtopic = 'general';
        }
        const subtopicsForTopic = COMEDY_TAXONOMY[topic];
        if (subtopicsForTopic && !subtopicsForTopic.includes(subtopic)) {
          subtopic = subtopicsForTopic[0] || 'general';
        }
        results.push({
          ...seg,
          topic,
          subtopic,
          matchedHeader: formatHeader(subtopic),
          isAIGenerated: true
        });
      }
    } catch (err) {
      console.error(`⚠️ Groq batch failed, using keyword fallback:`, err.message);
      batch.forEach(seg => {
        const { topic, subtopic } = classifySegmentByKeywords(seg.text || '', subtopicToTopic);
        results.push({
          ...seg,
          topic,
          subtopic,
          matchedHeader: formatHeader(subtopic),
          isAIGenerated: false
        });
      });
    }
  }

  const topicCounts = results.reduce((acc, s) => { acc[s.topic] = (acc[s.topic] || 0) + 1; return acc; }, {});
  console.log(`✅ Taxonomy classified ${results.length} segments:`, topicCounts);
  return results;
};

// Generate a joke header using AI (Groq - free tier)
const generateJokeHeaderWithAI = async (segmentText) => {
  if (!GROQ_API_KEY || !segmentText || segmentText.trim().length < 10) {
    return null;
  }

  try {
    const maxLength = 500;
    const truncatedText = segmentText.length > maxLength
      ? segmentText.substring(0, maxLength) + '...'
      : segmentText;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are an expert comedy writer. Generate a concise, catchy header/title (2-5 words) that captures the main topic or punchline of this comedy bit. Return only the header text, nothing else. Do not use quotes or extra formatting.'
          },
          {
            role: 'user',
            content: `Generate a brief header for this comedy bit:\n\n"${truncatedText}"\n\nHeader (2-5 words):`
          }
        ],
        temperature: 0.7,
        max_tokens: 20
      })
    });

    if (!response.ok) {
      console.error('Groq API error generating header:', response.status);
      return null;
    }

    const data = await response.json();
    const header = data.choices?.[0]?.message?.content?.trim();
    
    if (header) {
      // Clean up any quotes or extra formatting
      return header.replace(/^["']|["']$/g, '').trim();
    }
  } catch (err) {
    console.error('Error generating header with AI:', err.message);
    // Fall back to keyword extraction
  }

  return null;
};

// Extract a topic/title from a text segment (fallback when AI unavailable)
const extractSegmentTopic = (text, stopWords) => {
  if (!text || text.trim().length < 10) return null;
  
  // Try to extract first meaningful sentence or phrase
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 10);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    // Take first 4-6 words as topic
    const words = firstSentence.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()) && w.length > 2);
    if (words.length >= 3) {
      return words.slice(0, Math.min(6, words.length)).join(' ').replace(/[.,!?;:—–\-]/g, '').trim();
    }
  }
  
  // Fallback: extract key phrases
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
  if (words.length >= 2) {
    return words.slice(0, Math.min(4, words.length)).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  
  return null;
};

// Improved topic extraction using keyword frequency and phrase analysis
const extractTopicsFromTranscript = (transcriptText) => {
  if (!transcriptText || !transcriptText.trim()) return [];

  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from',
    'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
    'if', 'then', 'else', 'so', 'than', 'just', 'only', 'even', 'also', 'still', 'yet', 'already',
    'very', 'really', 'quite', 'pretty', 'too', 'more', 'most', 'less', 'least', 'well', 'good', 'bad',
    'all', 'both', 'each', 'every', 'some', 'any', 'no', 'not', 'yes', 'yeah', 'ok', 'okay',
    'got', 'get', 'gets', 'getting', 'go', 'goes', 'going', 'went', 'gone', 'come', 'comes', 'coming', 'came',
    'know', 'knows', 'knew', 'think', 'thinks', 'thought', 'see', 'sees', 'saw', 'say', 'says', 'said', 'tell', 'tells', 'told',
    'like', 'likes', 'liked', 'want', 'wants', 'wanted', 'need', 'needs', 'needed', 'try', 'tries', 'tried',
    'uh', 'um', 'ah', 'oh', 'hmm', 'haha', 'lol', 'like', 'literally', 'actually', 'basically', 'obviously'
  ]);

  // Normalize and split text into sentences (simple approach)
  const sentences = transcriptText
    .toLowerCase()
    .replace(/[.,!?;:—–\-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Count word frequencies
  const wordFreq = {};
  sentences.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });

  // Extract 2-3 word phrases (n-grams) for better topic detection
  const phrases = [];
  const words = transcriptText.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i].replace(/[.,!?;:—–\-]/g, '');
    const w2 = words[i + 1].replace(/[.,!?;:—–\-]/g, '');
    if (w1.length > 2 && w2.length > 2 && !stopWords.has(w1) && !stopWords.has(w2)) {
      phrases.push(`${w1} ${w2}`);
    }
  }
  for (let i = 0; i < words.length - 2; i++) {
    const w1 = words[i].replace(/[.,!?;:—–\-]/g, '');
    const w2 = words[i + 1].replace(/[.,!?;:—–\-]/g, '');
    const w3 = words[i + 2].replace(/[.,!?;:—–\-]/g, '');
    if (w1.length > 2 && w2.length > 2 && w3.length > 2 && 
        !stopWords.has(w1) && !stopWords.has(w2) && !stopWords.has(w3)) {
      phrases.push(`${w1} ${w2} ${w3}`);
    }
  }

  // Count phrase frequencies
  const phraseFreq = {};
  phrases.forEach(phrase => {
    phraseFreq[phrase] = (phraseFreq[phrase] || 0) + 1;
  });

  // Combine high-frequency words and phrases, prioritize longer phrases
  const candidates = [];
  Object.entries(phraseFreq).forEach(([phrase, count]) => {
    if (count >= 2) { // Phrase appears at least twice
      candidates.push({ text: phrase, score: count * (phrase.split(' ').length * 0.5) });
    }
  });
  Object.entries(wordFreq).forEach(([word, count]) => {
    if (count >= 3 && word.length >= 4) { // Word appears at least 3 times, 4+ chars
      candidates.push({ text: word, score: count });
    }
  });

  // Sort by score and return top topics
  candidates.sort((a, b) => b.score - a.score);
  
  // Capitalize first letter of each word for display
  return candidates.slice(0, 8).map(item => ({
    topic: item.text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    score: item.score
  }));
};

const buildJokeMetricsFromTranscript = async ({ transcriptText, jobWords = [], jobChapters = null, estimatedMinutes = 7 }) => {
  const segments = segmentTranscriptIntoJokes(jobWords, transcriptText, jobChapters, 4, estimatedMinutes);

  if (segments.length === 0) {
    const minJokes = 4;
    const numJokes = Math.max(minJokes, Math.min(12, Math.ceil(estimatedMinutes) + 1));
    return {
      jokeMetrics: Array.from({ length: numJokes }, (_, i) => ({
        jokeIndex: i,
        header: `Joke ${i + 1}`,
        topic: 'Other',
        laughs: 0
      })),
      classifiedSegments: []
    };
  }

  const classifiedSegments = await classifyJokesWithTaxonomy(segments);

  const jokeMetrics = classifiedSegments.map((segment, i) => {
    let header = segment.matchedHeader || segment.headline || `Joke ${i + 1}`;
    if (header) header = header.charAt(0).toUpperCase() + header.slice(1);
    else header = `Joke ${i + 1}`;
    return {
      jokeIndex: i,
      header,
      topic: segment.topic || 'Other',
      laughs: 0,
      startTime: segment.startTime,
      endTime: segment.endTime
    };
  });

  return { jokeMetrics, classifiedSegments };
};

// Helper to extract user from JWT
const extractUser = async (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      // Prefer admin client (works even if anon key missing in server env)
      const client = supabaseAdmin || supabasePublic;
      if (!client) return null;
      const { data: { user }, error } = await client.auth.getUser(token);
      if (!error && user) return user;
    } catch (e) {
      console.log('Auth error:', e.message);
    }
  }
  return null;
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = await extractUser(req);
  const { url, method, body } = req;
  const path = url.replace('/api', '');

  try {
    if (!supabaseAdmin) {
      // Read-only endpoints may still work, but analysis insert + signed URL needs admin.
      // Provide a clear setup message instead of opaque RLS errors.
      if (path.startsWith('/analysis')) {
        return res.status(500).json({
          error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY (required for analysis inserts under RLS). Add it in Vercel env vars and redeploy.'
        });
      }
    }

    // JOKES ENDPOINTS
    if (path === '/jokes' || path === '/jokes/') {
      if (method === 'GET') {
        let query = supabaseAdmin.from('jokes').select('*').order('updated_at', { ascending: false });
        if (user) {
          query = query.eq('user_id', user.id);
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
        return res.json(parsedJokes);
      }
      
      if (method === 'POST') {
        const { id, header, sections, isDraft, comments, strikethroughTexts, replacements, isOneLiner } = body;
    const jokeDoc = {
      id,
      header: header || '',
      sections: sections || [],
      is_draft: isDraft !== false,
          is_one_liner: isOneLiner || false,
      comments: comments || {},
      strikethrough_texts: strikethroughTexts || [],
      replacements: replacements || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user?.id || null
        };
        const { error } = await supabaseAdmin.from('jokes').insert([jokeDoc]);
    if (error) throw error;
        return res.json({ message: 'Joke created', id });
      }
    }

    // Single joke endpoints
    const jokeMatch = path.match(/^\/jokes\/([^/]+)$/);
    if (jokeMatch) {
      const jokeId = jokeMatch[1];
      
      if (method === 'GET') {
        const { data, error } = await supabaseAdmin.from('jokes').select('*').eq('id', jokeId).single();
    if (error) {
          if (error.code === 'PGRST116') return res.status(404).json({ error: 'Joke not found' });
      throw error;
    }
        return res.json({
      id: data.id,
      header: data.header,
      sections: data.sections || [],
      isDraft: data.is_draft !== false,
          isOneLiner: data.is_one_liner || false,
      comments: data.comments || {},
      strikethroughTexts: data.strikethrough_texts || [],
      replacements: data.replacements || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
        });
      }
      
      if (method === 'PUT') {
        const { header, sections, isDraft, comments, strikethroughTexts, replacements, isOneLiner } = body;
        const { error } = await supabaseAdmin.from('jokes').update({
      header: header || '',
      sections: sections || [],
      is_draft: isDraft !== false,
          is_one_liner: isOneLiner || false,
      comments: comments || {},
      strikethrough_texts: strikethroughTexts || [],
      replacements: replacements || {},
      updated_at: new Date().toISOString()
        }).eq('id', jokeId);
    if (error) throw error;
        return res.json({ message: 'Joke updated' });
      }
      
      if (method === 'DELETE') {
        const { error } = await supabaseAdmin.from('jokes').delete().eq('id', jokeId);
    if (error) throw error;
        return res.json({ message: 'Joke deleted' });
      }
    }

    // SETS ENDPOINTS
    if (path === '/sets' || path === '/sets/') {
      if (method === 'GET') {
        let query = supabaseAdmin.from('sets').select('*').order('updated_at', { ascending: false });
        if (user) {
          query = query.eq('user_id', user.id);
        } else {
          query = query.is('user_id', null);
        }
        const { data, error } = await query;
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
        return res.json(parsedSets);
      }
      
      if (method === 'POST') {
        const { id, header, type, jokes, jokeDetails, transitions, isDraft } = body;
        const setDoc = {
          id,
          header: header || '',
          type: type || 'short',
          jokes: jokes || [],
          joke_details: jokeDetails || [],
          transitions: transitions || [],
          is_draft: isDraft !== false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user?.id || null
        };
        const { error } = await supabaseAdmin.from('sets').insert([setDoc]);
        if (error) throw error;
        return res.json({ message: 'Set created', id });
      }
    }

    // Single set endpoints
    const setMatch = path.match(/^\/sets\/([^/]+)$/);
    if (setMatch) {
      const setId = setMatch[1];
      
      if (method === 'GET') {
        const { data, error } = await supabaseAdmin.from('sets').select('*').eq('id', setId).single();
    if (error) {
          if (error.code === 'PGRST116') return res.status(404).json({ error: 'Set not found' });
      throw error;
    }
        return res.json({
      id: data.id,
      header: data.header,
      type: data.type,
      jokes: data.jokes || [],
      jokeDetails: data.joke_details || [],
      transitions: data.transitions || [],
      isDraft: data.is_draft !== undefined ? data.is_draft : true,
      createdAt: data.created_at,
      updatedAt: data.updated_at
        });
      }
      
      if (method === 'PUT') {
        const { header, type, jokes, jokeDetails, transitions, isDraft } = body;
        const { error } = await supabaseAdmin.from('sets').update({
      header: header || '',
      type: type || 'short',
      jokes: jokes || [],
      joke_details: jokeDetails || [],
      transitions: transitions || [],
          is_draft: isDraft,
          updated_at: new Date().toISOString()
        }).eq('id', setId);
        if (error) throw error;
        return res.json({ message: 'Set updated' });
      }
      
      if (method === 'DELETE') {
        const { error } = await supabaseAdmin.from('sets').delete().eq('id', setId);
        if (error) throw error;
        return res.json({ message: 'Set deleted' });
      }
    }

    // ANALYSIS ENDPOINTS
    if (path === '/analysis' || path === '/analysis/') {
      if (method === 'GET') {
        let query = supabaseAdmin.from('analysis_results').select('*').order('created_at', { ascending: false });
        if (user) {
          query = query.eq('user_id', user.id);
        } else {
          query = query.is('user_id', null);
        }
        const { data, error } = await query;
        if (error) throw error;
        
        const parsedAnalyses = (data || []).map(a => ({
          id: a.id,
          setId: a.set_id,
          setName: a.set_name,
          audioFileName: a.audio_file_name,
          laughsPerMinute: a.laughs_per_minute,
          avgLaughsPerJoke: a.avg_laughs_per_joke,
          category: a.category,
          timeline: a.timeline || [],
          jokeMetrics: a.joke_metrics || [],
          extractedJokes: a.extracted_jokes || [],
          createdAt: a.created_at,
          speakingPace: a.speaking_pace || null,
          wordCount: a.word_count || null,
          silenceCount: a.silence_count || null,
          effectiveDuration: a.effective_duration || null,
          fullDuration: a.full_duration || null,
          excludedStart: a.excluded_start || 0,
          excludedEnd: a.excluded_end || 0,
          transcriptText: a.transcript_text || null
        }));
        return res.json(parsedAnalyses);
      }
    }

    // Analyze (serverless / mock).
    // NOTE: Deployed serverless does not accept large file uploads; the frontend sends JSON in production.
    if (path === '/analysis/analyze' || path === '/analysis/analyze/') {
      if (method === 'POST') {
    const {
          setId,
          setName,
          audioDuration,
          excludeStartSeconds = 0,
          excludeEndSeconds = 0,
          audioFileName = null,
          storageBucket = null,
          storagePath = null
        } = body || {};

        if (!setId) return res.status(400).json({ error: 'setId is required' });
        if (!setName) return res.status(400).json({ error: 'setName is required' });

        const fullDuration = audioDuration ? Math.max(0, parseInt(audioDuration, 10)) : 300;
        const excludedStart = Math.max(0, parseInt(excludeStartSeconds, 10) || 0);
        const excludedEnd = Math.max(0, parseInt(excludeEndSeconds, 10) || 0);
        const effectiveDuration = Math.max(0, fullDuration - excludedStart - excludedEnd);

        // If AssemblyAI key + storage path exist: kick off real transcription job and return jobId for polling.
        if (ASSEMBLYAI_API_KEY && storageBucket && storagePath) {
          // Signed URL so AssemblyAI can download.
          const { data: signed, error: signedErr } = await supabaseAdmin
            .storage
            .from(storageBucket)
            .createSignedUrl(storagePath, 60 * 60);
          if (signedErr) throw signedErr;

          const job = await fetchAssemblyAI('/transcript', {
            method: 'POST',
            body: JSON.stringify({
              audio_url: signed.signedUrl,
              punctuate: true,
              format_text: true,
              // Helpful extras (not required)
              auto_chapters: true,
            }),
          });

          return res.json({
            status: 'processing',
            jobId: job.id,
            setId,
            setName,
            excludedStart,
            excludedEnd,
            effectiveDuration,
            fullDuration
          });
        }

        // Fallback to mock analysis if no key / no storage upload.
        const timeline = buildMockTimeline(effectiveDuration, 10);
        const { jokeMetrics, totalLaughs } = await buildMockJokeMetrics({ user, setName });
        const avgLaughsPerJoke = jokeMetrics.length ? totalLaughs / jokeMetrics.length : 0;
        const laughsPerMinute = effectiveDuration > 0 ? (totalLaughs / effectiveDuration) * 60 : 0;
        const category = categorize(laughsPerMinute, avgLaughsPerJoke);

        // Mock advanced analytics (estimated values - clearly marked as estimates)
        // These are approximations since we don't have actual transcript data
        const estimatedWordCount = Math.floor(effectiveDuration * 2.5); // ~150 WPM average
        const mockSpeakingPace = 150; // Typical speaking pace
        const mockSilenceCount = Math.max(0, Math.floor(totalLaughs * 1.2)); // Slightly more silence gaps than laughs

        const analysisId = `${Date.now()}`;
        const analysisDoc = {
          id: analysisId,
          set_id: setId,
          set_name: setName,
          audio_file_name: audioFileName,
          laughs_per_minute: Number(laughsPerMinute.toFixed(2)),
          avg_laughs_per_joke: Number(avgLaughsPerJoke.toFixed(2)),
          category,
          timeline,
          joke_metrics: jokeMetrics,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user?.id || null
        };

        const { error } = await supabaseAdmin.from('analysis_results').insert([analysisDoc]);
    if (error) throw error;
    
        return res.json({
          id: analysisId,
          setName,
          laughsPerMinute: analysisDoc.laughs_per_minute,
          avgLaughsPerJoke: analysisDoc.avg_laughs_per_joke,
          category,
          timeline,
          jokeMetrics,
          maxLaughs: Math.max(...jokeMetrics.map(m => m.laughs), 1),
          excludedStart,
          excludedEnd,
          effectiveDuration,
          fullDuration,
          isMockData: true,
          speakingPace: mockSpeakingPace,
          wordCount: estimatedWordCount,
          silenceCount: mockSilenceCount
        });
      }
    }

    // Poll an AssemblyAI transcript job; once complete, compute metrics + persist analysis.
    const jobMatch = path.match(/^\/analysis\/job\/([^/]+)$/);
    if (jobMatch) {
      const jobId = jobMatch[1];
      if (method === 'GET') {
        if (!ASSEMBLYAI_API_KEY) return res.status(400).json({ error: 'ASSEMBLYAI_API_KEY is missing on server' });

        const setId = req.query?.setId || null;
        const setName = req.query?.setName || null;
        const audioDuration = req.query?.audioDuration ? parseInt(req.query.audioDuration, 10) : null;
        const excludeStartSeconds = req.query?.excludeStartSeconds ? parseInt(req.query.excludeStartSeconds, 10) : 0;
        const excludeEndSeconds = req.query?.excludeEndSeconds ? parseInt(req.query.excludeEndSeconds, 10) : 0;
        const audioFileName = req.query?.audioFileName || null;

        const job = await fetchAssemblyAI(`/transcript/${jobId}`, { method: 'GET' });
        if (job.status !== 'completed') {
          if (job.status === 'error') {
            return res.status(500).json({ error: job.error || 'AssemblyAI job failed', status: 'error' });
          }
          return res.json({ status: job.status, jobId });
        }

        // Already saved? (id = jobId)
        const existing = await supabaseAdmin.from('analysis_results').select('*').eq('id', jobId).maybeSingle();
        if (existing?.data) {
          const a = existing.data;
          return res.json({
            id: a.id,
            setName: a.set_name,
            laughsPerMinute: a.laughs_per_minute,
            avgLaughsPerJoke: a.avg_laughs_per_joke,
            category: a.category,
            timeline: a.timeline || [],
            jokeMetrics: a.joke_metrics || [],
            extractedJokes: a.extracted_jokes || [],
            transcriptText: a.transcript_text || job.text || '',
            isMockData: false,
            speakingPace: a.speaking_pace || null,
            wordCount: a.word_count || null,
            silenceCount: a.silence_count || null,
            effectiveDuration: a.effective_duration || null,
            fullDuration: a.full_duration || null,
            excludedStart: a.excluded_start || 0,
            excludedEnd: a.excluded_end || 0
          });
        }

        const fullDuration = audioDuration || Math.ceil((job.audio_duration || 300));
        const excludedStart = Math.max(0, excludeStartSeconds || 0);
        const excludedEnd = Math.max(0, excludeEndSeconds || 0);
        const effectiveDuration = Math.max(0, fullDuration - excludedStart - excludedEnd);

        // Compute advanced analytics using robust calculation from word timestamps
        const advancedAnalytics = computeAdvancedAnalytics(job, excludedStart, excludedEnd, audioDuration);
        const { wordCount, speakingPace, silenceCount } = advancedAnalytics;
        
        // Use effective duration from advanced analytics if available, otherwise fall back
        const calculatedEffectiveDuration = advancedAnalytics.effectiveDuration || effectiveDuration;
        
        // Build timeline from pauses (words with timestamps) using calculated duration
        const timeline = computeLaughTimelineFromWords(job.words || [], calculatedEffectiveDuration, 10);
        const totalLaughs = timeline.reduce((s, p) => s + (p.laughs || 0), 0);
        const laughsPerMinute = calculatedEffectiveDuration > 0 ? (totalLaughs / calculatedEffectiveDuration) * 60 : 0;
        
        const transcriptText = job.text || '';
  
        // Estimate duration in minutes for joke segmentation
        const estimatedMinutes = calculatedEffectiveDuration ? Math.ceil(calculatedEffectiveDuration / 60) : 7;
        
        // Taxonomy-based topic classification (single pass)
        const { jokeMetrics: rawJokeMetrics, classifiedSegments } = await buildJokeMetricsFromTranscript({
          transcriptText,
          jobWords: job.words || [],
          jobChapters: job.chapters || null,
          estimatedMinutes
        });
        let jokeMetrics = rawJokeMetrics;

        const extractedJokes = classifiedSegments.map(segment => ({
          index: segment.index !== undefined ? segment.index : classifiedSegments.indexOf(segment),
          header: segment.matchedHeader || segment.headline || `Joke ${segment.index !== undefined ? segment.index + 1 : classifiedSegments.indexOf(segment) + 1}`,
          topic: segment.topic || 'Other',
          subtopic: segment.subtopic || 'general',
          text: segment.text || '',
          startTime: segment.startTime || null,
          endTime: segment.endTime || null,
          duration: segment.endTime && segment.startTime ? segment.endTime - segment.startTime : null
        }));

        // Distribute laughs evenly across jokes for display
        if (jokeMetrics.length) {
          const per = Math.floor(totalLaughs / jokeMetrics.length);
          let rem = totalLaughs - per * jokeMetrics.length;
          jokeMetrics = jokeMetrics.map(j => {
            const add = rem > 0 ? 1 : 0;
            rem -= add;
            return { ...j, laughs: per + add };
          });
        }

        // Aggregate laughs by topic for analysis
        const topicSummaries = jokeMetrics.reduce((acc, j) => {
          const t = j.topic || 'Other';
          if (!acc[t]) acc[t] = { laughs: 0, jokeCount: 0 };
          acc[t].laughs += j.laughs || 0;
          acc[t].jokeCount += 1;
          return acc;
        }, {});

        const avgLaughsPerJoke = jokeMetrics.length ? totalLaughs / jokeMetrics.length : 0;
        const category = categorize(laughsPerMinute, avgLaughsPerJoke);

        const analysisDoc = {
          id: jobId,
          set_id: setId || `${Date.now()}`,
          set_name: setName || 'Untitled Set',
          audio_file_name: audioFileName,
          laughs_per_minute: Number(laughsPerMinute.toFixed(2)),
          avg_laughs_per_joke: Number(avgLaughsPerJoke.toFixed(2)),
          category,
          timeline,
          joke_metrics: jokeMetrics,
          extracted_jokes: extractedJokes,
          topic_summaries: topicSummaries,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user?.id || null,
          speaking_pace: speakingPace,
          word_count: wordCount,
          silence_count: silenceCount,
          effective_duration: calculatedEffectiveDuration,
          full_duration: fullDuration,
          excluded_start: excludedStart,
          excluded_end: excludedEnd
        };

        // Try to save transcript text if the column exists; otherwise save without it.
        const { error: insertErr1 } = await supabaseAdmin.from('analysis_results').insert([{
          ...analysisDoc,
          transcript_text: job.text || ''
        }]);
        if (insertErr1) {
          const msg = insertErr1.message || insertErr1.details || '';
          if (msg.includes('transcript_text') || msg.includes('topic_summaries') || msg.includes('schema cache')) {
            const { topic_summaries: _ts, ...fallbackDoc } = analysisDoc;
            const { error: insertErr2 } = await supabaseAdmin.from('analysis_results').insert([fallbackDoc]);
            if (insertErr2) throw insertErr2;
          } else {
            throw insertErr1;
          }
        }

        return res.json({
          status: 'completed',
          id: jobId,
          setName: analysisDoc.set_name,
          laughsPerMinute: analysisDoc.laughs_per_minute,
          avgLaughsPerJoke: analysisDoc.avg_laughs_per_joke,
          category,
          timeline,
          jokeMetrics,
          extractedJokes: extractedJokes,
          topicSummaries,
          transcriptText,
          isMockData: false,
          excludedStart,
          excludedEnd,
          effectiveDuration: calculatedEffectiveDuration,
          fullDuration,
          speakingPace,
          wordCount,
          silenceCount
        });
      }
    }

    const analysisMatch = path.match(/^\/analysis\/([^/]+)$/);
    if (analysisMatch) {
      const analysisId = analysisMatch[1];
      
      if (method === 'GET') {
        const { data, error } = await supabaseAdmin.from('analysis_results').select('*').eq('id', analysisId).single();
    if (error) {
          if (error.code === 'PGRST116') return res.status(404).json({ error: 'Analysis not found' });
      throw error;
    }
        return res.json({
      id: data.id,
      setId: data.set_id,
      setName: data.set_name,
      audioFileName: data.audio_file_name,
          laughsPerMinute: data.laughs_per_minute,
          avgLaughsPerJoke: data.avg_laughs_per_joke,
      category: data.category,
      timeline: data.timeline || [],
      jokeMetrics: data.joke_metrics || [],
      extractedJokes: data.extracted_jokes || [],
      topicSummaries: data.topic_summaries || {},
      transcriptText: data.transcript_text || null,
          createdAt: data.created_at
        });
      }
      
      if (method === 'DELETE') {
        const { error } = await supabaseAdmin.from('analysis_results').delete().eq('id', analysisId);
    if (error) throw error;
        return res.json({ message: 'Analysis deleted' });
      }
    }

    // COMEDY STYLE ANALYSIS ENDPOINTS
    // Direct text analysis (no AssemblyAI needed)
    if (path === '/comedy-style/analyze-text' || path === '/comedy-style/analyze-text/') {
      if (method === 'POST') {
        const { transcriptText } = body || {};
        
        if (!transcriptText || !transcriptText.trim()) {
          return res.status(400).json({ error: 'transcriptText is required' });
        }

        try {
          // Analyze transcript directly (no words array, but analysis functions handle this)
          const styleTags = await analyzeComedyStyles(transcriptText);
          const writingElements = analyzeWritingElements(transcriptText, []); // Empty words array for direct text
          const bloomTools = analyzeAdamBloomTools(transcriptText, []); // Empty words array
          const summary = generateStyleSummary(styleTags, writingElements, bloomTools);

          // Truncate transcript if too long
          const MAX_TRANSCRIPT_LENGTH = 5000;
          const transcriptPreview = transcriptText.length > MAX_TRANSCRIPT_LENGTH
            ? transcriptText.substring(0, MAX_TRANSCRIPT_LENGTH) + '... (truncated)'
            : transcriptText;

          return res.json({
            status: 'completed',
            result: {
              styleTags,
              writingElements,
              bloomTools,
              summary,
              transcriptText: transcriptPreview,
              transcriptLength: transcriptText.length,
              wordCount: transcriptText.split(/\s+/).length
            }
          });
        } catch (error) {
          console.error('Error analyzing transcript text:', error);
          return res.status(500).json({ 
            status: 'failed',
            error: error.message || 'Failed to analyze transcript' 
          });
        }
      }
    }

    // Audio/video analysis (uses AssemblyAI)
    if (path === '/comedy-style/analyze' || path === '/comedy-style/analyze/') {
      if (method === 'POST') {
        const { fileName, storageBucket, storagePath } = body || {};
        
        if (!ASSEMBLYAI_API_KEY) {
          return res.status(400).json({ error: 'ASSEMBLYAI_API_KEY is missing on server' });
        }

        if (!storageBucket || !storagePath) {
          return res.status(400).json({ error: 'storageBucket and storagePath are required' });
        }

        // Create signed URL for AssemblyAI
        const { data: signed, error: signedErr } = await supabaseAdmin
          .storage
          .from(storageBucket)
          .createSignedUrl(storagePath, 60 * 60);
        if (signedErr) throw signedErr;

        // Start AssemblyAI transcription
        const job = await fetchAssemblyAI('/transcript', {
          method: 'POST',
          body: JSON.stringify({
            audio_url: signed.signedUrl,
            punctuate: true,
            format_text: true,
            auto_chapters: true,
          }),
        });

        return res.json({
          status: 'processing',
          jobId: job.id,
          fileName
        });
      }
    }

    // COMEDY STYLE JOB POLLING
    const styleJobMatch = path.match(/^\/comedy-style\/job\/(.+)$/);
    if (styleJobMatch && method === 'GET') {
      const jobId = styleJobMatch[1];
      
      if (!ASSEMBLYAI_API_KEY) {
        return res.status(400).json({ error: 'ASSEMBLYAI_API_KEY is missing on server', status: 'failed' });
      }

      try {
        const job = await fetchAssemblyAI(`/transcript/${jobId}`, { method: 'GET' });
        
        if (job.status === 'error') {
          return res.status(500).json({ 
            status: 'failed',
            error: job.error || 'AssemblyAI job failed' 
          });
        }

        if (job.status !== 'completed') {
          return res.json({ status: job.status, jobId });
        }

        // Job completed - analyze transcript
        const transcriptText = job.text || '';
        const words = job.words || [];
        
        // Enhanced analysis with Adam Bloom tools
        const styleTags = await analyzeComedyStyles(transcriptText);
        const writingElements = analyzeWritingElements(transcriptText, words);
        const bloomTools = analyzeAdamBloomTools(transcriptText, words);
        const summary = generateStyleSummary(styleTags, writingElements, bloomTools);

        // Truncate transcript if too long to avoid response size limits
        // Vercel has ~4.5MB response limit, so we'll include a preview only
        const MAX_TRANSCRIPT_LENGTH = 5000; // ~1000 words
        const transcriptPreview = transcriptText.length > MAX_TRANSCRIPT_LENGTH
          ? transcriptText.substring(0, MAX_TRANSCRIPT_LENGTH) + '... (truncated)'
          : transcriptText;

        return res.json({
          status: 'completed',
          result: {
            styleTags,
            writingElements,
            bloomTools,
            summary,
            transcriptText: transcriptPreview,
            transcriptLength: transcriptText.length,
            wordCount: words.length
          }
        });
      } catch (error) {
        console.error('Error fetching AssemblyAI job:', error);
        return res.status(500).json({ 
          status: 'failed',
          error: error.message || 'Failed to fetch transcript status' 
        });
      }
    }

    return res.status(404).json({ error: 'Not found', path });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Count syllables in a word (JavaScript implementation)
const countSyllables = (word) => {
  if (!word || word.length === 0) return 1;
  
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleaned.length <= 2) return 1;
  
  // Count vowel groups
  const vowelGroups = cleaned.match(/[aeiou]+/g);
  let count = vowelGroups ? vowelGroups.length : 0;
  
  // Adjust for silent 'e' at end
  if (cleaned.endsWith('e') && count > 1) count--;
  
  // Adjust for diphthongs
  const diphthongs = (cleaned.match(/[aeiou]{2}/g) || []).length;
  if (diphthongs > 0) count = Math.max(1, count - diphthongs + 1);
  
  return Math.max(1, count);
};

// OpenAI zero-shot classification for comedy styles (optional enhancement)
const classifyStylesWithOpenAI = async (transcriptText) => {
  if (!OPENAI_API_KEY || !transcriptText) {
    console.log('Skipping OpenAI classification: missing key or empty transcript');
    return null;
  }
  
  try {
    const COMEDY_STYLES_LIST = [
      'Anecdotal', 'Clowning', 'Edgy', 'Fantastical', 'Heartfelt',
      'Observational', 'Opinionated', 'Playful', 'Puns', 'Philosophical',
      'Sarcasm', 'Satire', 'Self-deprecation', 'Shock', 'Superiority',
      'Surrealism', 'Tragedy', 'Wordplay'
    ];
    
    // Truncate transcript if too long (OpenAI has token limits)
    const maxLength = 2000; // ~500 words
    const truncatedText = transcriptText.length > maxLength 
      ? transcriptText.substring(0, maxLength) + '...'
      : transcriptText;
    
    console.log('Calling OpenAI API for style classification...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert comedy analyst. Return only valid JSON with style names as keys and scores (0.0-1.0) as values. Do not include any explanations, only the JSON object.'
          },
          {
            role: 'user',
            content: `Analyze this comedy bit and classify which comedy styles apply. Rate each style from 0.0 to 1.0 based on how strongly it applies:\n\n"${truncatedText}"\n\nAvailable styles: ${COMEDY_STYLES_LIST.join(', ')}\n\nReturn a JSON object where keys are style names and values are scores (0.0-1.0). Example format: {"Observational": 0.9, "Sarcasm": 0.7, "Self-deprecation": 0.5}`
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('OpenAI API returned empty content');
      return null;
    }
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON in code blocks
      jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) jsonMatch = [jsonMatch[1]];
    }
    
    if (jsonMatch) {
      const scores = JSON.parse(jsonMatch[0]);
      const result = COMEDY_STYLES_LIST.map(style => ({
        name: style,
        score: Math.min(1, Math.max(0, parseFloat(scores[style] || 0)))
      }));
      console.log('✅ OpenAI classification successful');
      return result;
    } else {
      console.error('Could not extract JSON from OpenAI response:', content.substring(0, 200));
    }
  } catch (err) {
    console.error('OpenAI classification error:', err.message);
    // Don't throw - fall back to keyword-based classification
  }
  
  return null;
};

// Analyze comedy style tags from transcript (with optional OpenAI zero-shot classification)
const analyzeComedyStyles = async (transcriptText) => {
  if (!transcriptText) return [];

  // Try OpenAI zero-shot classification first (if API key available)
  const openaiScores = await classifyStylesWithOpenAI(transcriptText);
  if (openaiScores) {
    return openaiScores.sort((a, b) => b.score - a.score);
  }

  // Fallback to keyword-based classification
  const text = transcriptText.toLowerCase();
  const styles = [
    {
      name: 'Anecdotal',
      keywords: ['story', 'happened', 'one time', 'remember', 'when i', 'told me', 'went to', 'experience', 'once', 'narrative'],
      weight: 1.0
    },
    {
      name: 'Clowning',
      keywords: ['silly', 'ridiculous', 'absurd', 'goofy', 'funny', 'weird', 'strange', 'crazy', 'wacky', 'nuts'],
      weight: 1.0
    },
    {
      name: 'Edgy',
      keywords: ['damn', 'hell', 'fuck', 'shit', 'controversial', 'offensive', 'dark', 'boundary', 'taboo', 'provocative'],
      weight: 1.2
    },
    {
      name: 'Fantastical',
      keywords: ['imagine', 'magic', 'fantasy', 'dream', 'unreal', 'impossible', 'supernatural', 'alien', 'monster', 'fairy'],
      weight: 1.0
    },
    {
      name: 'Heartfelt',
      keywords: ['love', 'family', 'heart', 'feelings', 'emotion', 'touching', 'sweet', 'meaningful', 'genuine', 'sincere'],
      weight: 1.0
    },
    {
      name: 'Observational',
      keywords: ['notice', 'did you ever', 'what is it with', 'why is it', 'always', 'never', 'everyone', 'people', 'thing about', 'observation'],
      weight: 1.1
    },
    {
      name: 'Opinionated',
      keywords: ['think', 'believe', 'opinion', 'should', 'wrong', 'right', 'stupid', 'dumb', 'ridiculous', 'hate', 'love'],
      weight: 1.0
    },
    {
      name: 'Playful',
      keywords: ['play', 'fun', 'joke', 'teasing', 'banter', 'cheeky', 'witty', 'clever', 'humor', 'amusing'],
      weight: 1.0
    },
    {
      name: 'Puns',
      keywords: ['pun', 'play on words', 'double meaning', 'wordplay', 'punny'],
      weight: 1.3
    },
    {
      name: 'Philosophical',
      keywords: ['meaning', 'life', 'exist', 'universe', 'reality', 'truth', 'question', 'wonder', 'think about', 'deep'],
      weight: 1.1
    },
    {
      name: 'Sarcasm',
      keywords: ['yeah right', 'sure', 'obviously', 'totally', 'great', 'wonderful', 'perfect', 'love that', 'sarcastic', 'ironic'],
      weight: 1.2
    },
    {
      name: 'Satire',
      keywords: ['society', 'politics', 'government', 'system', 'institution', 'mock', 'parody', 'criticize', 'satirical'],
      weight: 1.1
    },
    {
      name: 'Self-deprecation',
      keywords: ['i\'m so', 'i\'m terrible', 'i suck', 'i\'m bad', 'i can\'t', 'i\'m not good', 'pathetic', 'loser', 'myself', 'i\'m an idiot'],
      weight: 1.2
    },
    {
      name: 'Shock',
      keywords: ['what the', 'holy', 'unbelievable', 'incredible', 'amazing', 'wow', 'seriously', 'no way', 'shocking'],
      weight: 1.0
    },
    {
      name: 'Superiority',
      keywords: ['better than', 'smarter', 'above', 'superior', 'i\'m better', 'others are', 'i\'m the best', 'everyone else'],
      weight: 1.1
    },
    {
      name: 'Surrealism',
      keywords: ['surreal', 'dreamlike', 'bizarre', 'abstract', 'unrealistic', 'weird', 'strange', 'odd', 'peculiar'],
      weight: 1.0
    },
    {
      name: 'Tragedy',
      keywords: ['sad', 'tragic', 'depressing', 'miserable', 'unfortunate', 'suffering', 'pain', 'loss', 'death', 'grief'],
      weight: 1.1
    },
    {
      name: 'Wordplay',
      keywords: ['word', 'pun', 'double', 'meaning', 'play on', 'clever', 'wit', 'verbal', 'linguistic'],
      weight: 1.2
    }
  ];

  const scores = styles.map(style => {
    let matches = 0;
    style.keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const count = (text.match(regex) || []).length;
      matches += count;
    });
    
    // Normalize score (0-1) based on transcript length and keyword matches
    const wordCount = text.split(/\s+/).length;
    const normalizedScore = Math.min(1, (matches * style.weight) / Math.max(100, wordCount / 10));
    
    return {
      name: style.name,
      score: normalizedScore
    };
  });

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  return scores;
};

// Analyze writing elements from transcript
const analyzeWritingElements = (transcriptText, words = []) => {
  if (!transcriptText) return [];

  const text = transcriptText.toLowerCase();
  const sentences = transcriptText.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
  const wordArray = text.split(/\s+/);

  const elements = [
    {
      name: 'Setup-Punchline Structure',
      detect: () => {
        // Look for question-answer patterns, contrast patterns
        const questionPattern = /(what|why|how|when|where|who|which)\s+[^?.]*[?]/gi;
        const questions = (transcriptText.match(questionPattern) || []).length;
        // Look for contrast words (but, however, except, instead)
        const contrastWords = (text.match(/\b(but|however|except|instead|yet|although)\b/gi) || []).length;
        return Math.min(1, (questions * 0.3 + contrastWords * 0.1) / Math.max(1, sentences.length / 5));
      }
    },
    {
      name: 'Callbacks',
      detect: () => {
        // Look for repeated phrases/concepts (indicating callbacks)
        const phrases = {};
        sentences.forEach(s => {
          const words = s.toLowerCase().split(/\s+/).filter(w => w.length > 4);
          words.forEach((w, i) => {
            if (i < words.length - 2) {
              const phrase = `${w} ${words[i + 1]}`;
              phrases[phrase] = (phrases[phrase] || 0) + 1;
            }
          });
        });
        const repeated = Object.values(phrases).filter(count => count >= 2).length;
        return Math.min(1, repeated / Math.max(3, sentences.length / 10));
      }
    },
    {
      name: 'Tags (Add-on jokes)',
      detect: () => {
        // Look for quick follow-up sentences after main points
        const shortFollowUps = sentences.filter(s => {
          const words = s.trim().split(/\s+/);
          return words.length > 3 && words.length < 15;
        }).length;
        return Math.min(1, shortFollowUps / Math.max(5, sentences.length / 3));
      }
    },
    {
      name: 'Rule of Three',
      detect: () => {
        // Look for lists of three items
        const threePattern = /[^.!?]*,\s*[^.!?]*,\s+and\s+[^.!?]*[.!?]/gi;
        const matches = (transcriptText.match(threePattern) || []).length;
        return Math.min(1, matches / Math.max(2, sentences.length / 10));
      }
    },
    {
      name: 'Incongruity',
      detect: () => {
        // Look for unexpected combinations or contradictions (stricter: exclude filler)
        const strongMarkers = (text.match(/\b(but|however|unlike|instead|rather|opposite|contradiction)\b/gi) || []).length;
        const turnMarkers = (text.match(/\b(wait|actually|turns out|except|although)\b/gi) || []).length;
        const score = (strongMarkers * 0.8 + turnMarkers * 0.4) / Math.max(12, wordArray.length / 30);
        return Math.min(1, score);
      }
    },
    {
      name: 'Misdirection',
      detect: () => {
        // Look for turns or shifts in narrative
        const turns = (text.match(/\b(then|suddenly|but then|actually|wait|oh|turns out)\b/gi) || []).length;
        return Math.min(1, turns / Math.max(3, sentences.length / 5));
      }
    },
    {
      name: 'Exaggeration',
      detect: () => {
        // Look for extreme language
        const extremes = (text.match(/\b(never|always|every|all|huge|tiny|massive|giant|enormous|infinite|perfect|worst|best)\b/gi) || []).length;
        return Math.min(1, extremes / Math.max(5, wordArray.length / 30));
      }
    },
    {
      name: 'Self-Awareness',
      detect: () => {
        // Look for meta-commentary
        const meta = (text.match(/\b(i know|i realize|i notice|i\'m aware|admit|confess)\b/gi) || []).length;
        return Math.min(1, meta / Math.max(2, sentences.length / 10));
      }
    },
    {
      name: 'Storytelling Arc',
      detect: () => {
        // Look for narrative structure (beginning, middle, end markers)
        const storyMarkers = (text.match(/\b(started|began|then|next|finally|ended|finished|conclusion)\b/gi) || []).length;
        const avgSentenceLength = wordArray.length / Math.max(1, sentences.length);
        return Math.min(1, (storyMarkers * 0.3) / Math.max(3, sentences.length / 15) + (avgSentenceLength > 15 ? 0.3 : 0));
      }
    },
    {
      name: 'Timing & Pacing',
      detect: () => {
        // Only meaningful with word timestamps (pauses between words)
        if (words.length > 0) {
          const pauses = [];
          for (let i = 1; i < words.length; i++) {
            const gap = (words[i].start || 0) - (words[i - 1].end || 0);
            if (gap > 500) pauses.push(gap);
          }
          const avgPause = pauses.length > 0 ? pauses.reduce((a, b) => a + b, 0) / pauses.length : 0;
          const score = pauses.length / Math.max(12, wordArray.length / 80) * (avgPause > 1000 ? 1.1 : 1.0);
          return Math.min(1, score);
        }
        // No timestamps: can't assess timing from text alone. Return low score to indicate unknown.
        return 0.15;
      }
    },
    {
      name: 'Repetition',
      detect: () => {
        // Intentional repetition: same word 5+ times (emphasis), or repeated phrases close together
        const commonWords = new Set(['about', 'think', 'people', 'something', 'really', 'because', 'would', 'could', 'which', 'their', 'there', 'other', 'going', 'being', 'where', 'never', 'every', 'always']);
        const wordFreq = {};
        wordArray.forEach(w => {
          const clean = w.toLowerCase().replace(/[^a-z]/g, '');
          if (clean.length >= 5 && !commonWords.has(clean)) {
            wordFreq[clean] = (wordFreq[clean] || 0) + 1;
          }
        });
        const intentionalRepetition = Object.values(wordFreq).filter(count => count >= 5).length;
        const denom = Math.max(6, wordArray.length / 60);
        return Math.min(1, intentionalRepetition / denom);
      }
    },
    {
      name: 'Contrast',
      detect: () => {
        // Look for contrasting ideas - higher threshold, scale with transcript length
        const contrasts = (text.match(/\b(but|however|unlike|versus|instead|rather|different|opposite)\b/gi) || []).length;
        const denom = Math.max(10, wordArray.length / 50);
        return Math.min(1, contrasts / denom);
      }
    },
    {
      name: 'Personification',
      detect: () => {
        // Look for objects/animals described with human traits
        const personification = (text.match(/\b(it|they|he|she)\s+(think|feel|know|want|believe|decide|try)\b/gi) || []).length;
        return Math.min(1, personification / Math.max(2, sentences.length / 15));
      }
    },
    {
      name: 'Irony',
      detect: () => {
        // Look for ironic statements
        const irony = (text.match(/\b(of course|naturally|obviously|perfectly|exactly)\b/gi) || []).length;
        const sarcasm = (text.match(/\b(yeah right|sure|great|wonderful|lovely)\b/gi) || []).length;
        return Math.min(1, (irony + sarcasm * 1.5) / Math.max(2, sentences.length / 8));
      }
    }
  ];

  return elements.map(element => ({
    name: element.name,
    score: element.detect()
  })).sort((a, b) => b.score - a.score);
};

// Analyze Adam Bloom's comedy tools
const analyzeAdamBloomTools = (transcriptText, words = []) => {
  if (!transcriptText) {
    return {
      seesawTheory: { detected: false, description: 'Setup should be longer than punchline' },
      balloonPop: { detected: false, description: 'Tension builds then releases at reveal' },
      wordSmuggling: { detected: false, description: 'Punchline word hidden in casual sentence' },
      toppers: { detected: false, description: 'Follow-up jokes on same premise' },
      trimming: { opportunities: [], description: 'Redundant syllables/words to remove' }
    };
  }

  const sentences = transcriptText.split(/[.!?]+\s+/).filter(s => s.trim().length > 0);
  const text = transcriptText.toLowerCase();

  // 1. Seesaw Theory: Setup longer than punchline (punchline should be shorter)
  let seesawDetected = false;
  if (sentences.length >= 2) {
    const setupText = sentences.slice(0, -1).join(' ');
    const punchlineText = sentences[sentences.length - 1];
    const setupSyllables = setupText.split(/\s+/).reduce((sum, word) => sum + countSyllables(word), 0);
    const punchlineSyllables = punchlineText.split(/\s+/).reduce((sum, word) => sum + countSyllables(word), 0);
    if (setupSyllables > 0 && punchlineSyllables > 0) {
      const ratio = punchlineSyllables / setupSyllables;
      seesawDetected = ratio < 0.7; // Punchline is 30%+ shorter
    }
  }

  // 2. Balloon Pop: Buildup followed by reveal
  const buildupPatterns = [
    /(so|then|and|but|until|when|suddenly)\s+[^.!?]{10,}/i,
    /(turns out|actually|really|just|only)/i,
    /(wait|hold on|no way|you know what)/i
  ];
  const revealPatterns = [
    /\b(just|only|actually|really|turns out|but|however)\b/i,
    /\b(not|never|no|nobody|nothing)\b/i,
    /\b(was|is|are|were)\s+\w+ing/i
  ];
  let balloonPopDetected = false;
  const hasBuildup = buildupPatterns.some(pattern => pattern.test(text));
  const hasReveal = revealPatterns.some(pattern => pattern.test(text));
  if (hasBuildup && hasReveal) {
    // Simple check: if both patterns exist, likely balloon pop
    balloonPopDetected = true;
  }

  // 3. Word Smuggling: Key word hidden in casual sentence (simplified detection)
  let wordSmugglingDetected = false;
  if (sentences.length > 0) {
    const lastSentence = sentences[sentences.length - 1];
    const wordsInLast = lastSentence.split(/\s+/);
    // Basic heuristic: last sentence has mix of common and uncommon words
    if (wordsInLast.length >= 3 && wordsInLast.length <= 15) {
      wordSmugglingDetected = true; // Simplified: assume potential if last sentence is medium length
    }
  }

  // 4. Toppers: Follow-up jokes on same premise (requires previous context - simplified)
  // For a single transcript, we can't detect toppers without previous bits
  // But we can check for repeated concepts/words that might indicate topper structure
  const topperDetected = false; // Would need previous bit to properly detect

  // 5. Trimming Opportunities: Redundant words/phrases
  const trimmingOpportunities = [];
  const fillers = ['like', 'you know', 'um', 'uh', 'actually', 'basically', 'literally', 'really', 'very', 'pretty', 'quite', 'sort of', 'kind of', 'i mean'];
  fillers.forEach(filler => {
    const regex = new RegExp(`\\b${filler.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      trimmingOpportunities.push(`Remove filler: "${filler}" (${matches.length} occurrence${matches.length > 1 ? 's' : ''})`);
    }
  });
  
  // Check for redundant qualifiers
  const redundantPatterns = [
    /\b(really|very|pretty|quite)\s+(really|very|pretty|quite)\s+/gi,
    /\b(kind of|sort of)\s+\w+/gi
  ];
  redundantPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        trimmingOpportunities.push(`Trim redundant: "${match.trim()}"`);
      });
    }
  });

  return {
    seesawTheory: { 
      detected: seesawDetected, 
      description: 'Setup should be longer (more syllables) than punchline' 
    },
    balloonPop: { 
      detected: balloonPopDetected, 
      description: 'Tension builds then releases at reveal word/phrase' 
    },
    wordSmuggling: { 
      detected: wordSmugglingDetected, 
      description: 'Punchline word hidden inside casual sentence' 
    },
    toppers: { 
      detected: topperDetected, 
      description: 'Follow-up jokes on the same premise (requires comparison with previous bits)' 
    },
    trimming: { 
      opportunities: trimmingOpportunities.slice(0, 10), // Limit to 10
      description: 'Redundant syllables/words to remove for tighter delivery' 
    }
  };
};

// Generate a summary of the comedy style
const generateStyleSummary = (styleTags, writingElements, bloomTools = null) => {
  const topStyles = styleTags.slice(0, 3).filter(s => s.score > 0.1);
  const topElements = writingElements.slice(0, 3).filter(e => e.score > 0.1);

  let summary = 'Your comedy style is ';
  
  if (topStyles.length > 0) {
    summary += `primarily ${topStyles.map(s => s.name.toLowerCase()).join(', ')}`;
    if (topStyles.length > 1) {
      summary += `, with strong elements of ${topStyles[1].name.toLowerCase()}`;
    }
  } else {
    summary += 'diverse and multifaceted';
  }

  if (topElements.length > 0) {
    summary += `. Your writing shows strong use of ${topElements[0].name.toLowerCase()}`;
    if (topElements.length > 1) {
      summary += ` and ${topElements[1].name.toLowerCase()}`;
    }
  }

  if (bloomTools) {
    const detectedTools = [];
    if (bloomTools.seesawTheory?.detected) detectedTools.push('Seesaw Theory');
    if (bloomTools.balloonPop?.detected) detectedTools.push('Balloon Pop');
    if (bloomTools.wordSmuggling?.detected) detectedTools.push('Word Smuggling');
    if (detectedTools.length > 0) {
      summary += `. You employ ${detectedTools.join(', ')} techniques`;
    }
  }

  summary += '.';

  return summary;
};
