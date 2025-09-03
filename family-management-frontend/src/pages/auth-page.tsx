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
import { useSettings } from "@/hooks/use-settings";

const loginSchema = z.object({
  loginType: z.enum(["head", "admin", "root"]),
  identifier: z.string().min(1, "هذا الحقل مطلوب"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
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
  const { settings } = useSettings();
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
    loginMutation.mutate(
      {
        username: data.loginType === "head" ? data.identifier : data.identifier,
        password: data.password,
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
          let message = error.message;
          // Improved parsing for lockout and remaining attempts
          // Lockout: "الحساب محظور مؤقتاً. يرجى المحاولة بعد {n} دقيقة"
          // Lockout (alt): "تم حظر الحساب لمدة {n} دقيقة بسبب محاولات تسجيل الدخول الفاشلة المتكررة"
          // Remaining: "فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة. المحاولات المتبقية: {n}"
          const lockoutMatch = message.match(/(?:محظور مؤقتاً|حظر الحساب).*?(\d+) دقيقة/);
          const remainingMatch = message.match(/المحاولات المتبقية: (\d+)/);
          if (lockoutMatch) {
            const minutes = lockoutMatch[1];
            toast({
              title: "الحساب محظور مؤقتاً",
              description: `تم حظر الحساب. يرجى الانتظار ${minutes} دقيقة قبل المحاولة مرة أخرى.`,
              variant: "destructive",
            });
          } else if (remainingMatch) {
            const tries = remainingMatch[1];
            toast({
              title: "محاولة تسجيل دخول فاشلة",
              description: `اسم المستخدم أو كلمة المرور غير صحيحة. المحاولات المتبقية: ${tries}`,
              variant: "destructive",
            });
          } else if (
            message.includes("401") ||
            message.toLowerCase().includes("unauthorized") ||
            message.toLowerCase().includes("forbidden")
          ) {
            toast({
              title: "فشل تسجيل الدخول",
              description: "فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة",
              variant: "destructive",
            });
          } else {
            toast({
              title: "فشل تسجيل الدخول",
              description: message,
              variant: "destructive",
            });
          }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hero Section */}
        <div className="hidden lg:flex flex-col justify-center items-center text-center p-8">
          <div className="mb-8">
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mb-6 mx-auto">
              {settings.authPageIcon ? (
                    <img src={settings.authPageIcon} alt="Logo" className="h-8 w-8 rounded" />
                  ) : (
                    <Users className="h-12 w-12 text-white" />
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
            <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
              <UserCheck className="h-8 w-8 text-primary ml-4" />
              <div className="text-right">
                <h3 className="font-semibold text-foreground">إدارة بيانات الأسرة</h3>
                <p className="text-sm text-muted-foreground">تسجيل وتحديث بيانات أفراد الأسرة</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
              <Shield className="h-8 w-8 text-secondary ml-4" />
              <div className="text-right">
                <h3 className="font-semibold text-foreground">تقديم الطلبات</h3>
                <p className="text-sm text-muted-foreground">طلبات المساعدة والخدمات المختلفة</p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-white rounded-lg shadow-sm">
              <Users className="h-8 w-8 text-accent ml-4" />
              <div className="text-right">
                <h3 className="font-semibold text-foreground">المتابعة الإدارية</h3>
                <p className="text-sm text-muted-foreground">متابعة الطلبات والتنبيهات</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">مرحباً بك</CardTitle>
              <CardDescription>يرجى تسجيل الدخول أو إنشاء حساب جديد</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                  <TabsTrigger value="register">حساب جديد</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <div>
                      <Label htmlFor="loginType">نوع المستخدم</Label>
                      <Select
                        value={loginType}
                        onValueChange={(value: "head" | "admin" | "root") => {
                          setLoginType(value);
                          loginForm.setValue("loginType", value);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="head">رب الأسرة</SelectItem>
                          <SelectItem value="admin">مشرف</SelectItem>
                          <SelectItem value="root">مشرف رئيسي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="identifier">
                        {loginType === "head" ? "رقم الهوية" : "اسم المستخدم"}
                      </Label>
                      <Input
                        id="identifier"
                        placeholder={loginType === "head" ? "405857004" : "username"}
                        {...loginForm.register("identifier")}
                      />
                      {loginForm.formState.errors.identifier && (
                        <p className="text-sm text-destructive mt-1">
                          {loginForm.formState.errors.identifier.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...loginForm.register("password")}
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-destructive mt-1">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={registrationForm.handleSubmit(onRegister)} className="space-y-4">
                    <div>
                      <Label htmlFor="husbandName">الاسم الرباعي</Label>
                      <Input
                        id="husbandName"
                        placeholder="محمد فتح محمود أبو طير"
                        {...registrationForm.register("husbandName")}
                      />
                      {registrationForm.formState.errors.husbandName && (
                        <p className="text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.husbandName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="husbandID">رقم الهوية</Label>
                      <Input
                        id="husbandID"
                        placeholder="405857004"
                        {...registrationForm.register("husbandID")}
                      />
                      {registrationForm.formState.errors.husbandID && (
                        <p className="text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.husbandID.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="husbandBirthDate">تاريخ الميلاد</Label>
                      <Input
                        id="husbandBirthDate"
                        type="date"
                        {...registrationForm.register("husbandBirthDate")}
                      />
                      {registrationForm.formState.errors.husbandBirthDate && (
                        <p className="text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.husbandBirthDate.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="husbandJob">المهنة</Label>
                      <Input
                        id="husbandJob"
                        placeholder="مهندس"
                        {...registrationForm.register("husbandJob")}
                      />
                      {registrationForm.formState.errors.husbandJob && (
                        <p className="text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.husbandJob.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="primaryPhone">رقم الجوال</Label>
                      <Input
                        id="primaryPhone"
                        placeholder="0592524815"
                        {...registrationForm.register("primaryPhone")}
                      />
                      {registrationForm.formState.errors.primaryPhone && (
                        <p className="text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.primaryPhone.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="password">كلمة المرور</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...registrationForm.register("password")}
                      />
                      {registrationForm.formState.errors.password && (
                        <p className="text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...registrationForm.register("confirmPassword")}
                      />
                      {registrationForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive mt-1">
                          {registrationForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
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
