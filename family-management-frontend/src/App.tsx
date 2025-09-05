import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import FamilyDashboard from "@/pages/dashboard/family-dashboard";
import FamilyData from "@/pages/dashboard/family-data";
import FamilyMembers from "@/pages/dashboard/family-members";
import Requests from "@/pages/dashboard/requests";
import Notifications from "@/pages/dashboard/notifications";
import PrintSummary from "@/pages/dashboard/print-summary";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import AdminFamilies from "@/pages/admin/families";
import AdminRequests from "@/pages/admin/admin-requests";
import AdminNotifications from "@/pages/admin/admin-notifications";
import Users from "@/pages/admin/users";
import ProfilePage from "@/pages/dashboard/profile";
import AdminFamilyEdit from "@/pages/admin/family-edit";
import Summary from "@/pages/dashboard/summary";
import AdminNotificationsList from "@/pages/admin/admin-notifications-list";
import ReportsPage from "@/pages/admin/reports";
import AdminLogs from "@/pages/admin/logs";
import SettingsPage from "@/pages/admin/settings";
import SupportVouchers from "./pages/admin/support-vouchers";
import VoucherDetails from "./pages/admin/voucher-details";
import { useEffect, useState, createContext, useContext } from "react";
import { useAuth } from "./hooks/use-auth"; // adjust import as needed
import { fetchApi } from "./lib/api";


function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} roles={['admin', 'root', 'head']} />
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
      <Route path="/auth" component={AuthPage} />
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
    fetchApi("/api/public/settings")
      .then(res => res.json())
      .then(data => setMaintenance(data.maintenance === "true"));
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
