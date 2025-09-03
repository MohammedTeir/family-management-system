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
  // On mount, always try to load from backend and update state/localStorage
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetchApi("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const merged = { ...defaultSettings, ...data };
          setSettings(merged);
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
          return;
        }
      } catch (e) {}
      // If backend fails, try localStorage (already loaded by default)
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
    setSettings,      // Replace all settings
    updateSetting,    // Update a single setting
    resetSettings,    // Reset to defaults
  };
}

export default useSettings;