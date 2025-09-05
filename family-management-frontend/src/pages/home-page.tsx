import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-3 sm:p-4 lg:p-6">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full flex items-center justify-center mx-auto animate-pulse">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white rounded-full opacity-75"></div>
            </div>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">جاري تحميل الصفحة...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Redirect based on user role
  if (user.role === "head") {
    return <Redirect to="/dashboard" />;
  } else {
    return <Redirect to="/admin" />;
  }
}
