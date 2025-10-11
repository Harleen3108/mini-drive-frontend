// Helper to get Supabase token
async function getToken() {
  const { supabase } = await import('@/lib/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// SIMPLE FIX: Use ONLY Supabase for everything except user listing
export const api = {
  async request(endpoint: string, options: { headers?: Record<string, string>; [key: string]: any } = {}) {
    const token = await getToken();
    const supabaseUrl = 'https://tmmeztilkvinafnwxkfl.supabase.co';
    
    const response = await fetch(`${supabaseUrl}${endpoint}`, {
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

  // All methods use Supabase directly
  async getFiles() {
    return this.request('/api/files');
  },

  async getUser() {
    return this.request('/api/user');
  },

  async uploadFile(fileData: any) {
    return this.request('/api/files', {
      method: 'POST',
      body: JSON.stringify(fileData)
    });
  },

  async deleteFile(fileId: any) {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE'
    });
  },

  async addTestFile() {
    return this.request('/api/test-file', { method: 'POST' });
  },

  // ONLY this method uses backend for user listing
  async getAllUsers() {
    const response = await fetch('https://mini-drive-backend-mzyb.onrender.com/api/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }
};