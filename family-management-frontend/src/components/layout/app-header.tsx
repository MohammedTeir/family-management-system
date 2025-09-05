import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User, Users, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";

const breadcrumbMap: Record<string, string> = {
  "/admin": "الإحصائيات",
  "/admin/families": "الأسر المسجلة",
  "/admin/requests": "الطلبات", 
  "/admin/support-vouchers": "الكوبونات",
  "/admin/notifications": "التنبيهات",
  "/admin/reports": "التقارير",
  "/admin/users": "إدارة المستخدمين",
  "/admin/settings": "الإعدادات",
  "/admin/notifications-list": "تنبيهاتي",
  "/admin/logs": "سجل النشاطات",
};

export function AppHeader() {
  const [location, setLocation] = useLocation();
  const { user, family, logoutMutation, dualRole, currentDashboard, chooseDashboard } = useAuth();
  const { settings } = useSettings();
  
  const currentPageTitle = breadcrumbMap[location] || "الصفحة الرئيسية";

  useEffect(() => {
    if (settings?.siteTitle) {
      document.title = settings.siteTitle;
    }
    if (settings?.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings?.siteTitle, settings?.language]);

  const handleLogout = () => {
    logoutMutation.mutate(); 
  };

  const handleDashboardSwitch = () => {
    if (currentDashboard === 'admin') {
      chooseDashboard('head');
      setLocation('/dashboard');
    } else {
      chooseDashboard('admin');
      setLocation('/admin');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'root':
        return 'مشرف رئيسي';
      case 'admin':
        return 'مشرف';
      case 'head':
        return 'رب أسرة';
      default:
        return role;
    }
  };

  const getHomeLink = () => {
    if (user?.role === 'head') {
      return '/dashboard';
    } else {
      return '/admin';
    }
  };

  // Get display name - prefer husband name for family heads, fallback to username
  const getDisplayName = () => {
    if (user?.role === 'head' && family?.husbandName) {
      return family.husbandName;
    }
    return user?.username || '';
  };

  return (
    <header className="flex h-12 sm:h-14 md:h-16 shrink-0 items-center gap-1 sm:gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b">
      <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4">
        <SidebarTrigger className="-ml-1 h-7 w-7 sm:h-8 sm:w-8" />
        <Separator orientation="vertical" className="mr-1 sm:mr-2 h-3 sm:h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={getHomeLink()} className="text-sm md:text-base">
                لوحة التحكم
              </BreadcrumbLink>
            </BreadcrumbItem>
            {location !== "/admin" && (
              <>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm md:text-base font-medium truncate max-w-32 sm:max-w-48 md:max-w-none">{currentPageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="mr-auto flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4">
        {/* Dashboard Switch for dual-role users */}
        {dualRole && user?.role !== 'root' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDashboardSwitch}
            className="hidden lg:inline-flex text-xs lg:text-sm px-2 lg:px-3 h-7 sm:h-8 lg:h-9"
          >
            <span className="hidden xl:inline">
              {currentDashboard === 'admin' ? 'التبديل إلى لوحة تحكم رب الأسرة' : 'التبديل إلى لوحة تحكم المشرف'}
            </span>
            <span className="xl:hidden">
              {currentDashboard === 'admin' ? 'تبديل إلى رب أسرة' : 'تبديل إلى مشرف'}
            </span>
          </Button>
        )}

        {/* Notifications */}
        {user?.role === 'head' && (
          <Link href="/dashboard/notifications">
            <Button variant="ghost" size="sm" className="relative h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-1">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
            </Button>
          </Link>
        )}

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-1 sm:space-x-2 space-x-reverse h-auto p-1 sm:p-2">
              <User className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-xs sm:text-sm font-medium text-foreground truncate max-w-20 sm:max-w-32 lg:max-w-40">
                  {getDisplayName()}
                </span>
                <Badge variant="outline" className="text-xs">
                  {getRoleLabel(user?.role || '')}
                </Badge>
              </div>
              {/* Mobile: Show only user icon and role badge */}
              <div className="sm:hidden">
                <Badge variant="outline" className="text-xs px-1">
                  {getRoleLabel(user?.role || '').charAt(0)}
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56">
            {/* Mobile dashboard switch */}
            {dualRole && user?.role !== 'root' && (
              <>
                <DropdownMenuItem onClick={handleDashboardSwitch} className="text-sm lg:hidden">
                  <Users className="h-4 w-4 ml-2" />
                  <span>{currentDashboard === 'admin' ? 'تبديل إلى رب الأسرة' : 'تبديل إلى المشرف'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="lg:hidden" />
              </>
            )}
            
            <Link href="/dashboard/profile">
              <DropdownMenuItem className="text-sm">
                <User className="h-4 w-4 ml-2" />
                <span>الملف الشخصي</span>
              </DropdownMenuItem>
            </Link>
            
            {/* Settings link for admin and root users */}
            {(user?.role === 'root') && (
              <>
                <DropdownMenuSeparator />
                <Link href="/admin/settings">
                  <DropdownMenuItem className="text-sm">
                    <Settings className="h-4 w-4 ml-2" />
                    <span>الإعدادات</span>
                  </DropdownMenuItem>
                </Link>
              </>
            )}
            
            {user?.role === 'head' && (
              <>
                <DropdownMenuSeparator />
                <Link href="/dashboard/family">
                  <DropdownMenuItem className="text-sm">
                    <Users className="h-4 w-4 ml-2" />
                    <span>بيانات الأسرة</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/dashboard/print-summary">
                  <DropdownMenuItem className="text-sm">
                    <Users className="h-4 w-4 ml-2" />
                    <span>طباعة البيانات</span>
                  </DropdownMenuItem>
                </Link>
              </>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 ml-2" />
              <span>تسجيل الخروج</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}