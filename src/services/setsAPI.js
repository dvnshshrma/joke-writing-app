// Auto-detect API URL based on environment
// For local dev: use IP address when accessing from phone, localhost when on computer
// For production: use VITE_API_URL env variable (set in Vercel)
const getApiBaseUrl = () => {
  // If VITE_API_URL is set (production or explicit config), use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For local development, detect if we're on a mobile device or different origin
  // If accessing from phone, use the computer's IP (should be set in .env)
  // Otherwise, use localhost
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001/api';
  }
  
  // If accessing via IP address, use that IP for API
  return `http://${hostname}:3001/api`;
};

const API_BASE_URL = getApiBaseUrl();

export const setsAPI = {
  // Get all sets
  async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/sets`);
      if (!response.ok) {
        throw new Error('Failed to fetch sets');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching sets:', error);
      throw error;
    }
  },

  // Get a single set by ID
  async getById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/sets/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch set');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching set:', error);
      throw error;
    }
  },

  // Create a new set
  async create(setData) {
    try {
      const response = await fetch(`${API_BASE_URL}/sets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to create set (${response.status})`;
        const error = new Error(errorMessage);
        error.code = errorData.code;
        error.details = errorData.details;
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating set:', error);
      throw error;
    }
  },

  // Update an existing set
  async update(id, setData) {
    try {
      const response = await fetch(`${API_BASE_URL}/sets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update set');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating set:', error);
      throw error;
    }
  },

  // Delete a set
  async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/sets/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete set');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting set:', error);
      throw error;
    }
  },
};

