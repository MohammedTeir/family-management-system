import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Users, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function AdminNotificationsList() {
  const { user } = useAuth();
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });
  const { data: families } = useQuery({
    queryKey: ["/api/admin/families"],
  });
  const { data: users } = useQuery({
    queryKey: ["/api/admin/users"],
  });
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

  // Only show notifications received by this admin
  const receivedNotifications = (notifications || []).filter((n: any) =>
    n.target === 'all' ||
    n.target === 'urgent' ||
    n.target === 'admin' ||
    (n.target === 'specific' && Array.isArray(n.recipients) && user && n.recipients.includes(user.id))
  );

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'all': return 'جميع المستخدمين';
      case 'head': return 'رؤساء الأسر';
      case 'urgent': return 'تنبيه عاجل';
      case 'specific': return 'مستخدمين محددين';
      default: return target;
    }
  };
  const getNotificationBadge = (notification: any) => {
    if (notification.target === 'urgent') return <Badge className="bg-red-600 text-white">عاجل</Badge>;
    if (notification.target === 'success') return <Badge className="bg-green-600 text-white">نجاح</Badge>;
    if (notification.target === 'head') return <Badge className="bg-purple-600 text-white">رؤساء الأسر</Badge>;
    if (notification.target === 'admin') return <Badge className="bg-orange-500 text-white">مشرفين</Badge>;
    if (notification.target === 'all') return <Badge className="bg-blue-600 text-white">الكل</Badge>;
    if (notification.target === 'specific') return <Badge className="bg-teal-600 text-white">محدد</Badge>;
    return <Badge variant="default">معلومات</Badge>;
  };

  return (
    <PageWrapper>
      <div className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">التنبيهات التي استلمتها</h1>
              <p className="text-muted-foreground">عرض جميع التنبيهات المستلمة</p>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>قائمة التنبيهات ({receivedNotifications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">جاري تحميل التنبيهات...</div>
              ) : receivedNotifications && receivedNotifications.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">العنوان</th>
                        <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">الرسالة</th>
                        <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">الهدف</th>
                        <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">المستقبلين</th>
                        <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">تاريخ الإرسال</th>
                        <th className="py-2 px-4 text-left text-sm font-semibold text-muted-foreground">من</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {receivedNotifications.map((notification: any) => (
                        <tr key={notification.id} className="hover:bg-muted">
                          <td className="py-2 px-4 text-sm text-foreground">{notification.title}</td>
                          <td className="py-2 px-4 text-sm text-foreground">{notification.message}</td>
                          <td className="py-2 px-4 text-sm text-foreground">
                            {getTargetLabel(notification.target)}
                            {getNotificationBadge(notification)}
                          </td>
                          <td className="py-2 px-4 text-sm text-foreground">
                            {notification.target === 'admin' && (!notification.recipients || notification.recipients.length === 0) ? (
                              'جميع المشرفين'
                            ) : notification.recipients && notification.recipients.length > 0 ? (
                              notification.recipients.map((id: number) => {
                                const userObj = users?.find((u: any) => u.id === id);
                                if (userObj) {
                                  return `${userObj.username} (${userObj.phone || 'بدون رقم'})`;
                                }
                                const family = families?.find((f: any) => f.userId === id);
                                if (family) {
                                  return `${family.husbandName} (${family.husbandID})`;
                                }
                                return id;
                              }).join(', ')
                            ) : (
                              'جميع المستخدمين'
                            )}
                          </td>
                          <td className="py-2 px-4 text-sm text-muted-foreground">{
                            new Date(notification.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
                          }</td>
                          <td className="py-2 px-4 text-sm text-foreground">الإدارة</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">لا توجد تنبيهات</div>
              )}
            </CardContent>
          </Card>
              </div>
    </PageWrapper>
  );
} 