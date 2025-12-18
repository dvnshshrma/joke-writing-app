import { supabase } from '../lib/supabase';

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
const SAME_ORIGIN_API_BASE_URL = typeof window !== 'undefined' ? `${window.location.origin}/api` : null;

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
      // Vercel serverless handler (`/api/index.js`) cannot reliably parse multipart FormData.
      // When we are in same-origin production, send JSON instead (still uses mock analysis on serverless).
      const isSameOriginServerless = SAME_ORIGIN_API_BASE_URL && API_BASE_URL === SAME_ORIGIN_API_BASE_URL;

      let response;
      if (isSameOriginServerless && formData instanceof FormData) {
        const setName = (formData.get('setName') || '').toString();
        const audioDuration = formData.get('audioDuration') ? Number(formData.get('audioDuration')) : null;
        const excludeStartSeconds = formData.get('excludeStartSeconds') ? Number(formData.get('excludeStartSeconds')) : 0;
        const excludeEndSeconds = formData.get('excludeEndSeconds') ? Number(formData.get('excludeEndSeconds')) : 0;
        const file = formData.get('audio');

        const payload = {
          setId: `${Date.now()}`, // analysis_results requires set_id (NOT NULL)
          setName,
          audioDuration,
          excludeStartSeconds,
          excludeEndSeconds,
          audioFileName: file && typeof file === 'object' && 'name' in file ? file.name : null,
        };

        const headers = await getAuthHeaders(false);
        response = await fetch(`${API_BASE_URL}/analysis/analyze`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
      } else {
        const headers = await getAuthHeaders(true);
        response = await fetch(`${API_BASE_URL}/analysis/analyze`, {
          method: 'POST',
          headers,
          body: formData,
        });
      }

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
