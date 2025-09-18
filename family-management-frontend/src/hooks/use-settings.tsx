import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../lib/api";

// Define the shape of your settings here
export interface Settings {
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

const SETTINGS_KEY = "app_settings";

// Default settings
const defaultSettings: Settings = {
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
  requireSpecialChars: true,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  sessionTimeout: 60,
  maintenance: false,
  language: "ar",
};

function loadSettingsSync(): Settings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {}
  return defaultSettings;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettingsSync);
  const [isLoading, setIsLoading] = useState(true);
  
  // On mount, always try to load from backend and update state/localStorage
  useEffect(() => {
    async function fetchSettings() {
      try {
        // Use public settings endpoint that doesn't require authentication
        console.log('[Settings] Fetching from API...');
        const res = await fetchApi("/api/public/settings");
        if (res.ok) {
          const data = await res.json();
          console.log('[Settings] API Response:', data);
          const merged = { ...defaultSettings, ...data };
          console.log('[Settings] Merged settings:', merged);
          setSettings(merged);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
          console.log('[Settings] Saved to localStorage');
          setIsLoading(false);
          return;
        } else {
          console.log('[Settings] API response not ok:', res.status);
        }
      } catch (e) {
        console.error('[Settings] API fetch error:', e);
      }
      // If backend fails, use localStorage (already loaded by default)
      console.log('[Settings] Using localStorage fallback');
      setIsLoading(false);
    }
    fetchSettings();
  }, []);

  // Persist settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Update a specific setting
  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
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
    isLoading,        // Loading state
    setSettings,      // Replace all settings
    updateSetting,    // Update a single setting
    resetSettings,    // Reset to defaults
  };
}

export default useSettings;