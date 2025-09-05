import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertCircle, CheckCircle, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Header } from "@/components/layout/header";

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
        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />;
      default:
        return <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />;
    }
  };

  const getNotificationBadge = (notification: any) => {
    if (notification.target === 'urgent') return <Badge className="bg-red-600 text-white text-xs">عاجل</Badge>;
    if (notification.target === 'success') return <Badge className="bg-green-600 text-white text-xs">نجاح</Badge>;
    if (notification.target === 'head') return <Badge className="bg-purple-600 text-white text-xs">رؤساء الأسر</Badge>;
    if (notification.target === 'all') return <Badge className="bg-background0 text-white text-xs">الكل</Badge>;
    if (notification.target === 'specific') return <Badge className="bg-teal-600 text-white text-xs">محدد</Badge>;
        return <Badge variant="default" className="text-xs">معلومات</Badge>;
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
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">التنبيهات والإشعارات</h1>
          <p className="text-sm sm:text-base text-muted-foreground">آخر التنبيهات والرسائل الواردة من الإدارة</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                  <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي التنبيهات</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {filteredNotifications.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">تنبيهات عاجلة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {urgentCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">هذا الأسبوع</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
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
            <CardTitle className="text-lg sm:text-xl">قائمة التنبيهات</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredNotifications && filteredNotifications.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {filteredNotifications.map((notification: any) => (
                  <div key={notification.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:bg-background">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.target)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                          <h3 className="text-base sm:text-lg font-semibold text-foreground flex flex-wrap items-center gap-2">
                            <span className="break-words">{notification.title}</span>
                            {getNotificationBadge(notification)}
                          </h3>
                        </div>
                        <p className="text-sm sm:text-base text-gray-700 mb-3 leading-relaxed break-words">
                          {notification.message}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
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
                <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground">لا توجد تنبيهات حالياً</p>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">سيتم إشعارك عندما تصل تنبيهات جديدة</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
