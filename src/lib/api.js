// API client - use Supabase for auth, backend only for custom APIs
export const api = {
  async request(endpoint, options = {}) {
    const token = await getToken();
    
    // USE SUPABASE FOR AUTH, BACKEND FOR OTHER STUFF
    const isAuthEndpoint = endpoint.includes('/auth') || 
                          endpoint === '/api/user' || 
                          endpoint === '/api/users' && options.method === 'POST';
    
    const baseUrl = isAuthEndpoint 
      ? 'https://tmmeztilkvinafnwxkfl.supabase.co' // Your Supabase URL
      : 'https://mini-drive-backend-mzyb.onrender.com'; // Your backend
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
  },

  // Get user's files - use backend
  async getFiles() {
    return this.request('/api/files');
  },

  // Get user profile - use Supabase
  async getUser() {
    return this.request('/api/user');
  },

  // Upload file - use backend
  async uploadFile(fileData) {
    return this.request('/api/files', {
      method: 'POST',
      body: JSON.stringify(fileData)
    });
  },

  // Delete file - use backend
  async deleteFile(fileId) {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE'
    });
  }
};