const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const TOKEN_KEY = 'skillbridge.token';

export class ApiError extends Error {
  constructor(message, status = 0, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = Array.isArray(errors) ? errors : [];
  }
}

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function buildQueryString(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  async request(method, path, { body, params, auth = true } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${BASE_URL}${path}${buildQueryString(params)}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('Cannot reach the SkillBridge API. Check your connection and try again.', 0);
    }

    let json = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok) {
      const message =
        (json && typeof json.message === 'string' && json.message) ||
        `Request failed (${res.status})`;
      throw new ApiError(message, res.status, json?.errors);
    }

    return json;
  },

  get(path, options) {
    return this.request('GET', path, options);
  },

  post(path, body, options = {}) {
    return this.request('POST', path, { ...options, body });
  },

  put(path, body, options = {}) {
    return this.request('PUT', path, { ...options, body });
  },

  patch(path, body, options = {}) {
    return this.request('PATCH', path, { ...options, body });
  },

  del(path, options = {}) {
    return this.request('DELETE', path, options);
  },
};

export default api;
