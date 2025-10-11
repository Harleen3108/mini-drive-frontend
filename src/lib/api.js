// Helper to get Supabase token
async function getToken() {
  const { supabase } = await import('@/lib/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

// SIMPLE FIX: Use ONLY Supabase for everything
export const api = {
  async request(endpoint, options = {}) {
    const token = await getToken();
    const supabaseUrl = 'https://dmvtgdwiivsrrktvirfy.supabase.co';
    
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

  // All methods use Supabase
  async getFiles() {
    return this.request('/api/files');
  },

  async getUser() {
    return this.request('/api/user');
  },

  async uploadFile(fileData) {
    return this.request('/api/files', {
      method: 'POST',
      body: JSON.stringify(fileData)
    });
  },

  async deleteFile(fileId) {
    return this.request(`/api/files/${fileId}`, {
      method: 'DELETE'
    });
  },

  async addTestFile() {
    return this.request('/api/test-file', { method: 'POST' });
  },

  // FIX: Use your actual backend URL
  async getAllUsers() {
    // Replace with your actual Render backend URL
    const backendUrl = 'https://mini-drive-backend-mzyb.onrender.com';
    const response = await fetch(`${backendUrl}/api/users`);
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    return response.json();
  }
};