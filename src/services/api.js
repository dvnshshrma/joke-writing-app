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

export const jokesAPI = {
  // Get all jokes
  async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/jokes`);
      if (!response.ok) {
        throw new Error('Failed to fetch jokes');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching jokes:', error);
      throw error;
    }
  },

  // Get a single joke by ID
  async getById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/jokes/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch joke');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching joke:', error);
      throw error;
    }
  },

  // Create a new joke
  async create(jokeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/jokes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jokeData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create joke');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating joke:', error);
      throw error;
    }
  },

  // Update an existing joke
  async update(id, jokeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/jokes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jokeData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update joke');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating joke:', error);
      throw error;
    }
  },

  // Delete a joke
  async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/jokes/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete joke');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting joke:', error);
      throw error;
    }
  },
};

