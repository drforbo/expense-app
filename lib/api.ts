import { supabase } from './supabase';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// Shared headers — includes bypass-tunnel-reminder for localtunnel
const baseHeaders: Record<string, string> = {
  'bypass-tunnel-reminder': 'true',
};

// JSON POST request to the backend API
export async function apiPost(path: string, body: Record<string, any>) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...baseHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

// FormData POST (for file uploads)
export async function apiUpload(path: string, formData: FormData) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...baseHeaders, 'Content-Type': 'multipart/form-data' },
    body: formData,
  });
  return response.json();
}

// Get the current user ID, or null
export async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}
