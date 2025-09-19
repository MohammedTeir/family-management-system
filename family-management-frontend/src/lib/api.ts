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

// Function to detect database connection errors
const isDatabaseError = (error: any): boolean => {
  const message = error?.response?.data?.message?.toLowerCase() || '';
  return message.includes('database temporarily unavailable') ||
         message.includes('connection') ||
         message.includes('terminating') ||
         message.includes('timeout') ||
         error?.response?.status === 503; // Service unavailable
};

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      // Extract error message from backend response
      const backendMessage = error.response.data?.message || error.response.statusText;
      
      // Handle 401 errors (token expired/invalid)  
      if (error.response.status === 401) {
        removeToken();
        
        // Only redirect if not already on auth page to prevent refresh loop
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth';
        }
        
        // Always preserve the backend error message (login errors, auth errors, etc.)
        return Promise.reject(new Error(backendMessage));
      }
      
      // Handle database connection errors with user-friendly messages
      if (isDatabaseError(error)) {
        const friendlyMessage = 'قاعدة البيانات متوقفة مؤقتاً. يرجى المحاولة مرة أخرى خلال لحظات.';
        console.warn('Database connection error detected:', backendMessage);
        throw new Error(friendlyMessage);
      }
      
      // For all other status codes, preserve backend error message
      throw new Error(backendMessage);
    }
    
    // Handle network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      throw new Error('خطأ في الاتصال بالشبكة. يرجى التحقق من اتصال الإنترنت.');
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