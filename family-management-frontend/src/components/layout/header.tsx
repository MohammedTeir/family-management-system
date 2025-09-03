import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User, Users, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";


export default function Header() {
  const { user, family, logoutMutation, dualRole, currentDashboard, chooseDashboard } = useAuth();
  const [, setLocation] = useLocation();
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
    <header className="bg-background shadow-sm border-b border-border no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href={getHomeLink()}>
              <div className="flex items-center cursor-pointer">
                <div className="flex-shrink-0">
                  {settings.siteLogo ? (
                    <img src={settings.siteLogo} alt="Logo" className="h-8 w-8 rounded" />
                  ) : (
                    <Users className="h-8 w-8 text-primary" />
                  )}
                </div>
                <div className="mr-4">
                  <h1 className="text-lg font-semibold text-foreground">
                    {settings.siteName || "نظام إدارة البيانات العائلية"}
                  </h1>
                </div>
              </div>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Dashboard Switch for dual-role users */}
            {dualRole && user?.role !== 'root' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDashboardSwitch}
              >
                {currentDashboard === 'admin' ? 'التبديل إلى لوحة تحكم رب الأسرة' : 'التبديل إلى لوحة تحكم المشرف'}
              </Button>
            )}
            {/* Notifications */}
            {user?.role === 'head' && (
              <Link href="/dashboard/notifications">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="h-5 w-5" />
                  {/* Notification count badge could go here */}
                </Button>
              </Link>
            )}

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 space-x-reverse">
                  <User className="h-5 w-5" />
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-foreground">
                      {getDisplayName()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getRoleLabel(user?.role || '')}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <Link href="/dashboard/profile">
                  <DropdownMenuItem>
                    <User className="h-4 w-4 ml-2" />
                    <span>الملف الشخصي</span>
                  </DropdownMenuItem>
                </Link>
                
                {/* Settings link for admin and root users */}
                {(user?.role === 'root') && (
                  <>
                    <DropdownMenuSeparator />
                    <Link href="/admin/settings">
                      <DropdownMenuItem>
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
                      <DropdownMenuItem>
                        <Users className="h-4 w-4 ml-2" />
                        <span>بيانات الأسرة</span>
                      </DropdownMenuItem>
                    </Link>
                    <Link href="/dashboard/print-summary">
                      <DropdownMenuItem>
                        <Users className="h-4 w-4 ml-2" />
                        <span>طباعة البيانات</span>
                      </DropdownMenuItem>
                    </Link>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 ml-2" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
