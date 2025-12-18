import { supabase } from '../lib/supabase';

// Auto-detect API URL based on environment
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  const hostname = window.location.hostname;
  const port = window.location.port;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }

  // If running Vite dev server on a LAN IP (phone testing), backend is typically on :3001
  if (port && port !== '80' && port !== '443') {
    return `http://${hostname}:3001/api`;
  }

  // Production (Vercel): backend is served from the same origin under /api
  return `${window.location.origin}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// Get auth headers for API requests
const getAuthHeaders = async () => {
  const headers = { 'Content-Type': 'application/json' };
  
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }
  
  return headers;
};

export const jokesAPI = {
  async getAll() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jokes`, { headers });
      if (!response.ok) throw new Error('Failed to fetch jokes');
      return await response.json();
    } catch (error) {
      console.error('Error fetching jokes:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jokes/${id}`, { headers });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch joke');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching joke:', error);
      throw error;
    }
  },

  async create(jokeData) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jokes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(jokeData),
      });
      if (!response.ok) throw new Error('Failed to create joke');
      return await response.json();
    } catch (error) {
      console.error('Error creating joke:', error);
      throw error;
    }
  },

  async update(id, jokeData) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jokes/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(jokeData),
      });
      if (!response.ok) throw new Error('Failed to update joke');
      return await response.json();
    } catch (error) {
      console.error('Error updating joke:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/jokes/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete joke');
      return await response.json();
    } catch (error) {
      console.error('Error deleting joke:', error);
      throw error;
    }
  },
};

