import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { api, apiClient } from "./api";
import axios, { AxiosRequestConfig } from "axios";

export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
) {
  switch (method.toLowerCase()) {
    case 'get':
      return api.get(url, config);
    case 'post':
      return api.post(url, data, config);
    case 'put':
      return api.put(url, data, config);
    case 'patch':
      return api.patch(url, data, config);
    case 'delete':
      return api.delete(url, config);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    try {
      const response = await apiClient.get(queryKey[0] as string, { signal });
      return response.data;
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        if (unauthorizedBehavior === "returnNull") {
          return null;
        }
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // 🚀 PERFORMANCE: Re-enable to get fresh data on focus
      refetchOnMount: 'always', // 🚀 PERFORMANCE: Always fetch fresh data on mount
      staleTime: 30 * 1000, // 🚀 PERFORMANCE: Reduced to 30 seconds for fresher data
      gcTime: 5 * 60 * 1000, // 5 minutes cache time (renamed from cacheTime)
      refetchOnReconnect: true, // 🚀 PERFORMANCE: Refetch when network reconnects
      retry: (failureCount, error: any) => {
        // Retry once on network errors or 5xx errors, but not on 401/403
        if (failureCount < 1) {
          if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            // Don't retry on client errors (4xx) except for timeouts
            if (status && status >= 400 && status < 500 && status !== 408) {
              return false;
            }
            // Retry on network errors or 5xx errors
            return true;
          }
          // Retry on other network errors
          return error.message.includes('Network Error') || error.message.includes('timeout');
        }
        return false;
      },
    },
    mutations: {
      retry: false,
    },
  },
});