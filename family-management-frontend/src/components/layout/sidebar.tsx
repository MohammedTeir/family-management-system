import { useAuth } from "@/hooks/use-auth";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Bell, 
  Download, 
  UserCog,
  Settings,
  Activity,
  Gift
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useSettings } from "@/hooks/use-settings";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const adminNavItems = [
  {
    title: "الإحصائيات",
    href: "/admin",
    icon: BarChart3,
  },
  {
    title: "الأسر المسجلة",
    href: "/admin/families",
    icon: Users,
  },
  {
    title: "الطلبات",
    href: "/admin/requests",
    icon: FileText,
  },
  {
    title: "الكوبونات",
    href: "/admin/support-vouchers",
    icon: Gift,
  },
  {
    title: "التنبيهات",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "التقارير",
    href: "/admin/reports",
    icon: Download,
  },
  {
    title: "إدارة المستخدمين",
    href: "/admin/users",
    icon: UserCog,
  },
  {
    title: "الإعدادات",
    href: "/admin/settings",
    icon: Settings,
    requiresRoot: true,
  },
  {
    title: "تنبيهاتي",
    href: "/admin/notifications-list",
    icon: Bell,
  },
  {
    title: "سجل النشاطات",
    href: "/admin/logs",
    icon: Activity,
    requiresRoot: true,
  },
];

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { settings } = useSettings();
  const { state } = useSidebar();
  const isMobile = useIsMobile();

  // Only show sidebar for admin users
  if (!user || user.role === 'head') {
    return null;
  }

  // Determine visibility of header and footer based on requirements:
  // - When sidebar is collapsed AND it's not mobile → hide header/footer
  // - When sidebar is collapsed AND it's mobile → show header/footer
  // - When sidebar is expanded → always show header/footer
  const shouldShowHeaderFooter = state === "expanded" || (state === "collapsed" && isMobile);

  // For menu items, we want to show titles on mobile even when sidebar is collapsed
  const shouldShowItemTitles = state === "expanded" || isMobile;

  return (
    <Sidebar side="right" collapsible="icon" className="flex flex-col h-full">
      <SidebarHeader className={`flex-shrink-0 ${shouldShowHeaderFooter ? "" : "hidden"}`}>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="grid flex-1 text-right text-sm leading-tight">
            <span className="truncate font-semibold">
              {settings?.siteTitle || "نظام إدارة الأسر"}
            </span>
            <span className="truncate text-xs">
              لوحة التحكم الإدارية
            </span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="flex-1">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => {
                if (item.requiresRoot && user.role !== 'root') {
                  return null;
                }

                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={state === "collapsed" && !isMobile ? item.title : undefined}
                    >
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span className={shouldShowItemTitles ? "" : "sr-only"}>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={`flex-shrink-0 mt-auto ${shouldShowHeaderFooter ? "" : "hidden"}`}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              tooltip={state === "collapsed" && !isMobile ? user.username : undefined}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground w-full"
            >
              <div className="flex items-center gap-2 w-full">
                <UserCog className="h-4 w-4 flex-shrink-0" />
                <div className="grid flex-1 text-right text-sm leading-tight">
                  <span className="truncate font-semibold">{user.username}</span>
                  <span className="truncate text-xs">
                    {user.role === 'root' ? 'مشرف رئيسي' : 'مشرف'}
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
