import { createContext, ReactNode, useContext, useState, useMemo, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "../types/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { getToken, setToken, removeToken } from "../lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Extend AuthContextType
interface AuthContextType {
  user: SelectUser | null;
  family: any | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  dualRole: boolean;
  currentDashboard: "admin" | "head";
  chooseDashboard: (dashboard: "admin" | "head") => void;
}

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: 1, // Retry once on failure
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch family data for head users
  const {
    data: family,
    isLoading: familyLoading,
  } = useQuery({
    queryKey: ["/api/family"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!user && (user.role === "head" || (user.role === "admin" && /^\d+$/.test(user.username))),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [currentDashboard, setCurrentDashboard] = useState<"admin" | "head">("admin");

  // Dual-role: admin with numeric username
  const dualRole = useMemo(() => {
    return user && user.role === "admin" && /^\d+$/.test(user.username);
  }, [user]);

  const chooseDashboard = (dashboard: "admin" | "head") => setCurrentDashboard(dashboard);

  // Attempt to refresh user data on mount to verify session
  useEffect(() => {
    if (!user && !isLoading) {
      refetch();
    }
  }, [user, isLoading, refetch]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Clear any existing user data before login attempt
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/family"], null);
      removeToken(); // Clear any existing token
      
      const response = await apiRequest("POST", "/api/login", credentials);
      const { token, user } = response.data;
      
      // Store the JWT token
      setToken(token);
      
      return user;
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      // Invalidate family data to trigger refetch for head users
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
    },
    onError: (error: Error) => {
      // Ensure user data is cleared on login failure
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/family"], null);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      removeToken(); // Clear token on login failure
      
      // Use the exact error message from the backend
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const response = await apiRequest("POST", "/api/register", credentials);
      return response.data;
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      // Clear JWT token
      removeToken();
      // Clear all user and family data from cache
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/family"], null);
      queryClient.clear(); // Clear all cached data
      setLocation("/auth");
    },
    onError: (error: Error) => {
      // Clear token even if logout request fails
      removeToken();
      queryClient.setQueryData(["/api/user"], null);
      queryClient.setQueryData(["/api/family"], null);
      queryClient.clear();
      setLocation("/auth");
      
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        family: family ?? null,
        isLoading: isLoading || familyLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        dualRole,
        currentDashboard,
        chooseDashboard,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
