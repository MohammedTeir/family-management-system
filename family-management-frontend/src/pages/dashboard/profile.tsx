import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { validatePasswordWithPolicy } from "@/lib/utils";
import { fetchApi } from "@/lib/api";

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings.siteTitle, settings.language]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة غير متطابقة");
      return;
    }
    // Validate password policy
    const passwordErrors = validatePasswordWithPolicy(newPassword, settings);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join("، "));
      return;
    }
    setLoading(true);
    try {
      const res = await fetchApi("/api/user/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      if (res.ok) {
        setSuccess("تم تغيير كلمة المرور بنجاح");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          if (user?.role === "head") {
            navigate("/dashboard");
          } else {
            navigate("/admin");
          }
        }, 2000);
      } else {
        const data = await res.json();
        setError(data.message || "حدث خطأ أثناء تغيير كلمة المرور");
      }
    } catch {
      setError("حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <Card>
          <CardHeader>
            <CardTitle>الملف الشخصي</CardTitle>
          </CardHeader>
          <CardContent>
            <p>جاري تحميل بيانات المستخدم...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>الملف الشخصي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label>اسم المستخدم</Label>
            <Input value={user?.username || ""} disabled />
          </div>
          <form onSubmit={handlePasswordChange}>
            <div className="mb-4">
              <Label htmlFor="currentPassword">كلمة المرور الحالية</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور الجديدة</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-red-600 mb-2">{error}</div>}
            {success && <div className="text-green-600 mb-2">{success}</div>}
            <Button type="submit" disabled={loading} className="ml-2">
              {loading ? "جاري الحفظ..." : "تغيير كلمة المرور"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (user?.role === "head") {
                  navigate("/dashboard");
                } else {
                  navigate("/admin");
                }
              }}
              className="mt-2"
            >
              العودة إلى لوحة التحكم
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
