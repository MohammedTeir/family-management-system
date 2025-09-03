import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "./app-layout";

interface PageWrapperProps {
  children: ReactNode;
  requiresLayout?: boolean;
}

export function PageWrapper({ children, requiresLayout = true }: PageWrapperProps) {
  const { user } = useAuth();
  
  // For admin/root users, use the new sidebar layout
  if (requiresLayout && user && (user.role === 'admin' || user.role === 'root')) {
    return (
      <AppLayout>
        {children}
      </AppLayout>
    );
  }
  
  // For other users or when layout is not required, render children directly
  return <>{children}</>;
}