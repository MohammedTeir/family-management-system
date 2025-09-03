import { createContext, ReactNode, useContext, useState, useMemo, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "../types/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Extend AuthContextType
interface AuthContextType {
  user: SelectUser | null;
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
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      let message = error.message;
      // Show Arabic toast for common English errors
      if (
        message.includes('401') ||
        message.toLowerCase().includes('unauthorized') ||
        message.toLowerCase().includes('forbidden')
      ) {
        message = "فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة";
      }
      toast({
        title: "فشل تسجيل الدخول",
        description: message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
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
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/auth");
    },
    onError: (error: Error) => {
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
        isLoading,
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
