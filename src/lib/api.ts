// API client for Python backend using fetch
import { supabase } from './supabase';

const API_BASE_URL = 'https://statement-classifier-python-2.onrender.com';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
}

async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const token = await getAuthToken();
  
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${errorText}`);
  }

  // Handle empty responses
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  
  return {} as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: any) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: any) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: any) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// Specific API endpoints for your Python backend
export const statementApi = {
  upload: async (file: { uri: string; name: string; type: string }) => {
    // If your backend accepts multipart/form-data
    const token = await getAuthToken();
    const formData = new FormData();
    
    // @ts-ignore - FormData in React Native
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);

    const res = await fetch(`${API_BASE_URL}/statements/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    return (await res.json()) as { import_id: string; status: string; message: string };
  },
  
  getStatus: (importId: string) => 
    api.get<{ status: string; processed_at: string | null; error: string | null }>(`/statements/${importId}/status`),
};

