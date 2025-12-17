import { supabase } from '../lib/supabase';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  return `http://${hostname}:3001/api`;
};

const API_BASE_URL = getApiBaseUrl();

const getAuthHeaders = async (isFormData = false) => {
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }
  return headers;
};

export const analysisAPI = {
  async analyze(formData) {
    try {
      const headers = await getAuthHeaders(true);
      const response = await fetch(`${API_BASE_URL}/analysis/analyze`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze audio');
      }
      return await response.json();
    } catch (error) {
      console.error('Error analyzing audio:', error);
      throw error;
    }
  },

  async getAll() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/analysis`, { headers });
      if (!response.ok) throw new Error('Failed to fetch analyses');
      return await response.json();
    } catch (error) {
      console.error('Error fetching analyses:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/analysis/${id}`, { headers });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch analysis');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching analysis:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/analysis/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete analysis');
      return await response.json();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      throw error;
    }
  },
};
