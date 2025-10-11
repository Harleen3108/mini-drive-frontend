// Helper to get Supabase token

async function getToken() {
  const { supabase } = await import('@/lib/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}
async function getToken() {
  const { supabase } = await import('@/lib/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// API client - use direct Supabase for auth, backend for files
export const api = {
  async request(endpoint, options = {}) {
    const token = await getToken();
    
    // Use backend only for specific endpoints
    const useBackend = endpoint.startsWith('/api/files') || endpoint === '/api/users';
    const baseUrl = useBackend 
      ? 'https://mini-drive-backend-mzyb.onrender.com'
      : 'https://tmmeztilkvinafnwxkfl.supabase.co';
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  },
  // Get user's files
  async getFiles() {
    return this.request('/api/files');
  },

  // Get user profile
  async getUser() {
    return this.request('/api/user');
  },

  // Upload file
  async uploadFile(fileData) {
    return this.request('/api/files', {
      method: 'POST',
      body: JSON.stringify(fileData)
    });
  },

  // Delete file
  async deleteFile(fileId) {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE'
    });
  },

  // Add test file
  async addTestFile() {
    return this.request('/api/test-file', { method: 'POST' });
  }
};