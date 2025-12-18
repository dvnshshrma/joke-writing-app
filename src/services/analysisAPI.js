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

const normalizeApiBaseUrl = (raw) => {
  if (!raw) return null;
  try {
    const u = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    // normalize trailing slashes
    const pathname = u.pathname.replace(/\/+$/, '');
    return `${u.origin}${pathname}`;
  } catch {
    return String(raw).replace(/\/+$/, '');
  }
};

const SAME_ORIGIN_API_BASE_URL =
  typeof window !== 'undefined' ? normalizeApiBaseUrl(`${window.location.origin}/api`) : null;

const IS_SAME_ORIGIN_SERVERLESS =
  typeof window !== 'undefined' &&
  normalizeApiBaseUrl(API_BASE_URL) === SAME_ORIGIN_API_BASE_URL;

const ANALYSIS_UPLOAD_BUCKET = 'analysis-media';

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

const uploadFileToSupabaseStorage = async (file) => {
  if (!supabase) throw new Error('Supabase is not configured');
  if (!file) throw new Error('No file provided');

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('You must be logged in to analyze');

  const safeName = `${Date.now()}-${String(file.name || 'upload').replace(/[^\w.\-]+/g, '_')}`;
  const path = `${user.id}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(ANALYSIS_UPLOAD_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload file for analysis');
  }

  return { bucket: ANALYSIS_UPLOAD_BUCKET, path };
};

export const analysisAPI = {
  async analyze(formData) {
    try {
      // Vercel serverless handler (`/api/index.js`) cannot reliably parse multipart FormData.
      // When we are in same-origin production, send JSON instead (still uses mock analysis on serverless).

      let response;
      if (IS_SAME_ORIGIN_SERVERLESS && formData instanceof FormData) {
        const setName = (formData.get('setName') || '').toString();
        const audioDuration = formData.get('audioDuration') ? Number(formData.get('audioDuration')) : null;
        const excludeStartSeconds = formData.get('excludeStartSeconds') ? Number(formData.get('excludeStartSeconds')) : 0;
        const excludeEndSeconds = formData.get('excludeEndSeconds') ? Number(formData.get('excludeEndSeconds')) : 0;
        const file = formData.get('audio');

        // For real AI analysis in production: upload media to Supabase Storage, then let serverless send a signed URL to AssemblyAI.
        const storage = await uploadFileToSupabaseStorage(file);

        const payload = {
          setId: `${Date.now()}`, // analysis_results requires set_id (NOT NULL)
          setName,
          audioDuration,
          excludeStartSeconds,
          excludeEndSeconds,
          audioFileName: file && typeof file === 'object' && 'name' in file ? file.name : null,
          storageBucket: storage.bucket,
          storagePath: storage.path,
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

  async getJob(jobId, meta = {}) {
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      Object.entries(meta).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        params.set(k, String(v));
      });
      const url = `${API_BASE_URL}/analysis/job/${encodeURIComponent(jobId)}?${params.toString()}`;
      const response = await fetch(url, { headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to check analysis status');
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking analysis job:', error);
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
