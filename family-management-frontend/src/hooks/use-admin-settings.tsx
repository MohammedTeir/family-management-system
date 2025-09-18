import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../lib/api";

// Define the shape of your settings here
export interface AdminSettings {
  siteName?: string;
  siteTitle?: string;
  siteLogo?: string;
  authPageTitle?: string;
  authPageSubtitle?: string;
  authPageIcon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  themeMode?: "light" | "dark" | "auto";
  fontFamily?: "Amiri" | "Cairo" | "Tajawal" | "Noto Sans Arabic";
  minPasswordLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxLoginAttempts?: number;
  lockoutDuration?: number;
  sessionTimeout?: number;
  maintenance?: boolean;
  language?: string;
}

// Default settings
const defaultSettings: AdminSettings = {
  siteName: "",
  siteTitle: "",
  siteLogo: "",
  authPageTitle: "نظام إدارة البيانات العائلية",
  authPageSubtitle: "نظام شامل لإدارة بيانات الأسر وتقديم الطلبات والخدمات",
  authPageIcon: "",
  primaryColor: "#3b82f6",
  secondaryColor: "#64748b",
  themeMode: "auto",
  fontFamily: "Cairo",
  minPasswordLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  sessionTimeout: 60,
  maintenance: false,
  language: "ar",
};

/**
 * Hook for admin settings management - requires authentication
 * This hook fetches from /api/settings (authenticated endpoint) and is used in the admin panel
 */
export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount only (no dependencies to avoid re-fetching)
  useEffect(() => {
    let isMounted = true;
    
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get("/api/settings");
        if (isMounted) {
          const merged = { ...defaultSettings, ...response.data };
          setSettings(merged);
        }
      } catch (e) {
        if (isMounted) {
          setError("فشل في تحميل الإعدادات");
          console.error("Failed to load admin settings:", e);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Create a memoized reload function
  const reloadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/api/settings");
      const merged = { ...defaultSettings, ...response.data };
      setSettings(merged);
    } catch (e) {
      setError("فشل في تحميل الإعدادات");
      console.error("Failed to load admin settings:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a specific setting
  const updateSetting = useCallback(
    <K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
  }, []);

  return {
    settings,
    loading,
    error,
    setSettings,      // Replace all settings
    updateSetting,    // Update a single setting
    resetSettings,    // Reset to defaults
    reloadSettings, // Reload from server
  };
}

export default useAdminSettings;