// Vercel serverless function entry point
import express from 'express';
import cors from 'cors';
import { supabase, setupDatabase } from '../database-supabase.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database on first request
let dbInitialized = false;
const initDB = async () => {
  if (!dbInitialized) {
    try {
      await setupDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('Failed to connect to database:', error);
    }
  }
};

// Get all jokes
app.get('/jokes', async (req, res) => {
  await initDB();
  try {
    const { data, error } = await supabase
      .from('jokes')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
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
app.get('/jokes/:id', async (req, res) => {
  await initDB();
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
app.post('/jokes', async (req, res) => {
  await initDB();
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
app.put('/jokes/:id', async (req, res) => {
  await initDB();
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
app.delete('/jokes/:id', async (req, res) => {
  await initDB();
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

// Sets API
app.get('/sets', async (req, res) => {
  await initDB();
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
      createdAt: set.created_at,
      updatedAt: set.updated_at
    }));
    
    res.json(parsedSets);
  } catch (error) {
    console.error('Error fetching sets:', error);
    res.status(500).json({ error: 'Failed to fetch sets' });
  }
});

app.get('/sets/:id', async (req, res) => {
  await initDB();
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
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
    
    res.json(parsedSet);
  } catch (error) {
    console.error('Error fetching set:', error);
    res.status(500).json({ error: 'Failed to fetch set' });
  }
});

app.post('/sets', async (req, res) => {
  await initDB();
  try {
    const {
      id,
      header,
      type,
      jokes,
      jokeDetails,
      createdAt,
      updatedAt
    } = req.body;
    
    const setDoc = {
      id,
      header: header || '',
      type: type || 'short',
      jokes: jokes || [],
      joke_details: jokeDetails || [],
      created_at: createdAt || new Date().toISOString(),
      updated_at: updatedAt || new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('sets')
      .insert([setDoc]);
    
    if (error) throw error;
    
    res.status(201).json({ id, message: 'Set created successfully' });
  } catch (error) {
    console.error('Error creating set:', error);
    res.status(500).json({ error: 'Failed to create set' });
  }
});

app.put('/sets/:id', async (req, res) => {
  await initDB();
  try {
    const {
      header,
      type,
      jokes,
      jokeDetails
    } = req.body;
    
    const updateDoc = {
      header: header || '',
      type: type || 'short',
      jokes: jokes || [],
      joke_details: jokeDetails || [],
      updated_at: new Date().toISOString()
    };
    
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

app.delete('/sets/:id', async (req, res) => {
  await initDB();
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

// Export for Vercel serverless
export default app;

