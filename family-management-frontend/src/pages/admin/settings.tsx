import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Upload, Database, RefreshCw, UploadCloud, DownloadCloud, ArrowLeft } from "lucide-react";
import { Switch } from "../../components/ui/switch";
import { useSettings } from "@/hooks/use-settings";
import { useLocation } from "wouter";

interface Settings {
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
  sessionTimeout?: number; // مدة انتهاء الجلسة بالدقائق
}

// Function to convert hex to HSL
function hexToHsl(hex: string): string {
  // Remove the # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return `${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;
}

// Function to apply theme settings to document
function applyThemeSettings(settings: Settings) {
  const root = document.documentElement;
  
  // Apply primary color
  if (settings.primaryColor) {
    const primaryHsl = hexToHsl(settings.primaryColor);
    root.style.setProperty('--primary', `hsl(${primaryHsl})`);
    root.style.setProperty('--sidebar-primary', `hsl(${primaryHsl})`);
  }
  
  // Apply secondary color
  if (settings.secondaryColor) {
    const secondaryHsl = hexToHsl(settings.secondaryColor);
    root.style.setProperty('--secondary', `hsl(${secondaryHsl})`);
  }
  
  // Apply theme mode
  if (settings.themeMode) {
    if (settings.themeMode === 'light') {
      document.documentElement.classList.remove('dark');
    } else if (settings.themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (settings.themeMode === 'auto') {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }
  
  // Apply font family
  if (settings.fontFamily) {
    const fontMap: Record<string, string> = {
      'Amiri': "'Amiri', serif",
      'Cairo': "'Cairo', sans-serif",
      'Tajawal': "'Tajawal', sans-serif",
      'Noto Sans Arabic': "'Noto Sans Arabic', sans-serif"
    };
    
    const fontFamily = fontMap[settings.fontFamily] || "'Amiri', serif";
    root.style.setProperty('--font-family', fontFamily);
    document.body.style.fontFamily = fontFamily;
  }
}

const SettingsPage = () => {
  const { toast } = useToast();
  const { settings, setSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [mergeUrl, setMergeUrl] = useState("");
  const [, setLocation] = useLocation();

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Apply theme settings in real-time when they change
  useEffect(() => {
    if (settings.primaryColor || settings.secondaryColor || settings.themeMode || settings.fontFamily) {
      applyThemeSettings(settings);
    }
  }, [settings.primaryColor, settings.secondaryColor, settings.themeMode, settings.fontFamily]);

  // Update document title and direction based on settings
  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings.siteTitle, settings.language]);

  const loadSettings = async () => {
    try {
      const response = await fetchApi("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings({
          siteName: data.siteName || "",
          siteTitle: data.siteTitle || "",
          siteLogo: data.siteLogo || "",
          authPageTitle: data.authPageTitle || "",
          authPageSubtitle: data.authPageSubtitle || "",
          authPageIcon: data.authPageIcon || "",
          primaryColor: data.primaryColor || "#3b82f6",
          secondaryColor: data.secondaryColor || "#64748b",
          themeMode: data.themeMode || "auto",
          fontFamily: data.fontFamily || "Amiri",
          minPasswordLength: data.minPasswordLength ? parseInt(data.minPasswordLength) : 8,
          requireUppercase: data.requireUppercase === "true" || data.requireUppercase === true,
          requireLowercase: data.requireLowercase === "true" || data.requireLowercase === true,
          requireNumbers: data.requireNumbers === "true" || data.requireNumbers === true,
          requireSpecialChars: data.requireSpecialChars === "true" || data.requireSpecialChars === true,
          maxLoginAttempts: data.maxLoginAttempts ? parseInt(data.maxLoginAttempts) : 5,
          lockoutDuration: data.lockoutDuration ? parseInt(data.lockoutDuration) : 15,
          sessionTimeout: data.sessionTimeout ? parseInt(data.sessionTimeout) : 60,
        });
        if (data.siteLogo) {
          setLogoPreview(data.siteLogo);
        }
        applyThemeSettings({
          primaryColor: data.primaryColor,
          secondaryColor: data.secondaryColor,
          themeMode: data.themeMode as "light" | "dark" | "auto",
          fontFamily: data.fontFamily as "Amiri" | "Cairo" | "Tajawal" | "Noto Sans Arabic",
        }); // Apply theme settings when loading
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل الإعدادات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save text settings
      const settingsToSave = [
        { key: "siteName", value: settings.siteName || "", description: "اسم الموقع/التطبيق" },
        { key: "siteTitle", value: settings.siteTitle || "", description: "عنوان الموقع" },
        { key: "authPageTitle", value: settings.authPageTitle || "", description: "عنوان صفحة تسجيل الدخول" },
        { key: "authPageSubtitle", value: settings.authPageSubtitle || "", description: "وصف صفحة تسجيل الدخول" },
      ];

      // Always save logo setting (even if empty)
      if (logoFile) {
        // New file uploaded
        settingsToSave.push({
          key: "siteLogo",
          value: logoPreview,
          description: "شعار الموقع"
        });
      } else {
        // Save current logo state (could be empty if removed)
        settingsToSave.push({
          key: "siteLogo",
          value: settings.siteLogo || "",
          description: "شعار الموقع"
        });
      }

      // Always save auth page icon setting (even if empty)
      settingsToSave.push({
        key: "authPageIcon",
        value: settings.authPageIcon || "",
        description: "أيقونة صفحة تسجيل الدخول"
      });

      // Save theme/branding settings
      settingsToSave.push({
        key: "primaryColor",
        value: settings.primaryColor || "",
        description: "اللون الأساسي"
      });
      settingsToSave.push({
        key: "secondaryColor",
        value: settings.secondaryColor || "",
        description: "اللون الثانوي"
      });
      settingsToSave.push({
        key: "themeMode",
        value: settings.themeMode || "",
        description: "نمط المظهر"
      });
      settingsToSave.push({
        key: "fontFamily",
        value: settings.fontFamily || "",
        description: "نوع الخط"
      });

      // Save password policy settings
      settingsToSave.push({
        key: "minPasswordLength",
        value: (settings.minPasswordLength ?? 8).toString(),
        description: "الحد الأدنى لطول كلمة المرور"
      });
      settingsToSave.push({
        key: "requireUppercase",
        value: (settings.requireUppercase ?? true).toString(),
        description: "تطلب أحرف كبيرة"
      });
      settingsToSave.push({
        key: "requireLowercase",
        value: (settings.requireLowercase ?? true).toString(),
        description: "تطلب أحرف صغيرة"
      });
      settingsToSave.push({
        key: "requireNumbers",
        value: (settings.requireNumbers ?? true).toString(),
        description: "تطلب أرقام"
      });
      settingsToSave.push({
        key: "requireSpecialChars",
        value: (settings.requireSpecialChars ?? false).toString(),
        description: "تطلب رموز خاصة"
      });
      settingsToSave.push({
        key: "maxLoginAttempts",
        value: (settings.maxLoginAttempts ?? 5).toString(),
        description: "الحد الأقصى لمحاولات تسجيل الدخول"
      });
      settingsToSave.push({
        key: "lockoutDuration",
        value: (settings.lockoutDuration ?? 15).toString(),
        description: "مدة الحظر بالدقائق"
      });
      settingsToSave.push({
        key: "sessionTimeout",
        value: (settings.sessionTimeout ?? 60).toString(),
        description: "مدة انتهاء الجلسة بالدقائق"
      });

      // Save all settings
      for (const setting of settingsToSave) {
        await fetchApi("/api/settings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(setting),
        });
      }

      toast({
        title: "نجح",
        description: "تم حفظ الإعدادات بنجاح",
      });

      // Update document title if site title changed
      if (settings.siteTitle) {
        document.title = settings.siteTitle;
      }
      applyThemeSettings(settings); // Apply theme settings after saving
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    const defaultSettings = {
      ...settings,
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      themeMode: "auto" as const,
      fontFamily: "Cairo" as const,
      minPasswordLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxLoginAttempts: 5,
      lockoutDuration: 300,
      sessionTimeout: 60,
    };
    setSettings(defaultSettings);
    applyThemeSettings(defaultSettings);
  };

  // Maintenance mode state
  const [maintenance, setMaintenance] = useState(false);

  // Fetch maintenance mode status on mount
  useEffect(() => {
    fetchApi("/api/public/settings")
      .then(res => res.json())
      .then(data => setMaintenance(data.maintenance === "true"));
  }, []);

  // Toggle maintenance mode
  const handleMaintenanceToggle = () => {
    fetchApi("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "maintenance", value: (!maintenance).toString(), description: "وضع الصيانة" }),
    }).then(() => setMaintenance(!maintenance));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إعدادات النظام</h1>
          <p className="text-muted-foreground">
            إدارة إعدادات الموقع والعلامة التجارية
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setLocation('/admin')}
            className="border-border text-foreground hover:bg-muted"
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة إلى لوحة التحكم
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                حفظ...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                حفظ الإعدادات
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System/Application Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات الموقع/التطبيق</CardTitle>
            <CardDescription>
              تخصيص اسم الموقع والعنوان والشعار
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">اسم الموقع</Label>
                <Input
                  id="siteName"
                  value={settings.siteName || ""}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  placeholder="أدخل اسم الموقع"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteTitle">عنوان الموقع</Label>
                <Input
                  id="siteTitle"
                  value={settings.siteTitle || ""}
                  onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                  placeholder="أدخل عنوان الموقع"
                />
              </div>
            </div>

            <Separator />

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>شعار الموقع</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("logo-upload")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    اختيار ملف
                  </Button>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
                {(logoPreview || settings.siteLogo) && (
                  <div className="flex items-center space-x-2">
                    <img
                      src={logoPreview || settings.siteLogo}
                      alt="Logo preview"
                      className="h-12 w-auto border rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview("");
                        setSettings({ ...settings, siteLogo: "" });
                      }}
                    >
                      إزالة
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                يفضل استخدام صورة PNG أو JPG بحجم 200x200 بكسل
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Auth Page Settings */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات صفحة تسجيل الدخول</CardTitle>
            <CardDescription>
              تخصيص عنوان ووصف وأيقونة صفحة تسجيل الدخول
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="authPageTitle">عنوان صفحة تسجيل الدخول</Label>
                <Input
                  id="authPageTitle"
                  value={settings.authPageTitle || ""}
                  onChange={(e) => setSettings({ ...settings, authPageTitle: e.target.value })}
                  placeholder="نظام إدارة البيانات العائلية"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="authPageSubtitle">وصف صفحة تسجيل الدخول</Label>
                <Input
                  id="authPageSubtitle"
                  value={settings.authPageSubtitle || ""}
                  onChange={(e) => setSettings({ ...settings, authPageSubtitle: e.target.value })}
                  placeholder="نظام شامل لإدارة بيانات الأسر وتقديم الطلبات والخدمات"
                />
              </div>
            </div>

            <Separator />

            {/* Auth Page Icon Upload */}
            <div className="space-y-2">
              <Label>أيقونة صفحة تسجيل الدخول</Label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("auth-icon-upload")?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    اختيار ملف
                  </Button>
                  <input
                    id="auth-icon-upload"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setSettings({ ...settings, authPageIcon: e.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </div>
                {settings.authPageIcon && (
                  <div className="flex items-center space-x-2">
                    <img
                      src={settings.authPageIcon}
                      alt="Auth icon preview"
                      className="h-12 w-auto border rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSettings({ ...settings, authPageIcon: "" });
                      }}
                    >
                      إزالة
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                يفضل استخدام صورة PNG أو JPG بحجم 48x48 بكسل
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Theme/Branding */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>المظهر و العلامة </CardTitle>
                <CardDescription>
                  تخصيص ألوان النظام والخطوط والمظهر العام
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={resetToDefaults}
                className="text-sm"
              >
                استخدام الافتراضي
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">اللون الأساسي</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={settings.primaryColor || "#3b82f6"}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.primaryColor || "#3b82f6"}
                    onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    placeholder="#3b82f6"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettings({ ...settings, primaryColor: "#3b82f6" })}
                    className="text-xs"
                  >
                    افتراضي
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondaryColor">اللون الثانوي</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={settings.secondaryColor || "#64748b"}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={settings.secondaryColor || "#64748b"}
                    onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                    placeholder="#64748b"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettings({ ...settings, secondaryColor: "#64748b" })}
                    className="text-xs"
                  >
                    افتراضي
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="themeMode">نمط المظهر</Label>
                <div className="flex items-center space-x-2">
                  <Select
                    value={settings.themeMode || "auto"}
                    onValueChange={(value) => setSettings({ ...settings, themeMode: value as "light" | "dark" | "auto" })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر نمط المظهر" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">فاتح</SelectItem>
                      <SelectItem value="dark">داكن</SelectItem>
                      <SelectItem value="auto">تلقائي</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettings({ ...settings, themeMode: "auto" })}
                    className="text-xs"
                  >
                    افتراضي
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fontFamily">نوع الخط</Label>
                <div className="flex items-center space-x-2">
                  <Select
                    value={settings.fontFamily || "Amiri"}
                    onValueChange={(value) => setSettings({ ...settings, fontFamily: value as "Amiri" | "Cairo" | "Tajawal" | "Noto Sans Arabic" })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر نوع الخط" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Amiri">أميري</SelectItem>
                      <SelectItem value="Cairo">القاهرة</SelectItem>
                      <SelectItem value="Tajawal">تجوال</SelectItem>
                      <SelectItem value="Noto Sans Arabic">نوتو سانس عربي</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSettings({ ...settings, fontFamily: "Amiri" })}
                    className="text-xs"
                  >
                    افتراضي
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>معاينة المظهر</Label>
              <div className="p-4 border rounded-lg bg-background">
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: settings.primaryColor || "#3b82f6" }}
                  ></div>
                  <div 
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: settings.secondaryColor || "#64748b" }}
                  ></div>
                  <div className="flex-1">
                    <p 
                      className="text-sm"
                      style={{ 
                        fontFamily: settings.fontFamily || "Amiri",
                        color: settings.primaryColor || "#3b82f6"
                      }}
                    >
                      هذا مثال على النص العربي مع اللون المختار
                    </p>
                    <p 
                      className="text-xs text-muted-foreground"
                      style={{ fontFamily: settings.fontFamily || "Amiri" }}
                    >
                      نص ثانوي باللون الثانوي
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Policy */}
        <Card>
          <CardHeader>
            <CardTitle>سياسة كلمات المرور</CardTitle>
            <CardDescription>
              إعدادات أمان كلمات المرور ومحاولات تسجيل الدخول
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Password Requirements */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">متطلبات كلمة المرور</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPasswordLength">الحد الأدنى لطول كلمة المرور</Label>
                  <Input
                    id="minPasswordLength"
                    type="number"
                    min="4"
                    max="50"
                    value={settings.minPasswordLength || 8}
                    onChange={(e) => setSettings({ ...settings, minPasswordLength: parseInt(e.target.value) || 8 })}
                    className="w-24"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireUppercase"
                    checked={settings.requireUppercase ?? true}
                    onChange={(e) => setSettings({ ...settings, requireUppercase: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="requireUppercase">تطلب أحرف كبيرة (A-Z)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireLowercase"
                    checked={settings.requireLowercase ?? true}
                    onChange={(e) => setSettings({ ...settings, requireLowercase: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="requireLowercase">تطلب أحرف صغيرة (a-z)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireNumbers"
                    checked={settings.requireNumbers ?? true}
                    onChange={(e) => setSettings({ ...settings, requireNumbers: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="requireNumbers">تطلب أرقام (0-9)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requireSpecialChars"
                    checked={settings.requireSpecialChars ?? false}
                    onChange={(e) => setSettings({ ...settings, requireSpecialChars: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="requireSpecialChars">تطلب رموز خاصة (!@#$%^&*)</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Login Security */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">أمان تسجيل الدخول</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">الحد الأقصى لمحاولات تسجيل الدخول</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    min="1"
                    max="20"
                    value={settings.maxLoginAttempts || 5}
                    onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                    className="w-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lockoutDuration">مدة الحظر (دقائق)</Label>
                  <Input
                    id="lockoutDuration"
                    type="number"
                    min="1"
                    max="1440"
                    value={settings.lockoutDuration || 15}
                    onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) || 15 })}
                    className="w-24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">مدة انتهاء الجلسة (دقائق)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="5"
                    max="1440"
                    value={settings.sessionTimeout || 60}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 60 })}
                    className="w-24"
                  />
                </div>
              </div>
            </div>

            {/* Password Policy Summary */}
            <div className="p-4 bg-muted rounded-lg">
              <h5 className="text-sm font-medium mb-2">ملخص السياسة الحالية:</h5>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• الحد الأدنى لطول كلمة المرور: {settings.minPasswordLength ?? 8} أحرف</li>
                <li>• متطلبات الأحرف: {[
                  settings.requireUppercase ?? true ? "أحرف كبيرة" : null,
                  settings.requireLowercase ?? true ? "أحرف صغيرة" : null,
                  settings.requireNumbers ?? true ? "أرقام" : null,
                  settings.requireSpecialChars ?? false ? "رموز خاصة" : null
                ].filter(Boolean).join("، ")}</li>
                <li>• الحد الأقصى للمحاولات: {settings.maxLoginAttempts ?? 5} محاولات</li>
                <li>• مدة الحظر: {settings.lockoutDuration ?? 15} دقيقة</li>
                <li>• مدة انتهاء الجلسة: {settings.sessionTimeout ?? 60} دقيقة</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card>
          <CardHeader>
            <CardTitle>وضع الصيانة</CardTitle>
            <CardDescription>
              تفعيل وإيقاف وضع الصيانة للموقع. عند تفعيله، سيتم عرض رسالة خاصة للمستخدمين الغير مسجلين.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch checked={maintenance} onCheckedChange={handleMaintenanceToggle} />
              <span className="ml-2">{maintenance ? "مفعل" : "معطل"}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              عند تفعيل وضع الصيانة، سيتم عرض رسالة خاصة للمستخدمين الغير مسجلين في جميع صفحات الموقع.
              هذا يسمح بإجراء الصيانة اللازمة بدون تأثير على المستخدمين المسجلين.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Backup & Restore Section (separated below) */}
      <Card>
        <CardHeader>
          <CardTitle>النسخ الاحتياطي والاستعادة</CardTitle>
          <CardDescription>
            إدارة نسخ البيانات، الاستعادة، ودمج قواعد البيانات بشكل آمن وسهل.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Backup Card */}
            <div className="p-6 border rounded-lg bg-background flex flex-col items-center text-center shadow-sm">
              <DownloadCloud className="h-10 w-10 text-primary mb-2" />
              <h4 className="font-bold mb-1">تحميل نسخة احتياطية</h4>
              <p className="text-sm text-muted-foreground mb-4">قم بتنزيل نسخة احتياطية كاملة من جميع بيانات النظام والإعدادات.</p>
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    const res = await fetchApi("/api/admin/backup");
                    if (!res.ok) throw new Error("فشل في إنشاء النسخة الاحتياطية");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g, "-")}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    toast({ title: "تم التحميل", description: "تم تنزيل النسخة الاحتياطية بنجاح" });
                  } catch (e) {
                    toast({ title: "خطأ في النسخ الاحتياطي", description: (e as Error).message, variant: "destructive" });
                  }
                }}
              >
                تحميل النسخة الاحتياطية
              </Button>
            </div>
            {/* Restore Card */}
            <div className="p-6 border rounded-lg bg-background flex flex-col items-center text-center shadow-sm">
              <UploadCloud className="h-10 w-10 text-primary mb-2" />
              <h4 className="font-bold mb-1">استعادة نسخة احتياطية</h4>
              <p className="text-sm text-muted-foreground mb-4">قم برفع ملف نسخة احتياطية لاستعادة جميع البيانات والإعدادات.</p>
              <input
                id="restore-upload"
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const formData = new FormData();
                    formData.append("backup", file);
                    const res = await fetchApi("/api/admin/restore", {
                      method: "POST",
                      body: formData,
                    });
                    if (!res.ok) throw new Error("فشل في استعادة النسخة الاحتياطية");
                    toast({ title: "تم الاستعادة", description: "تمت استعادة البيانات بنجاح. يرجى إعادة تحميل الصفحة." });
                  } catch (e) {
                    toast({ title: "خطأ في الاستعادة", description: (e as Error).message, variant: "destructive" });
                  }
                }}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => document.getElementById("restore-upload")?.click()}
              >
                رفع واستعادة
              </Button>
            </div>
            {/* Merge Card */}
            <div className="p-6 border rounded-lg bg-background flex flex-col items-center text-center shadow-sm">
              <RefreshCw className="h-10 w-10 text-primary mb-2" />
              <h4 className="font-bold mb-1">دمج تلقائي (موصى به)</h4>
              <p className="text-sm text-muted-foreground mb-4">ادمج البيانات مع قاعدة بيانات أخرى بناءً على المعرفات أو التواريخ. مناسب للدمج بين فروع أو نسخ متعددة.</p>
              <Input
                value={mergeUrl}
                onChange={e => setMergeUrl(e.target.value)}
                placeholder="رابط قاعدة البيانات للدمج (اتركه فارغاً لاستخدام الافتراضي)"
                className="mb-2 text-center"
                dir="ltr"
              />
              <Button
                variant="default"
                className="w-full"
                onClick={async () => {
                  try {
                    const res = await fetchApi("/api/admin/merge", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: mergeUrl }),
                    });
                    if (!res.ok) throw new Error("فشل في الدمج التلقائي");
                    const data = await res.json();
                    toast({ title: "تم الدمج", description: data.message || "تم دمج البيانات بنجاح" });
                  } catch (e) {
                    toast({ title: "خطأ في الدمج", description: (e as Error).message, variant: "destructive" });
                  }
                }}
              >
                تنفيذ الدمج
              </Button>
            </div>
          </div>
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Database className="inline h-5 w-5 mr-1 text-primary align-middle" />
            يشمل النسخ الاحتياطي جميع البيانات والإعدادات. تأكد من حفظ الملف في مكان آمن.<br/>
            زر الدمج التلقائي يقوم بمقارنة ودمج البيانات مع قاعدة بيانات أخرى بناءً على المعرفات أو التواريخ.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;