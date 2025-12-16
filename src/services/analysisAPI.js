// Auto-detect API URL based on environment
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

export const analysisAPI = {
  // Analyze audio file
  async analyze(formData) {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/analyze`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || `Failed to analyze audio (${response.status})`;
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error analyzing audio:', error);
      throw error;
    }
  },

  // Get all analyses
  async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis`);
      if (!response.ok) {
        throw new Error('Failed to fetch analyses');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching analyses:', error);
      throw error;
    }
  },

  // Get analysis by ID
  async getById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch analysis');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching analysis:', error);
      throw error;
    }
  },

  // Delete analysis
  async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete analysis');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting analysis:', error);
      throw error;
    }
  },
};

