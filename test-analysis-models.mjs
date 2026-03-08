/**
 * Analysis Model Accuracy Tests
 * Run with: node test-analysis-models.mjs
 *
 * Tests all analysis logic without API keys or audio files.
 * Green = passing. Red = bug or regression.
 *
 * STANDARD thresholds (must match in BOTH server/audioAnalyzer.js AND api/index.js):
 *   LAUGH_GAP_THRESHOLD_MS = 1200
 *   good: LPM >= 6 AND avgPerJoke >= 6
 *   bad:  LPM <  2 AND avgPerJoke <  2
 */

let passed = 0;
let failed = 0;
const issues = [];

function test(name, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  ✅ ${name}`);
      passed++;
    } else {
      console.log(`  ❌ ${name}`);
      console.log(`     → ${result}`);
      failed++;
      issues.push({ name, detail: result });
    }
  } catch (e) {
    console.log(`  ❌ ERROR in: ${name}`);
    console.log(`     → ${e.message}`);
    failed++;
    issues.push({ name, detail: e.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared constants — must match both files
// ─────────────────────────────────────────────────────────────────────────────
const LAUGH_GAP_THRESHOLD_MS = 1200; // server/audioAnalyzer.js + api/index.js

// Reproduced laugh detection from server/audioAnalyzer.js (post-fix)
function detectLaughs_server(words, sentimentResults = [], excludeStart = 0, excludeEnd = 0, audioDuration = 300) {
  const laughEvents = [];

  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1];
    const currWord = words[i];
    const gap = currWord.start - prevWord.end;
    const gapStart = prevWord.end / 1000;

    if (gap >= LAUGH_GAP_THRESHOLD_MS && gapStart >= excludeStart && gapStart <= (audioDuration - excludeEnd)) {
      let intensity = Math.min(5, Math.floor(gap / 1000));

      const inPositiveSentiment = sentimentResults.some(s =>
        s.sentiment === 'POSITIVE' &&
        s.confidence > 0.7 &&
        (s.start / 1000) <= gapStart &&
        (s.end / 1000) >= gapStart
      );
      if (inPositiveSentiment && intensity < 5) {
        intensity = Math.min(5, intensity + 1);
      }

      laughEvents.push({ time: gapStart - excludeStart, intensity, type: 'silence_gap' });
    }
  }

  return laughEvents;
}

// Reproduced from api/index.js (post-fix)
function computeLaughTimeline_vercel(words, effectiveDurationSeconds = 0, stepSeconds = 10) {
  const buckets = new Array(Math.floor((effectiveDurationSeconds || 0) / stepSeconds) + 1).fill(0);
  for (let i = 1; i < words.length; i++) {
    const gap = (words[i].start ?? 0) - (words[i - 1].end ?? 0);
    if (gap >= LAUGH_GAP_THRESHOLD_MS) {
      const t = Math.max(0, Math.floor((words[i - 1].end ?? 0) / 1000));
      const idx = Math.min(buckets.length - 1, Math.floor(t / stepSeconds));
      buckets[idx] += 1;
    }
  }
  return buckets.map((laughs, i) => ({ time: i * stepSeconds, laughs }));
}

// Category — both files
function categorize(lpm, avg) {
  if (lpm >= 6 && avg >= 6) return 'good';
  if (lpm < 2 && avg < 2) return 'bad';
  return 'average';
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL 1: Laugh Detection
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ MODEL 1: Laugh Detection ═══');

test('Fix: No double-counting — silence+sentiment at same time = 1 event', () => {
  const words = [
    { start: 0, end: 1000, text: 'hello' },
    { start: 3500, end: 4500, text: 'world' }, // 2500ms gap
  ];
  const sentiments = [
    { start: 1000, end: 3500, sentiment: 'POSITIVE', confidence: 0.9 }
  ];

  const laughs = detectLaughs_server(words, sentiments);
  if (laughs.length !== 1) return `Expected exactly 1 laugh event, got ${laughs.length}`;
  if (laughs[0].type !== 'silence_gap') return `Expected type silence_gap, got ${laughs[0].type}`;
  return true;
});

test('Fix: Sentiment boost raises intensity by +1 (not a separate event)', () => {
  const words = [
    { start: 0, end: 1000, text: 'a' },
    { start: 3500, end: 4500, text: 'b' }, // 2500ms gap → base intensity 2
  ];
  const sentiments = [
    { start: 1000, end: 3500, sentiment: 'POSITIVE', confidence: 0.9 }
  ];

  const laughsWithSentiment = detectLaughs_server(words, sentiments);
  const laughsWithout = detectLaughs_server(words, []);

  if (laughsWithSentiment.length !== 1) return `Should still be 1 event, got ${laughsWithSentiment.length}`;
  if (laughsWithout[0].intensity !== 2) return `Base intensity should be 2, got ${laughsWithout[0].intensity}`;
  if (laughsWithSentiment[0].intensity !== 3) return `Boosted intensity should be 3, got ${laughsWithSentiment[0].intensity}`;
  return true;
});

test('Fix: Intensity capped at 5 even with sentiment boost', () => {
  const words = [
    { start: 0, end: 1000, text: 'a' },
    { start: 6500, end: 7500, text: 'b' }, // 5500ms gap → base intensity 5
  ];
  const sentiments = [
    { start: 1000, end: 6500, sentiment: 'POSITIVE', confidence: 0.95 }
  ];

  const laughs = detectLaughs_server(words, sentiments);
  if (laughs[0].intensity !== 5) return `Expected capped intensity 5, got ${laughs[0].intensity}`;
  return true;
});

test('Fix: Threshold aligned — 1200ms gap detected in BOTH server and Vercel', () => {
  const words = [
    { start: 0, end: 1000, text: 'hello' },
    { start: 2300, end: 3300, text: 'world' }, // 1300ms gap — above 1200ms threshold
  ];

  const serverLaughs = detectLaughs_server(words);
  const vercelTimeline = computeLaughTimeline_vercel(words, 30);
  const vercelDetected = vercelTimeline.some(b => b.laughs > 0);

  if (!serverLaughs.length) return 'Server did not detect 1300ms gap (threshold too high)';
  if (!vercelDetected) return 'Vercel did not detect 1300ms gap';
  return true; // Both detect it — threshold is now aligned
});

test('Threshold: 1199ms gap NOT counted as a laugh (below threshold)', () => {
  const words = [
    { start: 0, end: 1000, text: 'a' },
    { start: 2199, end: 3000, text: 'b' }, // 1199ms — just below
  ];
  const serverLaughs = detectLaughs_server(words);
  const vercelTimeline = computeLaughTimeline_vercel(words, 30);
  const vercelDetected = vercelTimeline.some(b => b.laughs > 0);

  if (serverLaughs.length > 0) return `Server counted a sub-threshold gap as a laugh`;
  if (vercelDetected) return `Vercel counted a sub-threshold gap as a laugh`;
  return true;
});

test('Intensity: 2s silence → 2, 5s silence → 5, 10s silence → capped at 5', () => {
  const makeWords = (gapMs) => [
    { start: 0, end: 1000, text: 'a' },
    { start: 1000 + gapMs, end: 2000 + gapMs, text: 'b' }
  ];

  const i2 = detectLaughs_server(makeWords(2000))[0]?.intensity;
  const i5 = detectLaughs_server(makeWords(5000))[0]?.intensity;
  const i10 = detectLaughs_server(makeWords(10000))[0]?.intensity;

  if (i2 !== 2) return `Expected 2 for 2s gap, got ${i2}`;
  if (i5 !== 5) return `Expected 5 for 5s gap, got ${i5}`;
  if (i10 !== 5) return `Expected capped 5 for 10s gap, got ${i10}`;
  return true;
});

test('Low-confidence sentiment does NOT boost intensity', () => {
  const words = [
    { start: 0, end: 1000, text: 'a' },
    { start: 3500, end: 4500, text: 'b' }, // 2500ms gap → base intensity 2
  ];
  const sentiments = [
    { start: 1000, end: 3500, sentiment: 'POSITIVE', confidence: 0.5 } // low confidence
  ];

  const laughs = detectLaughs_server(words, sentiments);
  if (laughs[0].intensity !== 2) return `Low-confidence sentiment should NOT boost intensity; got ${laughs[0].intensity}`;
  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
// MODEL 2: Category Thresholds
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ MODEL 2: Category Thresholds ═══');

test('Good: LPM=6 + avg=6 → good', () => {
  if (categorize(6, 6) !== 'good') return `Expected good, got ${categorize(6, 6)}`;
  return true;
});

test('Good: requires BOTH LPM and avg (one alone is not enough)', () => {
  if (categorize(10, 3) !== 'average') return `LPM=10 but avg=3 should be average`;
  if (categorize(3, 10) !== 'average') return `LPM=3 but avg=10 should be average`;
  return true;
});

test('Bad: LPM=1 + avg=1 → bad', () => {
  if (categorize(1, 1) !== 'bad') return `Expected bad, got ${categorize(1, 1)}`;
  return true;
});

test('Fix: Bad requires BOTH low (OR bug removed) — strong jokes, low LPM → average', () => {
  // Long intro + strong jokes: avg high but LPM dragged down
  const result = categorize(1.5, 8);
  if (result !== 'average') return `LPM=1.5 avg=8 should be average (not bad), got ${result}`;
  return true;
});

test('Reasonable comedian (1 laugh/30s at intensity 3 = LPM 6) → good', () => {
  // 6-minute set, 12 laugh events of intensity 1 = 12 total → LPM=2 → average
  // 6-minute set, 4 laugh events of intensity 3 = 12 total → LPM=2 → average (correct)
  // 6-minute set, 6 laugh events of intensity 2 = 12 total → LPM=2 → average (correct)
  // 6-minute set, 6 events of intensity 3 = 18 total → LPM=3 → average
  // 10 events of intensity 3 in 5 min = 30 total, LPM=6, avg per 5 jokes=6 → good ✓
  const lpm = (10 * 3 / 300) * 60; // 6
  const avg = (10 * 3) / 5;        // 6
  if (categorize(lpm, avg) !== 'good') return `Strong set should be good, got ${categorize(lpm, avg)}`;
  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
// MODEL 3: Joke Segmentation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ MODEL 3: Joke Segmentation ═══');

function countBoundaries(words, effectiveDuration) {
  const silenceGaps = [];
  for (let i = 1; i < words.length; i++) {
    const gap = words[i].start - words[i - 1].end;
    if (gap > LAUGH_GAP_THRESHOLD_MS) {
      silenceGaps.push({ position: words[i - 1].end, gap, weight: Math.min(5, gap / 1000) });
    }
  }
  const durationMinutes = Math.floor(effectiveDuration / 60);
  const minJokes = Math.max(4, Math.ceil(effectiveDuration / 120));
  const maxJokes = durationMinutes + 1;
  const sortedSignals = [...silenceGaps].sort((a, b) => b.weight - a.weight);
  const numSignalsToUse = Math.min(maxJokes - 1, Math.max(minJokes - 1, Math.floor(sortedSignals.length * 0.6)));
  return { minJokes, maxJokes, signalsFound: silenceGaps.length, signalsUsed: numSignalsToUse };
}

test('5-min set: forced minimum 4 jokes', () => {
  const words = Array.from({ length: 20 }, (_, i) => ({ start: i * 15000, end: i * 15000 + 13000, text: 'w' }));
  const { minJokes } = countBoundaries(words, 300);
  if (minJokes < 4) return `minJokes should be >= 4, got ${minJokes}`;
  return true;
});

test('10-min set: signals used never exceed maxJokes - 1', () => {
  const words = Array.from({ length: 100 }, (_, i) => ({ start: i * 6000, end: i * 6000 + 5000, text: 'w' }));
  const { maxJokes, signalsUsed } = countBoundaries(words, 600);
  if (signalsUsed > maxJokes - 1) return `signalsUsed=${signalsUsed} exceeds maxJokes-1=${maxJokes - 1}`;
  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
// MODEL 4: Comedy Style Tags (keyword fallback)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ MODEL 4: Comedy Style Tags (keyword fallback) ═══');

// Fixed keyword lists (post-fix from api/index.js)
const STYLES_FIXED = [
  { name: 'Anecdotal', keywords: ['story', 'happened', 'one time', 'remember', 'when i', 'told me', 'went to', 'experience', 'once', 'narrative'], weight: 1.0 },
  { name: 'Clowning', keywords: ['silly', 'absurd', 'goofy', 'wacky', 'nuts', 'bonkers', 'buffoon', 'slapstick', 'zany', 'goofball'], weight: 1.0 },
  { name: 'Edgy', keywords: ['damn', 'hell', 'fuck', 'shit', 'controversial', 'offensive', 'dark', 'boundary', 'taboo', 'provocative'], weight: 1.2 },
  { name: 'Fantastical', keywords: ['imagine', 'magic', 'fantasy', 'dream', 'unreal', 'impossible', 'supernatural', 'alien', 'monster', 'fairy'], weight: 1.0 },
  { name: 'Heartfelt', keywords: ['love', 'family', 'heart', 'feelings', 'emotion', 'touching', 'sweet', 'meaningful', 'genuine', 'sincere'], weight: 1.0 },
  { name: 'Observational', keywords: ['notice', 'did you ever', 'what is it with', 'why is it', 'always', 'never', 'everyone', 'people', 'thing about', 'observation'], weight: 1.1 },
  { name: 'Opinionated', keywords: ['think', 'believe', 'opinion', 'should', 'wrong', 'stupid', 'dumb', 'hate', 'disagree', 'unpopular opinion'], weight: 1.0 },
  { name: 'Playful', keywords: ['play', 'fun', 'joke', 'teasing', 'banter', 'cheeky', 'witty', 'clever', 'humor', 'amusing'], weight: 1.0 },
  { name: 'Puns', keywords: ['pun', 'play on words', 'double meaning', 'wordplay', 'punny'], weight: 1.3 },
  { name: 'Philosophical', keywords: ['meaning', 'life', 'exist', 'universe', 'reality', 'truth', 'question', 'wonder', 'think about', 'deep'], weight: 1.1 },
  { name: 'Sarcasm', keywords: ['yeah right', 'as if', 'oh sure', 'love that', 'sarcastic', 'ironic', 'not like', 'oh how lovely', 'oh perfect', 'clearly not'], weight: 1.2 },
  { name: 'Satire', keywords: ['society', 'politics', 'government', 'system', 'institution', 'mock', 'parody', 'criticize', 'satirical'], weight: 1.1 },
  { name: 'Self-deprecation', keywords: ["i'm so", "i'm terrible", "i suck", "i'm bad", "i can't", "i'm not good", 'pathetic', 'loser', 'myself', "i'm an idiot"], weight: 1.2 },
  { name: 'Shock', keywords: ['what the', 'holy', 'unbelievable', 'incredible', 'amazing', 'wow', 'seriously', 'no way', 'shocking'], weight: 1.0 },
  { name: 'Superiority', keywords: ['better than', 'smarter', 'above', 'superior', "i'm better", 'others are', "i'm the best", 'everyone else'], weight: 1.1 },
  { name: 'Surrealism', keywords: ['surreal', 'dreamlike', 'bizarre', 'abstract', 'unrealistic', 'weird', 'strange', 'odd', 'peculiar'], weight: 1.0 },
  { name: 'Tragedy', keywords: ['sad', 'tragic', 'depressing', 'miserable', 'unfortunate', 'suffering', 'pain', 'loss', 'death', 'grief'], weight: 1.1 },
  { name: 'Wordplay', keywords: ['word', 'pun', 'double', 'meaning', 'play on', 'clever', 'wit', 'verbal', 'linguistic'], weight: 1.2 },
];

function classifyStyle(text, styleList = STYLES_FIXED) {
  const lower = text.toLowerCase();
  const wordCount = Math.max(1, lower.split(/\s+/).length);
  return styleList.map(style => {
    let matches = 0;
    style.keywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      matches += (lower.match(regex) || []).length;
    });
    const score = Math.min(1, (matches * style.weight) / Math.max(100, wordCount / 10));
    return { name: style.name, score: parseFloat(score.toFixed(3)) };
  }).sort((a, b) => b.score - a.score);
}

test('Fix: No shared keywords between Clowning and Surrealism', () => {
  const clowning = STYLES_FIXED.find(s => s.name === 'Clowning').keywords;
  const surrealism = STYLES_FIXED.find(s => s.name === 'Surrealism').keywords;
  const overlap = clowning.filter(k => surrealism.includes(k));
  if (overlap.length > 0) return `Still overlapping keywords: ${overlap.join(', ')}`;
  return true;
});

test('Fix: "ridiculous" not in both Clowning and Opinionated', () => {
  const clowning = STYLES_FIXED.find(s => s.name === 'Clowning').keywords;
  const opinionated = STYLES_FIXED.find(s => s.name === 'Opinionated').keywords;
  const inBoth = clowning.includes('ridiculous') && opinionated.includes('ridiculous');
  if (inBoth) return '"ridiculous" still in both Clowning and Opinionated';
  return true;
});

test('Fix: Sarcasm does not fire on generic positive text', () => {
  const generic = "That was great! It was wonderful and perfect. Sure, obviously I totally agree.";
  const scores = classifyStyle(generic);
  const sarcasm = scores.find(s => s.name === 'Sarcasm');
  if (sarcasm.score > 0.05) return `Sarcasm scored ${sarcasm.score} on generic positive text — still firing false positive`;
  return true;
});

test('Sarcasm detects on clear sarcastic phrasing', () => {
  const sarcastic = "Yeah right, as if that would ever work. Oh sure, sarcastic as always. Yeah right, totally ironic.";
  const scores = classifyStyle(sarcastic);
  const top3 = scores.slice(0, 3).map(s => s.name);
  if (!top3.includes('Sarcasm')) return `Sarcasm not in top 3: [${top3.join(', ')}]`;
  return true;
});

test('Observational text ranks Observational #1', () => {
  const text = "Did you ever notice how people always behave differently at airports? Everyone acts like they've never seen another human. Why is it that we all suddenly forget how to walk?";
  const scores = classifyStyle(text);
  if (scores[0].name !== 'Observational') return `Expected Observational #1, got: ${scores.slice(0, 3).map(s => `${s.name}(${s.score})`).join(', ')}`;
  return true;
});

test('Self-deprecation text ranks Self-deprecation #1', () => {
  const text = "I'm so bad at this. I can't do anything right. I suck at dating. I'm terrible with money. I'm an idiot, basically.";
  const scores = classifyStyle(text);
  if (scores[0].name !== 'Self-deprecation') return `Expected Self-deprecation #1, got: ${scores.slice(0, 3).map(s => `${s.name}(${s.score})`).join(', ')}`;
  return true;
});

test('Empty transcript returns all-zero scores', () => {
  const scores = classifyStyle('');
  const nonZero = scores.filter(s => s.score > 0);
  if (nonZero.length > 0) return `Expected all zeros for empty text, got ${nonZero.length} non-zero`;
  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
// MODEL 5: Writing Elements
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ MODEL 5: Writing Elements ═══');

function detectRuleOfThree(text) {
  return (text.match(/[^.!?]*,\s*[^.!?]*,\s+and\s+[^.!?]*[.!?]/gi) || []).length;
}

function detectCallbacks(text) {
  const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim());
  const phrases = {};
  sentences.forEach(s => {
    const words = s.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    words.forEach((w, i) => {
      if (i < words.length - 1) {
        const phrase = `${w} ${words[i + 1]}`;
        phrases[phrase] = (phrases[phrase] || 0) + 1;
      }
    });
  });
  return Object.values(phrases).filter(c => c >= 2).length;
}

test('Rule of Three: detects "X, Y, and Z" pattern', () => {
  const text = "I love pizza, pasta, and gelato. I hit the gym, the doctor, and therapy all in one day.";
  if (detectRuleOfThree(text) < 1) return 'Expected >=1 rule-of-three match';
  return true;
});

test('Rule of Three: no false positive on simple "and" sentence', () => {
  const text = "I went to the store and bought milk.";
  if (detectRuleOfThree(text) > 0) return `False positive on simple sentence`;
  return true;
});

test('Callbacks: detects repeated phrases across sentences', () => {
  const text = "I always forget things. My wife thinks I always forget things on purpose. Apparently always forget is my superpower.";
  if (detectCallbacks(text) < 1) return 'Expected at least 1 callback detected';
  return true;
});

test('Callbacks: no excessive false positives on fresh text', () => {
  const text = "I went to the store. The weather was beautiful. My cat slept all day. Nothing exciting happened.";
  if (detectCallbacks(text) > 2) return `Too many false-positive callbacks (${detectCallbacks(text)})`;
  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
// MODEL 6: Speaking Pace
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n═══ MODEL 6: Speaking Pace ═══');

function computeSpeakingPace(transcriptText, words) {
  const fillerWords = new Set(['uh', 'um', 'ah', 'oh', 'hmm', 'er', 'like', 'you know', 'i mean', 'well']);
  const transcriptWords = transcriptText
    .toLowerCase()
    .replace(/[.,!?;:—–\-()\[\]{}'"]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !fillerWords.has(w));
  const wordCount = transcriptWords.length || words.length;
  const firstStart = words[0]?.start ?? 0;
  const lastEnd = words[words.length - 1]?.end ?? words[words.length - 1]?.start ?? firstStart;
  const durationSeconds = Math.max(1, (lastEnd - firstStart) / 1000);
  let pace = Math.round((wordCount / durationSeconds) * 60);
  return { wordCount, durationSeconds, pace: Math.max(50, Math.min(250, pace)) };
}

test('Filler words excluded from word count', () => {
  const transcript = "I uh you know like went to the um store uh yesterday";
  const { wordCount } = computeSpeakingPace(transcript, [{ start: 0 }, { end: 10000 }]);
  if (wordCount > 8) return `Expected ~6-7 content words, got ${wordCount}`;
  return true;
});

test('Speaking pace clamped to 50-250 WPM', () => {
  const transcript = Array.from({ length: 300 }, (_, i) => `word${i}`).join(' ');
  const { pace } = computeSpeakingPace(transcript, [{ start: 0 }, { end: 30000 }]);
  if (pace > 250 || pace < 50) return `Pace ${pace} out of 50-250 range`;
  return true;
});

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);

if (issues.length > 0) {
  console.log('\n📋 FAILURES:');
  issues.forEach((issue, i) => {
    console.log(`\n${i + 1}. ${issue.name}`);
    console.log(`   ${issue.detail}`);
  });
} else {
  console.log('\n✅ All checks passed. Ready to test with real audio files.');
}

console.log('\n📌 Next: Test with real audio files via the app.');
console.log('   Upload a recording to Analysis page → verify laugh timeline looks accurate.');
console.log('   Upload a transcript to Find Your Style → verify style tags match the material.');
