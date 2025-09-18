import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { ProtectedRoute } from "./lib/protected-route";
import { useEffect, useState, createContext, useContext, Suspense, lazy } from "react";
import { useAuth } from "./hooks/use-auth";
import { apiClient } from "./lib/api";

// 🚀 PERFORMANCE: Static imports for critical pages (loaded immediately)
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";

// 🚀 PERFORMANCE: Lazy load all other pages to reduce initial bundle size
const FamilyDashboard = lazy(() => import("@/pages/dashboard/family-dashboard"));
const FamilyData = lazy(() => import("@/pages/dashboard/family-data"));
const FamilyMembers = lazy(() => import("@/pages/dashboard/family-members"));
const Requests = lazy(() => import("@/pages/dashboard/requests"));
const Notifications = lazy(() => import("@/pages/dashboard/notifications"));
const PrintSummary = lazy(() => import("@/pages/dashboard/print-summary"));
const ProfilePage = lazy(() => import("@/pages/dashboard/profile"));
const Summary = lazy(() => import("@/pages/dashboard/summary"));

// 🚀 PERFORMANCE: Admin pages - heaviest components loaded on demand
const AdminDashboard = lazy(() => import("@/pages/admin/admin-dashboard"));
const AdminFamilies = lazy(() => import("@/pages/admin/families"));
const AdminRequests = lazy(() => import("@/pages/admin/admin-requests"));
const AdminNotifications = lazy(() => import("@/pages/admin/admin-notifications"));
const Users = lazy(() => import("@/pages/admin/users"));
const AdminFamilyEdit = lazy(() => import("@/pages/admin/family-edit"));
const AdminNotificationsList = lazy(() => import("@/pages/admin/admin-notifications-list"));
const ReportsPage = lazy(() => import("@/pages/admin/reports"));
const AdminLogs = lazy(() => import("@/pages/admin/logs"));
const SettingsPage = lazy(() => import("@/pages/admin/settings"));
const SupportVouchers = lazy(() => import("./pages/admin/support-vouchers"));
const VoucherDetails = lazy(() => import("./pages/admin/voucher-details"));
const ImportHeads = lazy(() => import("./pages/admin/import-heads"));

// Loading component for lazy-loaded routes
const RouteLoading = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);


function Router() {
  return (
    <Switch>
      {/* Static routes - no Suspense needed */}
      <ProtectedRoute path="/" component={HomePage} roles={['admin', 'root', 'head']} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Lazy-loaded routes wrapped in Suspense */}
      <Suspense fallback={<RouteLoading />}>
        <ProtectedRoute path="/dashboard" component={FamilyDashboard} roles={['head','admin']} />
        <ProtectedRoute path="/dashboard/family" component={FamilyData} roles={['head','admin']} />
        <ProtectedRoute path="/dashboard/members" component={FamilyMembers} roles={['head','admin']} />
        <ProtectedRoute path="/dashboard/requests" component={Requests} roles={['head','admin']} />
        <ProtectedRoute path="/dashboard/notifications" component={Notifications} roles={['head','admin']} />
        <ProtectedRoute path="/dashboard/print-summary" component={PrintSummary} roles={['head','admin']} />
        <ProtectedRoute path="/dashboard/profile" component={ProfilePage} roles={['head','admin','root']} />
        <ProtectedRoute path="/admin" component={AdminDashboard} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/families" component={AdminFamilies} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/requests" component={AdminRequests} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/notifications" component={AdminNotifications} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/notifications-list" component={AdminNotificationsList} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/users" component={Users} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/families/:id/edit" component={props => <AdminFamilyEdit {...props} />} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/families/:id/summary" component={Summary} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/reports" component={ReportsPage} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/logs" component={AdminLogs} roles={['root']} />
        <ProtectedRoute path="/admin/settings" component={SettingsPage} roles={['root']} />
        <ProtectedRoute path="/admin/support-vouchers" component={SupportVouchers} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/support-vouchers/:id" component={props => <VoucherDetails {...props} />} roles={['admin', 'root']} />
        <ProtectedRoute path="/admin/import-heads" component={ImportHeads} roles={['admin', 'root']} />
      </Suspense>
      
      {/* Static 404 route */}
      <Route component={NotFound} />
    </Switch>
  );
}

const SettingsContext = createContext<any>(null);

function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settingsApi = useSettings();
  return (
    <SettingsContext.Provider value={settingsApi}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  return useContext(SettingsContext);
}

function AppContent() {
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [location] = useLocation();
  const { settings } = useSettingsContext();

  useEffect(() => {
    // Apply theme color
    if (settings.primaryColor) {
      document.documentElement.style.setProperty('--primary', settings.primaryColor);
      document.documentElement.style.setProperty('--sidebar-primary', settings.primaryColor);
    }
    if (settings.secondaryColor) {
      document.documentElement.style.setProperty('--secondary', settings.secondaryColor);
    }
    // Apply theme mode
    if (settings.themeMode) {
      if (settings.themeMode === 'light') {
        document.documentElement.classList.remove('dark');
      } else if (settings.themeMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.themeMode === 'auto') {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    }
    // Apply font family
    if (settings.fontFamily) {
      const fontMap = {
        'Amiri': "'Amiri', serif",
        'Cairo': "'Cairo', sans-serif",
        'Tajawal': "'Tajawal', sans-serif",
        'Noto Sans Arabic': "'Noto Sans Arabic', sans-serif"
      };
      const fontFamily = fontMap[settings.fontFamily] || "'Amiri', serif";
      document.documentElement.style.setProperty('--font-family', fontFamily);
      document.body.style.fontFamily = fontFamily;
    }
    // Apply site title
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
    // Apply favicon if siteLogo is set
    if (settings.siteLogo) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.siteLogo;
    }
    // Apply language
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings]);

  useEffect(() => {
    apiClient.get("/api/public/settings")
      .then(response => setMaintenance(response.data.maintenance === "true"))
      .catch(error => console.error('Failed to fetch maintenance status:', error));
  }, []);

  // Allow /auth route even during maintenance
  if (
    maintenance &&
    (!user || (user.role !== "admin" && user.role !== "root")) &&
    location !== "/auth"
  ) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-3 sm:p-4 lg:p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:w-10 lg:w-12 lg:h-12 bg-orange-500 rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-4 sm:mb-6">
              النظام في وضع الصيانة
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">
            نعتذر عن الإزعاج. يرجى المحاولة لاحقاً.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

function App() {
  return (
    <SettingsProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </SettingsProvider>
  );
}

export default App;
