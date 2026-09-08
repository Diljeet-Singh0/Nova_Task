const API_BASE = import.meta.env.VITE_API_URL ?? '';

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
}

let accessToken: string | null = localStorage.getItem('nova_access_token');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('nova_access_token', token);
  } else {
    localStorage.removeItem('nova_access_token');
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function api<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (!skipAuth && accessToken) {
    finalHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    ...rest,
    headers: finalHeaders,
  });

  let data: unknown = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (res.status === 401 && !skipAuth && path !== '/api/auth/refresh') {
    try {
      const refreshed = await api<{ accessToken: string }>('/api/auth/refresh', {
        method: 'POST',
        skipAuth: true,
      });
      setAccessToken(refreshed.accessToken);
      return api<T>(path, options);
    } catch {
      setAccessToken(null);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
        window.location.href = '/auth/login';
      }
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const err = (data as { message?: string })?.message ?? `Request failed (${res.status})`;
    const error = new Error(err) as Error & {
      status: number;
      data?: unknown;
    };
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
