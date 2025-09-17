import axios, { AxiosRequestConfig } from 'axios';

// API configuration for frontend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Token management functions
export const getToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export const setToken = (token: string): void => {
  localStorage.setItem('authToken', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('authToken');
};

// Create axios instance with default configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // No longer need cookies for JWT
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to handle FormData and Authorization
apiClient.interceptors.request.use((config) => {
  // Add Authorization header if token exists
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // For FormData, let axios handle the Content-Type header automatically
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      // Handle 401 errors (token expired/invalid)
      if (error.response.status === 401) {
        removeToken();
        // Redirect to login page
        window.location.href = '/auth';
        return Promise.reject(new Error('Session expired. Please login again.'));
      }
      
      // Extract error message from response
      const errorMessage = error.response.data?.message || error.response.statusText;
      throw new Error(errorMessage);
    }
    throw error;
  }
);

// Direct axios methods
export const api = {
  get: (url: string, config?: AxiosRequestConfig) => apiClient.get(url, config),
  post: (url: string, data?: any, config?: AxiosRequestConfig) => apiClient.post(url, data, config),
  put: (url: string, data?: any, config?: AxiosRequestConfig) => apiClient.put(url, data, config),
  patch: (url: string, data?: any, config?: AxiosRequestConfig) => apiClient.patch(url, data, config),
  delete: (url: string, config?: AxiosRequestConfig) => apiClient.delete(url, config),
};

export const apiUrl = (endpoint: string) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  // Ensure API_BASE_URL doesn't end with slash
  const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${baseUrl}/${cleanEndpoint}`;
};

// Backward compatibility function for existing fetchApi calls
export const fetchApi = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  try {
    const method = (options?.method || 'GET') as any;
    const data = options?.body;
    
    // Handle different body types
    let requestData = data;
    if (data && typeof data === 'string' && data !== '' && options?.headers?.['Content-Type']?.includes('application/json')) {
      try {
        requestData = JSON.parse(data);
      } catch {
        requestData = data;
      }
    }

    const axiosResponse = await apiClient.request({
      url: endpoint,
      method,
      data: requestData,
      headers: options?.headers as Record<string, string>,
      signal: options?.signal,
    });
    
    // Create a Response-like object for compatibility
    const response = new Response(JSON.stringify(axiosResponse.data), {
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: new Headers(axiosResponse.headers as Record<string, string>),
    });
    
    // Add ok property for compatibility
    (response as any).ok = axiosResponse.status >= 200 && axiosResponse.status < 300;
    
    return response;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      // Axios error with response
      const errorResponse = new Response(
        error.response.data ? JSON.stringify(error.response.data) : error.response.statusText,
        {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: new Headers(error.response.headers as Record<string, string>),
        }
      );
      
      (errorResponse as any).ok = false;
      return errorResponse;
    } else {
      // Network error or other axios error
      throw new Error(error.message || 'Network error');
    }
  }
};