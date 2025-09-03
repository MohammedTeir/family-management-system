import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { AppHeader } from "./app-header";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();

  // Don't show layout for non-admin users
  if (!user || user.role === 'head') {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="flex-1 space-y-4 p-8 pt-6">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}