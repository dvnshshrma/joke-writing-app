// Vercel serverless function entry point
import { createClient } from '@supabase/supabase-js';

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

const buildJokeMetricsFromTranscript = async ({ user, transcriptText }) => {
  // Map jokes to user headers using a simple keyword overlap.
  let headers = [];
  try {
    if (user) {
      const { data } = await supabase
        .from('jokes')
        .select('header')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(30);
      headers = (data || []).map(r => r.header).filter(Boolean);
    }
  } catch (_) {}

  const fallbackCount = 6;
  const baseHeaders = headers.length ? headers.slice(0, Math.max(4, Math.min(12, headers.length))) : Array.from({ length: fallbackCount }, (_, i) => `Joke ${i + 1}`);

  // No real per-joke laugh mapping without detailed laughter detection; distribute laughs proportionally by segment length.
  return baseHeaders.map((h, i) => ({ jokeIndex: i, header: h, laughs: 0 }));
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
          createdAt: a.created_at
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
          isMockData: true
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
        const existing = await supabase.from('analysis_results').select('*').eq('id', jobId).maybeSingle();
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
            transcriptText: a.transcript_text || job.text || '',
            isMockData: false
          });
        }

        const fullDuration = audioDuration || Math.ceil((job.audio_duration || 300));
        const excludedStart = Math.max(0, excludeStartSeconds || 0);
        const excludedEnd = Math.max(0, excludeEndSeconds || 0);
        const effectiveDuration = Math.max(0, fullDuration - excludedStart - excludedEnd);

        // Build timeline from pauses (words with timestamps)
        const timeline = computeLaughTimelineFromWords(job.words || [], effectiveDuration, 10);
        const totalLaughs = timeline.reduce((s, p) => s + (p.laughs || 0), 0);
        const laughsPerMinute = effectiveDuration > 0 ? (totalLaughs / effectiveDuration) * 60 : 0;

        let jokeMetrics = await buildJokeMetricsFromTranscript({ user, transcriptText: job.text || '' });
        // Distribute laughs evenly across jokes for display (until we do true laughter-to-joke alignment)
        if (jokeMetrics.length) {
          const per = Math.floor(totalLaughs / jokeMetrics.length);
          let rem = totalLaughs - per * jokeMetrics.length;
          jokeMetrics = jokeMetrics.map(j => {
            const add = rem > 0 ? 1 : 0;
            rem -= add;
            return { ...j, laughs: per + add };
          });
        }
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: user?.id || null
        };

        // Try to save transcript text if the column exists; otherwise save without it.
        const { error: insertErr1 } = await supabase.from('analysis_results').insert([{
          ...analysisDoc,
          transcript_text: job.text || ''
        }]);
        if (insertErr1) {
          // Missing column? Retry without transcript_text
          const msg = insertErr1.message || insertErr1.details || '';
          if (msg.includes('transcript_text') || msg.includes('schema cache')) {
            const { error: insertErr2 } = await supabase.from('analysis_results').insert([analysisDoc]);
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
          transcriptText: job.text || '',
          isMockData: false,
          excludedStart,
          excludedEnd,
          effectiveDuration,
          fullDuration
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
          createdAt: data.created_at
        });
      }
      
      if (method === 'DELETE') {
        const { error } = await supabaseAdmin.from('analysis_results').delete().eq('id', analysisId);
        if (error) throw error;
        return res.json({ message: 'Analysis deleted' });
      }
    }

    return res.status(404).json({ error: 'Not found', path });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
