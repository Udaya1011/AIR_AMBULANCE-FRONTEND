// Construct base URL based on current hostname
// If we are on localhost, use localhost:8000
// If we are on a network IP (e.g. 192.168.x.x), assume backend is on same IP:8000
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;
  if (import.meta.env.PROD) return 'https://air-ambulance-moviecloud-1.onrender.com';

  // Development mode with dynamic host
  const hostname = window.location.hostname;
  return `http://${hostname}:8000`;
};

const DEFAULT_BASE = getBaseUrl();

function getToken() {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
}

function buildUrl(path: string) {
  if (!path) return DEFAULT_BASE;
  if (path.startsWith('http')) return path;
  // ensure leading slash
  if (!path.startsWith('/')) path = `/${path}`;
  return `${DEFAULT_BASE}${path}`;
}

async function request(path: string, options: RequestInit = {}) {
  // Use Headers API to handle different input types (object, Headers instance, etc.)
  const headers = new Headers(options.headers);

  // Set default content type if not present
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    console.warn("Making request without token to:", path);
  }

  const res = await fetch(buildUrl(path), { ...options, headers });

  const text = await res.text();
  const contentType = res.headers.get('content-type') || '';
  let data: any = text;
  if (contentType.includes('application/json') && text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const err: any = new Error(
      (typeof data === 'object' && data?.detail) ? data.detail :
        (typeof data === 'string' ? data : 'API request failed')
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const apiClient = {
  get: (path: string) => request(path, { method: 'GET' }),
  post: (path: string, body?: any) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (path: string, body?: any) => request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: (path: string) => request(path, { method: 'DELETE' }),
  rawRequest: request,
};

export default apiClient;
