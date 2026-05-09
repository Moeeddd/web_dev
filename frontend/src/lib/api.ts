const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || '/api')
  : 'http://backend:4000/api';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function login(username: string, password: string) {
  return fetchApi<{
    token: string;
    user: {
      id: string;
      username: string;
      role: 'command' | 'captain';
      assignedShipId?: string;
      assignedShipName?: string;
    };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchShips(token: string) {
  return fetchApi<any[]>('/ships', {}, token);
}

export async function fetchAlerts(token: string) {
  return fetchApi<any[]>('/alerts', {}, token);
}

export async function fetchZones(token: string) {
  return fetchApi<any[]>('/zones', {}, token);
}

export async function fetchDirectives(token: string) {
  return fetchApi<any[]>('/directives', {}, token);
}

export async function fetchPlayback(token: string, from: string, to: string) {
  return fetchApi<any[]>(`/playback?from=${from}&to=${to}`, {}, token);
}

export async function fetchAdvisor(token: string) {
  return fetchApi<{ suggestions: string[] }>('/advisor', {}, token);
}

export async function fetchWeather(token: string, shipId: string) {
  return fetchApi<any>(`/weather/${shipId}`, {}, token);
}

export async function fetchPorts(token: string) {
  return fetchApi<any[]>('/ports', {}, token);
}
