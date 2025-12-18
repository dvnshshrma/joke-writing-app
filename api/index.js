// Vercel serverless function entry point
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

// Helper to extract user from JWT
const extractUser = async (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
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
    // JOKES ENDPOINTS
    if (path === '/jokes' || path === '/jokes/') {
      if (method === 'GET') {
        let query = supabase.from('jokes').select('*').order('updated_at', { ascending: false });
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
        const { error } = await supabase.from('jokes').insert([jokeDoc]);
        if (error) throw error;
        return res.json({ message: 'Joke created', id });
      }
    }

    // Single joke endpoints
    const jokeMatch = path.match(/^\/jokes\/([^/]+)$/);
    if (jokeMatch) {
      const jokeId = jokeMatch[1];
      
      if (method === 'GET') {
        const { data, error } = await supabase.from('jokes').select('*').eq('id', jokeId).single();
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
        const { error } = await supabase.from('jokes').update({
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
        const { error } = await supabase.from('jokes').delete().eq('id', jokeId);
        if (error) throw error;
        return res.json({ message: 'Joke deleted' });
      }
    }

    // SETS ENDPOINTS
    if (path === '/sets' || path === '/sets/') {
      if (method === 'GET') {
        let query = supabase.from('sets').select('*').order('updated_at', { ascending: false });
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
        const { error } = await supabase.from('sets').insert([setDoc]);
        if (error) throw error;
        return res.json({ message: 'Set created', id });
      }
    }

    // Single set endpoints
    const setMatch = path.match(/^\/sets\/([^/]+)$/);
    if (setMatch) {
      const setId = setMatch[1];
      
      if (method === 'GET') {
        const { data, error } = await supabase.from('sets').select('*').eq('id', setId).single();
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
        const { error } = await supabase.from('sets').update({
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
        const { error } = await supabase.from('sets').delete().eq('id', setId);
        if (error) throw error;
        return res.json({ message: 'Set deleted' });
      }
    }

    // ANALYSIS ENDPOINTS
    if (path === '/analysis' || path === '/analysis/') {
      if (method === 'GET') {
        let query = supabase.from('analysis_results').select('*').order('created_at', { ascending: false });
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
          audioFileName = null
        } = body || {};

        if (!setId) return res.status(400).json({ error: 'setId is required' });
        if (!setName) return res.status(400).json({ error: 'setName is required' });

        const fullDuration = audioDuration ? Math.max(0, parseInt(audioDuration, 10)) : 300;
        const excludedStart = Math.max(0, parseInt(excludeStartSeconds, 10) || 0);
        const excludedEnd = Math.max(0, parseInt(excludeEndSeconds, 10) || 0);
        const effectiveDuration = Math.max(0, fullDuration - excludedStart - excludedEnd);

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

        const { error } = await supabase.from('analysis_results').insert([analysisDoc]);
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

    const analysisMatch = path.match(/^\/analysis\/([^/]+)$/);
    if (analysisMatch) {
      const analysisId = analysisMatch[1];
      
      if (method === 'GET') {
        const { data, error } = await supabase.from('analysis_results').select('*').eq('id', analysisId).single();
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
        const { error } = await supabase.from('analysis_results').delete().eq('id', analysisId);
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
