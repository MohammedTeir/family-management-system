import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect, useState } from "react";

export function ProtectedRoute({
  path,
  component: Component,
  roles,
}: {
  path: string;
  component: (props: any) => React.JSX.Element;
  roles?: string[];
}) {
  const { user, isLoading } = useAuth();
  const [initialLoad, setInitialLoad] = useState(true);

  // Give a small delay to allow for session revalidation
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        setInitialLoad(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Show loading spinner while checking auth status
  if (isLoading || initialLoad) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Role-based protection
  if (roles && !roles.includes(user.role)) {
    return (
      <Route path={path}>
        <Redirect to="/not-found" />
      </Route>
    );
  }

  // Use the function form to get params and pass them to the component
  return (
    <Route path={path}>
      {(params: any) => <Component params={params} />}
    </Route>
  );
}
