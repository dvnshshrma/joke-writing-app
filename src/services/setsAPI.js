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

export const setsAPI = {
  async getAll() {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sets`, { headers });
      if (!response.ok) throw new Error('Failed to fetch sets');
      return await response.json();
    } catch (error) {
      console.error('Error fetching sets:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sets/${id}`, { headers });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch set');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching set:', error);
      throw error;
    }
  },

  async create(setData) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sets`, {
        method: 'POST',
        headers,
        body: JSON.stringify(setData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create set');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating set:', error);
      throw error;
    }
  },

  async update(id, setData) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sets/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(setData),
      });
      if (!response.ok) throw new Error('Failed to update set');
      return await response.json();
    } catch (error) {
      console.error('Error updating set:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/sets/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete set');
      return await response.json();
    } catch (error) {
      console.error('Error deleting set:', error);
      throw error;
    }
  },
};

