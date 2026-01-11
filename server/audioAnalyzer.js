import fetch from 'node-fetch';
import fs from 'fs';

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

/**
 * Comedy topic categories for AI classification
 */
const COMEDY_TOPICS = [
  { keywords: ['dating', 'date', 'tinder', 'bumble', 'girlfriend', 'boyfriend', 'relationship', 'marriage', 'wife', 'husband', 'ex', 'single'], category: 'Dating & Relationships' },
  { keywords: ['family', 'mom', 'dad', 'mother', 'father', 'parents', 'kids', 'children', 'brother', 'sister', 'grandma', 'grandpa'], category: 'Family' },
  { keywords: ['work', 'job', 'boss', 'office', 'meeting', 'coworker', 'employee', 'salary', 'fired', 'hired', 'interview'], category: 'Work & Career' },
  { keywords: ['phone', 'internet', 'app', 'social media', 'instagram', 'facebook', 'twitter', 'tiktok', 'google', 'amazon', 'tech'], category: 'Technology' },
  { keywords: ['food', 'eating', 'restaurant', 'cooking', 'diet', 'fat', 'pizza', 'drunk', 'drinking', 'beer', 'wine', 'alcohol'], category: 'Food & Drinking' },
  { keywords: ['gym', 'exercise', 'workout', 'fitness', 'running', 'yoga', 'health', 'doctor', 'hospital', 'sick'], category: 'Health & Fitness' },
  { keywords: ['money', 'broke', 'rich', 'poor', 'rent', 'expensive', 'cheap', 'buy', 'spend', 'save', 'credit card'], category: 'Money' },
  { keywords: ['sex', 'sexy', 'naked', 'bed', 'hook up', 'one night'], category: 'Adult Humor' },
  { keywords: ['travel', 'flight', 'airplane', 'airport', 'vacation', 'hotel', 'trip', 'uber', 'lyft', 'driving', 'car'], category: 'Travel' },
  { keywords: ['school', 'college', 'student', 'teacher', 'class', 'homework', 'degree', 'graduate'], category: 'Education' },
  { keywords: ['pet', 'dog', 'cat', 'animal'], category: 'Pets & Animals' },
  { keywords: ['politics', 'president', 'government', 'vote', 'election', 'democrat', 'republican'], category: 'Politics' },
  { keywords: ['old', 'young', 'age', 'millennial', 'boomer', 'gen z', 'generation'], category: 'Generational' },
  { keywords: ['weird', 'crazy', 'strange', 'awkward', 'embarrassing'], category: 'Awkward Moments' },
  { keywords: ['growing up', 'childhood', 'kid', 'when i was'], category: 'Growing Up' }
];

/**
 * Classify joke topic using keyword-based classification (fallback when AI is unavailable)
 */
function classifyJokeTopic(text) {
  const lowerText = text.toLowerCase();
  
  // Use keyword-based classification
  for (const topic of COMEDY_TOPICS) {
    for (const keyword of topic.keywords) {
      if (lowerText.includes(keyword)) {
        return topic.category;
      }
    }
  }
  
  return 'Observational';
}

/**
 * Classify jokes using OpenAI AI analysis
 * Groups jokes by topic and generates headers for each topic
 * Falls back to keyword-based classification if OpenAI is unavailable
 */
async function classifyJokesWithAI(jokes) {
  // If no jokes, return empty array
  if (!jokes || jokes.length === 0) {
    return jokes;
  }

  // If OpenAI API key is not available, use keyword-based fallback
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    console.log('ℹ️ OpenAI API key not found, using keyword-based topic classification');
    return jokes.map(joke => ({
      ...joke,
      topic: classifyJokeTopic(joke.text || joke.summary || ''),
      header: joke.header || generateSmartHeader(joke.text || joke.summary || '', joke.index || 0, classifyJokeTopic(joke.text || joke.summary || ''))
    }));
  }

  try {
    console.log(`🤖 Using OpenAI to classify ${jokes.length} jokes into topics...`);
    
    // Prepare joke texts with indices for the prompt
    const jokesList = jokes.map((joke, idx) => {
      const text = joke.text || joke.summary || '';
      return `Joke ${joke.index !== undefined ? joke.index : idx}: "${text.substring(0, 500)}"`;
    }).join('\n\n');

    const prompt = `You are analyzing a stand-up comedy set transcript. I've extracted ${jokes.length} joke segments from a performance.

Your task:
1. Identify the main topics/themes in these jokes (e.g., "Dating", "Work Life", "Family", "Technology", "Social Media", etc.)
2. Group similar jokes together by topic
3. Generate concise, descriptive headers for each topic/group (2-5 words, comedy-style titles)
4. Assign each joke to a topic group

Return ONLY a valid JSON object in this exact format (no markdown, no code blocks, just raw JSON):
{
  "topics": {
    "topic_1": {
      "header": "Dating in Modern Times",
      "jokeIndices": [0, 3, 5]
    },
    "topic_2": {
      "header": "Work Life Struggles",
      "jokeIndices": [1, 4]
    }
  }
}

Rules:
- Each joke index must appear in exactly one topic's jokeIndices array
- Include ALL joke indices (0 to ${jokes.length - 1})
- Headers should be 2-5 words, descriptive, comedy-style
- Group jokes by semantic similarity, not just keywords
- Create 2-8 topics (fewer if jokes are very similar, more if diverse)

Jokes to analyze:
${jokesList}

Return the JSON now:`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert comedy analyst. Analyze joke segments and classify them into topics. Return only valid JSON, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || '';
    
    // Extract JSON from response (handle markdown code blocks if present)
    let jsonContent = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    const classification = JSON.parse(jsonContent);
    
    // Create a map of joke index to topic
    const jokeIndexToTopic = {};
    const topicHeaders = {};
    
    if (classification.topics) {
      Object.entries(classification.topics).forEach(([topicKey, topicData]) => {
        const header = topicData.header || topicKey;
        topicHeaders[topicKey] = header;
        if (topicData.jokeIndices && Array.isArray(topicData.jokeIndices)) {
          topicData.jokeIndices.forEach(jokeIdx => {
            jokeIndexToTopic[jokeIdx] = {
              topic: header,
              header: header
            };
          });
        }
      });
    }

    // Assign topics to jokes
    const classifiedJokes = jokes.map(joke => {
      const jokeIdx = joke.index !== undefined ? joke.index : jokes.indexOf(joke);
      const topicInfo = jokeIndexToTopic[jokeIdx];
      
      if (topicInfo) {
        return {
          ...joke,
          topic: topicInfo.topic,
          header: joke.header || topicInfo.header
        };
      } else {
        // Fallback if joke index not found in classification
        const fallbackTopic = classifyJokeTopic(joke.text || joke.summary || '');
        return {
          ...joke,
          topic: fallbackTopic,
          header: joke.header || generateSmartHeader(joke.text || joke.summary || '', jokeIdx, fallbackTopic)
        };
      }
    });

    console.log(`✅ AI classified ${classifiedJokes.length} jokes into ${Object.keys(topicHeaders).length} topics`);
    return classifiedJokes;

  } catch (error) {
    console.error('⚠️ OpenAI classification failed, using keyword-based fallback:', error.message);
    // Fallback to keyword-based classification
    return jokes.map(joke => {
      const fallbackTopic = classifyJokeTopic(joke.text || joke.summary || '');
      return {
        ...joke,
        topic: fallbackTopic,
        header: joke.header || generateSmartHeader(joke.text || joke.summary || '', joke.index || 0, fallbackTopic)
      };
    });
  }
}

/**
 * Extract key phrases from text for better headers
 */
function extractKeyPhrase(text) {
  // Common comedy setup patterns
  const patterns = [
    /you know (?:what|how|when) (.{10,50}?)[.!?]/i,
    /the (?:thing|problem|worst part) (?:is|about) (.{10,50}?)[.!?]/i,
    /i (?:hate|love|don't understand) (.{10,40}?)[.!?]/i,
    /(?:why do|why is|why are) (.{10,40}?)\??/i,
    /(?:have you ever|ever notice|you ever) (.{10,40}?)\??/i,
    /my (?:girlfriend|boyfriend|wife|husband|mom|dad) (.{10,40}?)[.!?]/i,
    /so i (?:was|went|tried) (.{10,40}?)[.!?,]/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Generate intelligent joke header using topic classification
 */
function generateSmartHeader(jokeText, index, topic) {
  // Try to extract a key phrase first
  const keyPhrase = extractKeyPhrase(jokeText);
  if (keyPhrase && keyPhrase.length > 5 && keyPhrase.length < 50) {
    // Capitalize first letter
    return keyPhrase.charAt(0).toUpperCase() + keyPhrase.slice(1);
  }
  
  // Use first sentence if it's a good length
  const sentences = jokeText.match(/[^.!?]+[.!?]+/g) || [];
  if (sentences.length > 0) {
    let firstSentence = sentences[0].trim();
    if (firstSentence.length > 10 && firstSentence.length < 60) {
      return firstSentence;
    }
    // Truncate if too long
    if (firstSentence.length >= 60) {
      return firstSentence.substring(0, 50).trim() + '...';
    }
  }
  
  // Fall back to topic-based header
  return `${topic} Bit`;
}

/**
 * Extract jokes from transcript using topic modeling and silence gap detection
 * Minimum: 4 jokes for a 7-minute set (~1 joke per 1.5-2 minutes)
 * Uses AI to classify jokes into topics
 */
async function extractJokesFromTranscript(transcript, excludeStart = 0, excludeEnd = 0) {
  const words = transcript.words || [];
  const sentences = transcript.sentences || [];
  const chapters = transcript.chapters || [];
  const audioDuration = transcript.audio_duration || 300;
  const effectiveDuration = audioDuration - excludeStart - excludeEnd;
  
  // Calculate joke count based on duration
  // Minimum: 4 jokes, Maximum: minutes + 1 (e.g., 7 min set = max 8 jokes)
  const durationMinutes = Math.floor(effectiveDuration / 60);
  const minJokes = Math.max(4, Math.ceil(effectiveDuration / 120));
  const maxJokes = durationMinutes + 1;
  console.log(`📏 Duration: ${durationMinutes}min, expecting ${minJokes}-${maxJokes} jokes`);
  
  // If we have auto-chapters, use them as joke boundaries
  if (chapters && chapters.length >= minJokes) {
    console.log(`📚 Found ${chapters.length} auto-chapters (topics) in transcript`);
    const extractedJokes = chapters.map((chapter, i) => {
      const text = chapter.gist || chapter.summary || '';
      return {
        index: i,
        header: chapter.headline || '',
        summary: chapter.summary || '',
        text: text,
        startTime: chapter.start / 1000,
        endTime: chapter.end / 1000,
        duration: (chapter.end - chapter.start) / 1000
      };
    });
    // Classify jokes using AI
    return await classifyJokesWithAI(extractedJokes);
  }
  
  // Detect jokes using silence gaps (laugh breaks)
  console.log('🔍 Detecting jokes from silence gaps and topic changes...');
  
  let jokes = [];
  let currentJokeStart = excludeStart * 1000;
  let currentJokeWords = [];
  let jokeIndex = 0;
  
  // Collect all silence gaps with their positions
  const silenceGaps = [];
  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1];
    const currWord = words[i];
    const gap = currWord.start - prevWord.end;
    
    if (gap > 1500) { // 1.5+ second gap
      silenceGaps.push({
        position: prevWord.end,
        gap: gap,
        wordIndex: i - 1
      });
    }
  }
  
  // Sort gaps by size (largest first) and take top ones (between min and max jokes)
  const sortedGaps = [...silenceGaps].sort((a, b) => b.gap - a.gap);
  const numGapsToUse = Math.min(maxJokes - 1, Math.max(minJokes - 1, sortedGaps.length));
  const selectedGaps = sortedGaps.slice(0, numGapsToUse);
  // Re-sort by position for chronological processing
  selectedGaps.sort((a, b) => a.position - b.position);
  
  console.log(`🎯 Found ${silenceGaps.length} gaps, using top ${selectedGaps.length} for joke boundaries`);
  
  // Build jokes from gaps
  let lastEndPosition = excludeStart * 1000;
  
  for (const gap of selectedGaps) {
    const jokeWords = words.filter(w => 
      w.start >= lastEndPosition && w.end <= gap.position
    ).map(w => w.text);
    
    if (jokeWords.length > 5) {
      const jokeText = jokeWords.join(' ');
      
      jokes.push({
        index: jokeIndex,
        text: jokeText,
        startTime: lastEndPosition / 1000,
        endTime: gap.position / 1000,
        duration: (gap.position - lastEndPosition) / 1000,
        laughGap: gap.gap / 1000
      });
      jokeIndex++;
    }
    
    lastEndPosition = gap.position + gap.gap;
  }
  
  // Add final segment
  const finalWords = words.filter(w => w.start >= lastEndPosition).map(w => w.text);
  if (finalWords.length > 5) {
    const jokeText = finalWords.join(' ');
    jokes.push({
      index: jokeIndex,
      text: jokeText,
      startTime: lastEndPosition / 1000,
      endTime: audioDuration - excludeEnd,
      duration: (audioDuration - excludeEnd) - (lastEndPosition / 1000)
    });
  }
  
  // If still not enough jokes, split evenly by time (use minJokes count)
  if (jokes.length < minJokes) {
    console.log(`⚠️ Only found ${jokes.length} jokes, splitting to ensure ${minJokes} minimum...`);
    jokes = [];
    const targetJokes = Math.min(minJokes, maxJokes);
    const chunkSize = effectiveDuration / targetJokes;
    
    for (let i = 0; i < targetJokes; i++) {
      const startTime = excludeStart + (i * chunkSize);
      const endTime = excludeStart + ((i + 1) * chunkSize);
      
      const chunkWords = words.filter(w => 
        w.start / 1000 >= startTime && w.start / 1000 < endTime
      ).map(w => w.text);
      
      if (chunkWords.length > 3) {
        const jokeText = chunkWords.join(' ');
        jokes.push({
          index: i,
          text: jokeText,
          startTime: startTime,
          endTime: endTime,
          duration: chunkSize
        });
      }
    }
  }
  
  // Classify all extracted jokes using AI
  const classifiedJokes = await classifyJokesWithAI(jokes);
  console.log(`🎭 Extracted ${classifiedJokes.length} jokes with topics: ${[...new Set(classifiedJokes.map(j => j.topic))].join(', ')}`);
  return classifiedJokes;
}

// Analyze transcription for laughter patterns with joke extraction
async function analyzeLaughterPatterns(transcript, setData, excludeStart = 0, excludeEnd = 0, useTranscript = false) {
  const audioDuration = transcript.audio_duration || 300;
  const effectiveDuration = Math.max(0, audioDuration - excludeStart - excludeEnd);
  const words = transcript.words || [];
  const sentimentResults = transcript.sentiment_analysis_results || [];
  const chapters = transcript.chapters || [];
  
  // Extract jokes from transcript if no predefined jokes
  let extractedJokes = [];
  if (useTranscript || !setData || !setData.joke_details || setData.joke_details.length === 0) {
    extractedJokes = await extractJokesFromTranscript(transcript, excludeStart, excludeEnd);
  }
  
  const jokeDetails = extractedJokes.length > 0 ? extractedJokes : (setData?.joke_details || setData?.jokeDetails || []);
  const numJokes = jokeDetails.length || 5;
  
  // Detect laugh events from silence gaps and sentiment
  const laughEvents = [];
  
  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1];
    const currWord = words[i];
    const gap = currWord.start - prevWord.end;
    
    const gapStart = prevWord.end / 1000;
    if (gap > 1500 && gapStart >= excludeStart && gapStart <= (audioDuration - excludeEnd)) {
      laughEvents.push({
        time: gapStart - excludeStart,
        intensity: Math.min(5, Math.floor(gap / 1000)),
        type: 'silence_gap'
      });
    }
  }
  
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
  
  // Generate timeline
  const timeline = [];
  for (let t = 0; t <= effectiveDuration; t += 10) {
    const laughsInInterval = laughEvents.filter(
      e => e.time >= t && e.time < t + 10
    ).reduce((sum, e) => sum + e.intensity, 0);
    timeline.push({ time: t, laughs: Math.min(laughsInInterval, 5) });
  }
  
  // Calculate laughs per joke based on extracted jokes
  const jokeMetrics = [];
  let totalLaughs = 0;
  
  for (let i = 0; i < numJokes; i++) {
    const joke = jokeDetails[i] || {};
    const jokeStart = joke.startTime ? joke.startTime - excludeStart : (i * effectiveDuration / numJokes);
    const jokeEnd = joke.endTime ? joke.endTime - excludeStart : ((i + 1) * effectiveDuration / numJokes);
    
    const jokeLaughs = laughEvents.filter(
      e => e.time >= jokeStart && e.time < jokeEnd
    ).reduce((sum, e) => sum + e.intensity, 0);
    
    totalLaughs += jokeLaughs;
    
    jokeMetrics.push({
      jokeIndex: i,
      laughs: jokeLaughs,
      header: joke.header || `Joke ${i + 1}`,
      text: joke.text || joke.summary || '',
      startTime: jokeStart,
      endTime: jokeEnd,
      laughGap: joke.laughGap
    });
  }
  
  const avgLaughsPerJoke = numJokes > 0 ? totalLaughs / numJokes : 0;
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
    extractedJokes: extractedJokes,
    maxLaughs: Math.max(...jokeMetrics.map(m => m.laughs), 1),
    excludedStart: excludeStart,
    excludedEnd: excludeEnd,
    effectiveDuration,
    fullDuration: audioDuration,
    transcriptText: transcript.text,
    wordCount: words.length,
    speakingPace: words.length / (effectiveDuration / 60),
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
 * @param {string} audioFilePath - Path to the audio/video file
 * @param {object} setData - Set data with jokes (optional - can be null for transcript-based)
 * @param {number} audioDurationSeconds - Duration of audio in seconds
 * @param {number} excludeStartSeconds - Seconds to exclude from start
 * @param {number} excludeEndSeconds - Seconds to exclude from end
 * @param {boolean} useTranscript - If true, extract jokes from transcript instead of using setData
 */
export async function analyzeAudio(audioFilePath, setData, audioDurationSeconds = null, excludeStartSeconds = 0, excludeEndSeconds = 0, useTranscript = false) {
  // Check if AssemblyAI API key is configured
  if (ASSEMBLYAI_API_KEY && ASSEMBLYAI_API_KEY !== 'your_assemblyai_api_key_here') {
    try {
      console.log('🎙️ Starting real AI audio analysis with AssemblyAI...');
      console.log(`📝 Transcript-based joke extraction: ${useTranscript ? 'ENABLED' : 'DISABLED'}`);
      
      // Upload audio
      const audioUrl = await uploadAudio(audioFilePath);
      console.log('✅ Audio uploaded');
      
      // Start transcription
      const transcriptJob = await startTranscription(audioUrl);
      console.log(`✅ Transcription started: ${transcriptJob.id}`);
      
      // Wait for completion
      const transcript = await waitForTranscription(transcriptJob.id);
      console.log('✅ Transcription completed');
      console.log(`📄 Transcript length: ${transcript.text?.length || 0} characters`);
      
      // Analyze for laugh patterns with optional joke extraction
      const analysis = await analyzeLaughterPatterns(
        transcript,
        setData,
        excludeStartSeconds,
        excludeEndSeconds,
        useTranscript
      );
      
      console.log(`🎭 Extracted ${analysis.extractedJokes?.length || 0} jokes from transcript`);
      console.log('✅ AI analysis complete');
      return analysis;
      
    } catch (error) {
      console.error('⚠️ AssemblyAI analysis failed, falling back to mock:', error.message);
      return mockAnalyzeAudio(audioFilePath, setData, audioDurationSeconds, excludeStartSeconds, excludeEndSeconds, useTranscript);
    }
  }
  
  // Use mock analysis if no API key
  console.log('ℹ️ No AssemblyAI API key configured, using mock analysis');
  return mockAnalyzeAudio(audioFilePath, setData, audioDurationSeconds, excludeStartSeconds, excludeEndSeconds, useTranscript);
}

/**
 * Enhanced mock analysis with realistic patterns
 */
async function mockAnalyzeAudio(audioFilePath, setData, audioDurationSeconds = null, excludeStartSeconds = 0, excludeEndSeconds = 0, useTranscript = false) {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const jokeDetails = setData?.joke_details || setData?.jokeDetails || [];
  const jokes = setData?.jokes || [];
  const fullDuration = audioDurationSeconds || 300;
  const effectiveDuration = Math.max(0, fullDuration - excludeStartSeconds - excludeEndSeconds);
  
  // Determine number of jokes - if using transcript mode, estimate based on duration
  let numJokes = jokeDetails.length || jokes.length;
  const extractedJokes = [];
  
  if (useTranscript || numJokes === 0) {
    // Estimate ~1 joke per 30-45 seconds
    numJokes = Math.max(3, Math.min(12, Math.floor(effectiveDuration / 35)));
    console.log(`📝 Mock transcript mode: Generating ${numJokes} simulated jokes`);
    
    // Use generic topics for mock analysis
    const topicsToUse = [
      'Dating in the modern age',
      'Working from home struggles',
      'Family gatherings',
      'Social media addiction',
      'Gym experiences',
      'Food delivery apps',
      'Online shopping',
      'Pet ownership',
      'Adulting problems',
      'Technology fails',
      'Travel mishaps',
      'Coffee dependency'
    ];
    
    const jokeDuration = effectiveDuration / numJokes;
    for (let i = 0; i < numJokes; i++) {
      const topic = topicsToUse[i % topicsToUse.length];
      extractedJokes.push({
        index: i,
        header: topic,
        topic: topic,
        text: `[Mock transcript - Joke ${i + 1} about ${topic.toLowerCase()}]`,
        startTime: excludeStartSeconds + (i * jokeDuration),
        endTime: excludeStartSeconds + ((i + 1) * jokeDuration),
        duration: jokeDuration
      });
    }
  }
  
  // Generate timeline with realistic patterns
  const timeline = [];
  for (let i = 0; i <= effectiveDuration; i += 10) {
    const position = i / effectiveDuration;
    const baseIntensity = Math.sin(position * Math.PI) * 3;
    const closerBonus = position > 0.85 ? 2 : 0;
    const randomVariation = Math.random() * 2 - 1;
    const laughs = Math.max(0, Math.min(5, Math.floor(baseIntensity + closerBonus + randomVariation)));
    timeline.push({ time: i, laughs });
  }
  
  // Generate joke metrics
  const jokeMetrics = [];
  let totalLaughs = 0;
  
  for (let i = 0; i < numJokes; i++) {
    const position = i / numJokes;
    let baseLaughs = 5 + Math.sin(position * Math.PI) * 8;
    if (i === numJokes - 1) baseLaughs += 3;
    if (i === 0) baseLaughs += 2;
    
    const randomFactor = 0.7 + Math.random() * 0.6;
    const laughs = Math.max(2, Math.floor(baseLaughs * randomFactor));
    totalLaughs += laughs;
    
    let jokeHeader = `Joke ${i + 1}`;
    if (extractedJokes[i]) {
      jokeHeader = extractedJokes[i].header;
    } else if (jokeDetails && jokeDetails[i]) {
      jokeHeader = jokeDetails[i].header || jokeHeader;
    }
    
    jokeMetrics.push({
      jokeIndex: i,
      laughs,
      header: jokeHeader,
      text: extractedJokes[i]?.text || '',
      startTime: extractedJokes[i]?.startTime,
      endTime: extractedJokes[i]?.endTime
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
    extractedJokes,
    maxLaughs: Math.max(...jokeMetrics.map(m => m.laughs), 1),
    excludedStart: excludeStartSeconds,
    excludedEnd: excludeEndSeconds,
    effectiveDuration,
    fullDuration,
    transcriptText: useTranscript ? '[Mock transcript - Real transcription requires AssemblyAI API key]' : null,
    wordCount: Math.floor(effectiveDuration * 2.5),
    speakingPace: 145 + Math.floor(Math.random() * 30),
    silenceCount: Math.floor(totalLaughs * 0.8),
    positiveMoments: Math.floor(totalLaughs * 0.3),
    chapters: [],
    isMockData: true
  };
}

export default analyzeAudio;

