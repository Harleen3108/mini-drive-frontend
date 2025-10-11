// Helper to get Supabase token
async function getToken() {
  const { supabase } = await import('@/lib/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// API client - use Supabase for everything except getting user list
export const api = {
  async request(endpoint, options = {}) {
    const token = await getToken();
    
    // USE BACKEND ONLY FOR GETTING USER LIST, EVERYTHING ELSE USE SUPABASE
    const useBackend = endpoint === '/api/users' && !options.method;
    const baseUrl = useBackend 
      ? 'https://mini-drive-backend-mzyb.onrender.com' // Your backend
      : 'https://tmmeztilkvinafnwxkfl.supabase.co'; // Your Supabase URL
    
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

  // Get user's files - use Supabase
  async getFiles() {
    return this.request('/api/files');
  },

  // Get user profile - use Supabase
  async getUser() {
    return this.request('/api/user');
  },

  // Upload file - use Supabase
  async uploadFile(fileData) {
    return this.request('/api/files', {
      method: 'POST',
      body: JSON.stringify(fileData)
    });
  },

  // Delete file - use Supabase
  async deleteFile(fileId) {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE'
    });
  },

  // Get all users - uses backend (for sharing)
  async getAllUsers() {
    return this.request('/api/users');
  },

  // Add test file - use Supabase
  async addTestFile() {
    return this.request('/api/test-file', { method: 'POST' });
  }
};