// API configuration for frontend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const apiUrl = (endpoint: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // Ensure API_BASE_URL doesn't end with slash
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${baseUrl}/${cleanEndpoint}`;
};

export const fetchApi = async (endpoint: string, options?: RequestInit) => {
  const url = apiUrl(endpoint);
  const defaultOptions: RequestInit = {
    credentials: 'include', // Include cookies for session management
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  };

  return fetch(url, {
    ...defaultOptions,
    ...options,
  });
};