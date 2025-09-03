import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <p>جاري تحميل الصفحة...</p>
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
