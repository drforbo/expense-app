import { supabase } from './supabase';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Get the current session token
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

// Build headers with auth token
async function getHeaders(contentType?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const token = await getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  return headers;
}

// JSON POST request to the backend API
export async function apiPost(path: string, body: Record<string, any>) {
  const headers = await getHeaders('application/json');
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return response.json();
}

// FormData POST (for file uploads)
export async function apiUpload(path: string, formData: FormData) {
  const headers = await getHeaders('multipart/form-data');
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return response.json();
}

// Get the current user ID, or null
export async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}
