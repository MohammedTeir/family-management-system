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

  // Redirect if already logged in
  if (user) {
    if (user.role === "head") {
      return <Redirect to="/dashboard" />;
    } else {
      return <Redirect to="/admin" />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-4 -left-4 w-72 h-72 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400/40 rounded-full animate-bounce" style={{animationDelay: '0.5s', animationDuration: '3s'}}></div>
        <div className="absolute top-40 right-32 w-1.5 h-1.5 bg-purple-400/40 rounded-full animate-bounce" style={{animationDelay: '1.5s', animationDuration: '2.5s'}}></div>
        <div className="absolute bottom-32 left-16 w-1 h-1 bg-indigo-400/40 rounded-full animate-bounce" style={{animationDelay: '2.5s', animationDuration: '4s'}}></div>
        <div className="absolute bottom-20 right-24 w-2.5 h-2.5 bg-pink-400/40 rounded-full animate-bounce" style={{animationDelay: '0.8s', animationDuration: '3.5s'}}></div>
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Mobile Hero Section */}
        <div className="flex lg:hidden flex-col justify-center items-center text-center mb-8">
          <div className="backdrop-blur-sm bg-white/10 dark:bg-gray-800/10 rounded-3xl p-8 border border-white/20">
            <div className="mb-6 relative">
              <div className="mb-6 mx-auto flex items-center justify-center relative">
                {settings.authPageIcon ? (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-75"></div>
                    <div className="relative bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl">
                      <img src={settings.authPageIcon} alt="Logo" className="h-16 w-16 sm:h-20 sm:w-20 object-contain" />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-75"></div>
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                      <Users className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                    </div>
                  </div>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
                {settings.authPageTitle || "نظام إدارة البيانات العائلية"}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                {settings.authPageSubtitle || "نظام شامل لإدارة بيانات الأسر"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Desktop Hero Section */}
        <div className="hidden lg:flex flex-col justify-center items-center text-center order-1 lg:order-none">
          <div className="max-w-xl">
            <div className="mb-8 relative">
              <div className="mb-8 mx-auto flex items-center justify-center">
                {settings.authPageIcon ? (
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-lg opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-2xl">
                      <img src={settings.authPageIcon} alt="Logo" className="h-24 w-24 lg:h-28 lg:w-28 object-contain" />
                    </div>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-lg opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative w-28 h-28 lg:w-32 lg:h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl">
                      <Users className="h-14 w-14 lg:h-16 lg:w-16 text-white" />
                    </div>
                  </div>
                )}
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-6 leading-tight">
                {settings.authPageTitle || "نظام إدارة البيانات العائلية"}
              </h1>
              <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-12 leading-relaxed max-w-2xl">
                {settings.authPageSubtitle || "نظام شامل لإدارة بيانات الأسر وتقديم الطلبات والخدمات"}
              </p>
            </div>
          
            <div className="grid grid-cols-1 gap-4 max-w-lg">
              <div className="group p-6 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/30 rounded-2xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex items-center text-right">
                  <UserCheck className="h-10 w-10 text-blue-600 dark:text-blue-400 ml-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">إدارة بيانات الأسرة</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">تسجيل وتحديث بيانات أفراد الأسرة</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/30 rounded-2xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex items-center text-right">
                  <Shield className="h-10 w-10 text-purple-600 dark:text-purple-400 ml-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">تقديم الطلبات</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">طلبات المساعدة والخدمات المختلفة</p>
                  </div>
                </div>
              </div>
              
              <div className="group p-6 backdrop-blur-sm bg-white/20 dark:bg-gray-800/20 border border-white/30 rounded-2xl hover:bg-white/30 dark:hover:bg-gray-800/30 transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <div className="flex items-center text-right">
                  <Users className="h-10 w-10 text-indigo-600 dark:text-indigo-400 ml-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">المتابعة الإدارية</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">متابعة الطلبات والتنبيهات</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <div className="flex items-center justify-center lg:order-2">
          <div className="w-full max-w-md">
            <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 rounded-3xl shadow-2xl border border-white/50 dark:border-gray-700/50 overflow-hidden animate-in fade-in-50 slide-in-from-bottom-8 duration-700">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
                <div className="relative p-8 sm:p-10">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">مرحباً بك</h2>
                    <p className="text-gray-600 dark:text-gray-400">يرجى تسجيل الدخول للمتابعة</p>
                  </div>
                  <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-1 mb-8 bg-gradient-to-r from-gray-100/60 via-blue-50/60 to-purple-50/60 dark:from-gray-800/60 dark:via-blue-900/60 dark:to-purple-900/60 rounded-2xl p-1 shadow-inner">
                      <TabsTrigger value="login" className="text-base font-medium rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-white data-[state=active]:to-blue-50/50 data-[state=active]:dark:from-gray-700 data-[state=active]:dark:to-blue-900/50 data-[state=active]:shadow-xl data-[state=active]:scale-105 transition-all duration-300">تسجيل الدخول</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="login">
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="loginType" className="text-sm sm:text-base font-semibold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">نوع المستخدم</Label>
                      <Select
                        value={loginType}
                        onValueChange={(value: "head" | "admin" | "root") => {
                          setLoginType(value);
                          loginForm.setValue("loginType", value);
                        }}
                      >
                        <SelectTrigger className="h-12 text-sm sm:text-base border-2 border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2 border-gray-200/50 dark:border-gray-700/50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md shadow-xl">
                          <SelectItem value="head" className="text-sm sm:text-base rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer">رب الأسرة</SelectItem>
                          <SelectItem value="admin" className="text-sm sm:text-base rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer">مشرف</SelectItem>
                          <SelectItem value="root" className="text-sm sm:text-base rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer">مشرف رئيسي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="identifier" className="text-sm sm:text-base font-semibold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
                        {loginType === "head" ? "رقم الهوية" : "اسم المستخدم"}
                      </Label>
                      <Input
                        id="identifier"
                        placeholder={loginType === "head" ? "405857004" : "username"}
                        {...loginForm.register("identifier")}
                        className="h-12 text-sm sm:text-base border-2 border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      {loginForm.formState.errors.identifier && (
                        <p className="text-xs sm:text-sm text-red-500 dark:text-red-400 mt-1 font-medium animate-in slide-in-from-top-1 duration-200">
                          {loginForm.formState.errors.identifier.message}
                        </p>
                      )}
                    </div>

{loginType !== "head" && !(loginType === "admin" && /^\d{9}$/.test(loginForm.watch("identifier") || "")) && (
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm sm:text-base font-semibold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...loginForm.register("password")}
                        className="h-12 text-sm sm:text-base border-2 border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-xs sm:text-sm text-red-500 dark:text-red-400 mt-1 font-medium animate-in slide-in-from-top-1 duration-200">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full h-12 text-sm sm:text-base mt-6 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                      disabled={loginMutation.isPending}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {loginMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-top-transparent"></div>
                            <span>جاري تسجيل الدخول...</span>
                          </>
                        ) : (
                          <span>تسجيل الدخول</span>
                        )}
                      </div>
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={registrationForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="husbandName" className="text-sm sm:text-base font-semibold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">الاسم الرباعي</Label>
                      <Input
                        id="husbandName"
                        placeholder="محمد فتح محمود أبو طير"
                        {...registrationForm.register("husbandName")}
                        className="h-12 text-sm sm:text-base border-2 border-gray-200/50 dark:border-gray-700/50 rounded-xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:border-blue-300 dark:hover:border-blue-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      />
                      {registrationForm.formState.errors.husbandName && (
                        <p className="text-xs sm:text-sm text-red-500 dark:text-red-400 mt-1 font-medium animate-in slide-in-from-top-1 duration-200">
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
                      className="w-full h-12 text-sm sm:text-base mt-6 bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 hover:from-green-600 hover:via-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                      disabled={registrationMutation.isPending}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {registrationMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-top-transparent"></div>
                            <span>جاري إنشاء الحساب...</span>
                          </>
                        ) : (
                          <span>إنشاء حساب</span>
                        )}
                      </div>
                    </Button>
                  </form>
                </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
