import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Shield, UserCheck } from "lucide-react";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { validatePasswordWithPolicy } from "@/lib/utils";
import { useSettingsContext } from "@/App";
import { AuthSkeleton } from "@/components/ui/auth-skeleton";

const loginSchema = z.object({
  loginType: z.enum(["head", "admin", "root"]),
  identifier: z.string().min(1, "هذا الحقل مطلوب"),
  password: z.string().optional(),
}).refine((data) => {
  // Password required for admin/root, optional for head and promoted heads (9-digit admin usernames)
  const isPromotedHead = data.loginType === "admin" && /^\d{9}$/.test(data.identifier);
  if (data.loginType !== "head" && !isPromotedHead && (!data.password || data.password.length < 1)) {
    return false;
  }
  return true;
}, {
  message: "كلمة المرور مطلوبة",
  path: ["password"],
});

const registrationSchema = z.object({
  husbandName: z.string().min(1, "الاسم مطلوب"),
  husbandID: z.string().regex(/^\d{9}$/, "رقم الهوية يجب أن يكون 9 أرقام"),
  husbandBirthDate: z.string().min(1, "تاريخ الميلاد مطلوب"),
  husbandJob: z.string().min(1, "المهنة مطلوبة"),
  primaryPhone: z.string().min(1, "رقم الجوال مطلوب"),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمة المرور غير متطابقة",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegistrationFormData = z.infer<typeof registrationSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { toast } = useToast();
  const [loginType, setLoginType] = useState<"head" | "admin" | "root">("head");
  const { settings } = useSettingsContext();
  const [pendingWelcome, setPendingWelcome] = useState<null | { username: string; role: string }>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginType: "head",
      identifier: "",
      password: "",
    },
  });

  const registrationForm = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      husbandName: "",
      husbandID: "",
      husbandBirthDate: "",
      husbandJob: "",
      primaryPhone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const registrationMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const { confirmPassword, ...familyData } = data;
      const res = await apiRequest("POST", "/api/register-family", {
        user: { password: data.password },
        family: familyData,
        members: []
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التسجيل بنجاح",
        description: "مرحباً بك في النظام",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في التسجيل",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Custom registration validation
  const onRegister = (data: RegistrationFormData) => {
    const passwordErrors = validatePasswordWithPolicy(data.password, settings);
    if (passwordErrors.length > 0) {
      passwordErrors.forEach(msg => registrationForm.setError("password", { type: "manual", message: msg }));
      return;
    }
    if (data.password !== data.confirmPassword) {
      registrationForm.setError("confirmPassword", { type: "manual", message: "كلمة المرور غير متطابقة" });
      return;
    }
    registrationMutation.mutate(data);
  };

  // Fetch family info for heads after login to get full name
  const { data: family } = useQuery({
    queryKey: ["/api/family"],
    enabled: !!pendingWelcome && pendingWelcome.role === "head",
  });

  // Custom login error handling for lockout/ban/max try
  const onLogin = (data: LoginFormData) => {
    // Check if this is a promoted head (admin with 9-digit username)
    const isPromotedHead = data.loginType === "admin" && /^\d{9}$/.test(data.identifier);
    
    loginMutation.mutate(
      {
        username: data.identifier,
        password: (data.loginType === "head" || isPromotedHead) ? "" : data.password, // Empty password for heads and promoted heads
      },
      {
        onSuccess: (user: any) => {
          // Show welcome toast with full name if available
          setPendingWelcome({ username: user.username, role: user.role });
          // For admin/root, show username; for head, show full name if available
          if (user.role !== "head") {
            toast({
              title: `مرحباً ${user.username}`,
              description: "تم تسجيل الدخول بنجاح!",
            });
          } else {
            // For head, wait for family info
            // (toast will be shown in useEffect below)
          }
        },
        onError: (error: any) => {
          // Use the exact error message from the backend
          toast({
            title: "فشل تسجيل الدخول",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  // Show welcome toast for head after family info is loaded
  useEffect(() => {
    if (pendingWelcome && pendingWelcome.role === "head" && family) {
      toast({
        title: `مرحباً ${family.husbandName || pendingWelcome.username}`,
        description: "تم تسجيل الدخول بنجاح!",
      });
      setPendingWelcome(null);
    }
  }, [pendingWelcome, family, toast]);

  // Check if settings are loaded
  useEffect(() => {
    if (settings && (settings.authPageTitle || settings.authPageIcon || settings.authPageSubtitle)) {
      setSettingsLoaded(true);
    } else {
      // Give it a moment for settings to load, then show content anyway
      const timer = setTimeout(() => setSettingsLoaded(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [settings]);

  // Redirect if already logged in
  if (user) {
    if (user.role === "head") {
      return <Redirect to="/dashboard" />;
    } else {
      return <Redirect to="/admin" />;
    }
  }

  // Show skeleton while settings are loading
  if (!settingsLoaded) {
    return <AuthSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Hero Section */}
        <div className="flex lg:hidden flex-col justify-center items-center text-center p-4 sm:p-6 mb-4">
          <div className="mb-6">
            <div className="mb-4 mx-auto flex items-center justify-center">
              {settings.authPageIcon ? (
                    <img src={settings.authPageIcon} alt="Logo" className="h-12 w-12 sm:h-16 sm:w-16 object-contain" />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-full flex items-center justify-center">
                      <Users className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                  )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 sm:mb-4">
                    {settings.authPageTitle || "نظام إدارة البيانات العائلية"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
            {settings.authPageSubtitle || "نظام شامل لإدارة بيانات الأسر"}

              
            </p>
          </div>
        </div>
        
        {/* Desktop Hero Section */}
        <div className="hidden lg:flex flex-col justify-center items-center text-center p-8">
          <div className="mb-8">
            <div className="mb-6 mx-auto flex items-center justify-center">
              {settings.authPageIcon ? (
                    <img src={settings.authPageIcon} alt="Logo" className="h-20 w-20 lg:h-24 lg:w-24 object-contain" />
                  ) : (
                    <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center">
                      <Users className="h-12 w-12 text-white" />
                    </div>
                  )}
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
                    {settings.authPageTitle || "نظام إدارة البيانات العائلية"}
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
            {settings.authPageSubtitle || "نظام شامل لإدارة بيانات الأسر وتقديم الطلبات والخدمات"}

              
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 max-w-md">
            <div className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
              <UserCheck className="h-8 w-8 text-primary ml-4 flex-shrink-0" />
              <div className="text-right">
                <h3 className="font-semibold text-card-foreground">إدارة بيانات الأسرة</h3>
                <p className="text-sm text-muted-foreground">تسجيل وتحديث بيانات أفراد الأسرة</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
              <Shield className="h-8 w-8 text-secondary ml-4 flex-shrink-0" />
              <div className="text-right">
                <h3 className="font-semibold text-card-foreground">تقديم الطلبات</h3>
                <p className="text-sm text-muted-foreground">طلبات المساعدة والخدمات المختلفة</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
              <Users className="h-8 w-8 text-accent ml-4 flex-shrink-0" />
              <div className="text-right">
                <h3 className="font-semibold text-card-foreground">المتابعة الإدارية</h3>
                <p className="text-sm text-muted-foreground">متابعة الطلبات والتنبيهات</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center p-4 sm:p-6">
              <CardTitle className="text-xl sm:text-2xl font-bold">مرحباً بك</CardTitle>
              <CardDescription className="text-sm sm:text-base">يرجى تسجيل الدخول</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-1 mb-6">
                  <TabsTrigger value="login" className="text-sm sm:text-base">تسجيل الدخول</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4 sm:space-y-5">
                    <div>
                      <Label htmlFor="loginType" className="text-sm sm:text-base font-medium">نوع المستخدم</Label>
                      <Select
                        value={loginType}
                        onValueChange={(value: "head" | "admin" | "root") => {
                          setLoginType(value);
                          loginForm.setValue("loginType", value);
                        }}
                      >
                        <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="head" className="text-sm sm:text-base">رب الأسرة</SelectItem>
                          <SelectItem value="admin" className="text-sm sm:text-base">مشرف</SelectItem>
                          <SelectItem value="root" className="text-sm sm:text-base">مشرف رئيسي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="identifier" className="text-sm sm:text-base font-medium">
                        {loginType === "head" ? "رقم الهوية" : "اسم المستخدم"}
                      </Label>
                      <Input
                        id="identifier"
                        placeholder={loginType === "head" ? "405857004" : "username"}
                        {...loginForm.register("identifier")}
                        className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                      />
                      {loginForm.formState.errors.identifier && (
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {loginForm.formState.errors.identifier.message}
                        </p>
                      )}
                    </div>

{loginType !== "head" && !(loginType === "admin" && /^\d{9}$/.test(loginForm.watch("identifier") || "")) && (
                    <div>
                      <Label htmlFor="password" className="text-sm sm:text-base font-medium">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...loginForm.register("password")}
                        className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-10 sm:h-11 text-sm sm:text-base mt-2"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={registrationForm.handleSubmit(onRegister)} className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="husbandName" className="text-sm sm:text-base font-medium">الاسم الرباعي</Label>
                      <Input
                        id="husbandName"
                        placeholder="محمد فتح محمود أبو طير"
                        {...registrationForm.register("husbandName")}
                        className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                      />
                      {registrationForm.formState.errors.husbandName && (
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.husbandName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="husbandID" className="text-sm sm:text-base font-medium">رقم الهوية</Label>
                      <Input
                        id="husbandID"
                        placeholder="405857004"
                        {...registrationForm.register("husbandID")}
                        className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                      />
                      {registrationForm.formState.errors.husbandID && (
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.husbandID.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="husbandBirthDate" className="text-sm sm:text-base font-medium">تاريخ الميلاد</Label>
                      <Input
                        id="husbandBirthDate"
                        type="date"
                        {...registrationForm.register("husbandBirthDate")}
                        className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                      />
                      {registrationForm.formState.errors.husbandBirthDate && (
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.husbandBirthDate.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="husbandJob" className="text-sm sm:text-base font-medium">المهنة</Label>
                      <Input
                        id="husbandJob"
                        placeholder="مهندس"
                        {...registrationForm.register("husbandJob")}
                        className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                      />
                      {registrationForm.formState.errors.husbandJob && (
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.husbandJob.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="primaryPhone" className="text-sm sm:text-base font-medium">رقم الجوال</Label>
                      <Input
                        id="primaryPhone"
                        placeholder="0592524815"
                        {...registrationForm.register("primaryPhone")}
                        className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                      />
                      {registrationForm.formState.errors.primaryPhone && (
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.primaryPhone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-sm sm:text-base font-medium">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...registrationForm.register("password")}
                        className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                      />
                      {registrationForm.formState.errors.password && (
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword" className="text-sm sm:text-base font-medium">تأكيد كلمة المرور</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...registrationForm.register("confirmPassword")}
                        className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                      />
                      {registrationForm.formState.errors.confirmPassword && (
                        <p className="text-xs sm:text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-10 sm:h-11 text-sm sm:text-base mt-2"
                      disabled={registrationMutation.isPending}
                    >
                      {registrationMutation.isPending ? "جاري إنشاء الحساب..." : "إنشاء حساب"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}