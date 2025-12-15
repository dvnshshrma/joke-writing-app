const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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
        throw new Error('Failed to create set');
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

