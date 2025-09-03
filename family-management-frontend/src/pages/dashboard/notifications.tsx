import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertCircle, CheckCircle, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function Notifications() {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["/api/notifications"],
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return <AlertCircle className="h-5 w-5 text-accent" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-secondary" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };

  const getNotificationBadge = (notification: any) => {
    if (notification.target === 'urgent') return <Badge className="bg-red-600 text-white">عاجل</Badge>;
    if (notification.target === 'success') return <Badge className="bg-green-600 text-white">نجاح</Badge>;
    if (notification.target === 'head') return <Badge className="bg-purple-600 text-white">رؤساء الأسر</Badge>;
    if (notification.target === 'all') return <Badge className="bg-background0 text-white">الكل</Badge>;
    if (notification.target === 'specific') return <Badge className="bg-teal-600 text-white">محدد</Badge>;
        return <Badge variant="default">معلومات</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">جاري تحميل التنبيهات...</div>
        </div>
      </div>
    );
  }

  // Filter notifications for display (hide those older than 1 day for heads)
  const now = new Date();
  const filteredNotifications = (notifications || []).filter((n: any) => {
    const created = new Date(n.createdAt);
    // Only show notifications from the last 1 day
    return (now.getTime() - created.getTime()) < 24 * 60 * 60 * 1000;
  });

  // Count urgent notifications (target === 'urgent')
  const urgentCount = filteredNotifications.filter((n: any) => n.target === 'urgent').length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">التنبيهات والإشعارات</h1>
          <p className="text-muted-foreground">آخر التنبيهات والرسائل الواردة من الإدارة</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">إجمالي التنبيهات</p>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredNotifications.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-accent" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">تنبيهات عاجلة</p>
                  <p className="text-2xl font-bold text-foreground">
                    {urgentCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-secondary" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">هذا الأسبوع</p>
                  <p className="text-2xl font-bold text-foreground">
                    {filteredNotifications.filter((n: any) => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(n.createdAt) > weekAgo;
                    }).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة التنبيهات</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredNotifications && filteredNotifications.length > 0 ? (
              <div className="space-y-4">
                {filteredNotifications.map((notification: any) => (
                  <div key={notification.id} className="border border-gray-200 rounded-lg p-6 hover:bg-background">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.target)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            {notification.title}
                            {getNotificationBadge(notification)}
                          </h3>
                        </div>
                        <p className="text-gray-700 mb-3 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>تاريخ الإرسال: {new Date(notification.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          <span>من: الإدارة</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد تنبيهات حالياً</p>
                <p className="text-sm text-gray-400 mt-2">سيتم إشعارك عندما تصل تنبيهات جديدة</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
