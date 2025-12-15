const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

