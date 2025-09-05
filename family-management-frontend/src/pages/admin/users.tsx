import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users as UsersIcon, UserPlus, Shield, ShieldCheck, Trash2, Edit2, AlertTriangle, Search, Undo2, Lock, Unlock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { validatePasswordWithPolicy } from "@/lib/utils";
import { PageWrapper } from "@/components/layout/page-wrapper";

// Extend the user schema to include isProtected as boolean
const userSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().optional(),
  role: z.enum(["admin", "head"], { required_error: "نوع المستخدم مطلوب" }),
  phone: z.string().optional(),
  identityId: z.string().optional(),
  isProtected: z.boolean().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cascadeDialogOpen, setCascadeDialogOpen] = useState(false);
  const [familiesToCascade, setFamiliesToCascade] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings.siteTitle, settings.language]);

  // Only allow root users or dual-role admins to access this page
  const isDualRole = currentUser?.role === 'admin' && /^\d+$/.test(currentUser?.username || '');
  if (currentUser?.role !== 'root' && !isDualRole) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-accent mx-auto mb-4" />
            <div className="text-lg text-muted-foreground">غير مصرح لك بالوصول لهذه الصفحة</div>
          </div>
        </div>
      </div>
    );
  }

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ["/api/admin/users"],
  });

 

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "admin",
      phone: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({
        title: "تم إنشاء المستخدم",
        description: "تم إنشاء المستخدم الجديد بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في الإنشاء",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<UserFormData>) => {
      const res = await apiRequest("PUT", `/api/admin/users/${editingUser.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({
        title: "تم تحديث المستخدم",
        description: "تم تحديث بيانات المستخدم بنجاح",
      });
    },
    onError: (error: Error) => {
      let message = error.message;
      if (message.includes('<!DOCTYPE')) {
        message = "حدث خطأ في الاتصال بالخادم أو انتهت الجلسة. يرجى إعادة تسجيل الدخول أو المحاولة لاحقاً.";
      }
      toast({
        title: "خطأ في التحديث",
        description: message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      toast({
        title: "تم حذف المستخدم",
        description: "تم حذف المستخدم من النظام",
      });
    },
    onError: (error: any) => {
      let message = error.message;
      // Always show Arabic toast, even for 500 errors
      if (error.response && error.response.status === 409 && error.response.data?.code === "USER_REFERENCED_IN_FAMILY") {
        // Show cascade dialog
        setFamiliesToCascade(error.response.data.families || []);
        setCascadeDialogOpen(true);
        return;
      }
      if (message.includes('<!DOCTYPE') || message === 'Internal server error') {
        message = "حدث خطأ غير متوقع أثناء حذف المستخدم. يرجى المحاولة لاحقاً أو التواصل مع الدعم.";
      }
      toast({
        title: "خطأ في الحذف",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Cascade delete mutation
  const cascadeDeleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}?cascade=true`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCascadeDialogOpen(false);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
      setFamiliesToCascade([]);
      toast({
        title: "تم حذف المستخدم والعائلات المرتبطة",
        description: "تم حذف المستخدم وجميع العائلات والأفراد المرتبطين به بنجاح.",
      });
    },
    onError: (error: any) => {
      let message = error.message;
      if (message.includes('<!DOCTYPE') || message === 'Internal server error') {
        message = "حدث خطأ غير متوقع أثناء الحذف المتسلسل. يرجى المحاولة لاحقاً أو التواصل مع الدعم.";
      }
      toast({
        title: "خطأ في الحذف المتسلسل",
        description: message,
        variant: "destructive",
      });
    },
  });

  const restoreUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/users/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "تمت الاستعادة",
        description: "تمت استعادة المستخدم بنجاح.",
      });
    },
    onError: (error: any) => {
      let message = error.message;
      if (message.includes('<!DOCTYPE') || message === 'Internal server error') {
        message = "حدث خطأ أثناء استعادة المستخدم. يرجى المحاولة لاحقاً.";
      }
      toast({
        title: "خطأ في الاستعادة",
        description: message,
        variant: "destructive",
      });
    },
  });

  const resetLockoutMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/users/${id}/reset-lockout`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "تم إلغاء الحظر",
        description: "تم إلغاء حظر المستخدم بنجاح.",
      });
    },
    onError: (error: any) => {
      let message = error.message;
      toast({
        title: "خطأ في إلغاء الحظر",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Ensure users is always an array
  const usersArray = Array.isArray(users) ? users : [];

  const totalUsers = usersArray.length;
  // Helper to check if a string is all digits
  const isNumeric = (str: string) => /^\d+$/.test(str);

  // Count heads: users with role 'head' OR admins with all-numeric username
  const headUsers = usersArray.filter(
    (user: any) =>
      user.role === 'head' ||
      (user.role === 'admin' && isNumeric(user.username))
  );

  // Count admins: users with role 'admin' AND username is NOT all-numeric
  const adminUsers = usersArray.filter(
    (user: any) =>
      user.role === 'admin' && !isNumeric(user.username)
  );
  const protectedUsers = usersArray.filter((user: any) => user.isProtected);

  const filteredUsers = usersArray.filter((user: any) =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const onSubmit = (data: UserFormData) => {
    // For new user, password required and must match policy
    if (!editingUser) {
      if (!data.password) {
        form.setError("password", { type: "manual", message: "كلمة المرور مطلوبة" });
        return;
      }
      const passwordErrors = validatePasswordWithPolicy(data.password, settings);
      if (passwordErrors.length > 0) {
        passwordErrors.forEach(msg => form.setError("password", { type: "manual", message: msg }));
        return;
      }
    }
    // For edit, if password entered, must match policy
    if (editingUser && data.password && data.password.length > 0) {
      const passwordErrors = validatePasswordWithPolicy(data.password, settings);
      if (passwordErrors.length > 0) {
        passwordErrors.forEach(msg => form.setError("password", { type: "manual", message: msg }));
        return;
      }
    }
    if (editingUser) {
      const updateData: Partial<UserFormData> = { ...data };
      if (!data.password) {
        delete (updateData as any).password;
      }
      updateUserMutation.mutate(updateData);
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEdit = (user: any) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      password: "", // Don't pre-fill password for security
      role: user.role,
      phone: user.phone || "",
      isProtected: !!user.isProtected, // ensure boolean
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.reset({
      username: "",
      password: "",
      role: "head", // or your default
      phone: "",
      isProtected: false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (user: any) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Permission logic for edit/delete buttons
  const canEditOrDelete = (targetUser: any) => {
    if (!currentUser) return false;
    if (currentUser.role === 'root') {
      // Root can edit/delete anyone except themselves
      return targetUser.id !== currentUser.id;
    }
    if (currentUser.role === 'admin') {
      // Admins cannot edit/delete root
      if (targetUser.role === 'root') return false;
      // Admins cannot edit/delete protected admins
      if (targetUser.role === 'admin' && targetUser.isProtected) return false;
      // Admins can edit/delete heads and unprotected admins
      if (targetUser.role === 'head' || (targetUser.role === 'admin' && !targetUser.isProtected)) return true;
      return false;
    }
    return false;
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'root':
        return 'مشرف رئيسي';
      case 'admin':
        return 'مشرف';
      case 'head':
        return 'رب أسرة';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'root':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'head':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
    <PageWrapper>
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">جاري تحميل البيانات...</div>
      </div>
    </PageWrapper>
  );
  }

  if (isError) {
    return (
    <PageWrapper>
      <div className="space-y-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg text-red-600">حدث خطأ أثناء تحميل المستخدمين</div>
            </div>
                </div>
    </PageWrapper>
  );
  }

  return (
    <PageWrapper>
      <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">إدارة المستخدمين</h1>
              <p className="text-sm sm:text-base text-muted-foreground">إدارة المستخدمين وصلاحياتهم</p>
            </div>
            
            <Button onClick={handleAdd} className="flex items-center gap-2 w-full sm:w-auto">
              <UserPlus className="h-4 w-4" />
              <span className="sm:inline">إضافة مستخدم جديد</span>
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2 mb-8">
            <div className="relative w-full sm:w-80">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث باسم المستخدم أو رقم الجوال..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
                    <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="mr-3 sm:mr-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">إجمالي المستخدمين</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-purple-500/10 rounded-lg flex-shrink-0">
                    <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                  <div className="mr-3 sm:mr-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">المشرفين</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{adminUsers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-secondary/10 rounded-lg flex-shrink-0">
                    <UsersIcon className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                  </div>
                  <div className="mr-3 sm:mr-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">رؤساء الأسر</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{headUsers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 sm:p-3 bg-accent/10 rounded-lg flex-shrink-0">
                    <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
                  </div>
                  <div className="mr-3 sm:mr-4">
                    <p className="text-xs sm:text-sm text-muted-foreground">محميين</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground">{protectedUsers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning for protected users */}
          <Card className="mb-8 border-warning/20 bg-warning/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning mt-1 ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm sm:text-base font-medium text-warning mb-1">ملاحظة مهمة</h3>
                  <p className="text-xs sm:text-sm text-foreground">
                    لا يمكن تعديل أو حذف المستخدمين المحميين أو المشرفين الرئيسيين. 
                    كما لا يمكنك تعديل حسابك الشخصي من هذه الصفحة.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">قائمة المستخدمين ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {filteredUsers.length > 0 ? (
                <div className="overflow-x-auto -mx-4 sm:mx-0 rounded-lg border border-border bg-card shadow mt-6">
                  <table className="w-full min-w-[700px] sm:min-w-0 divide-y divide-border">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">اسم المستخدم</th>
                        <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">الدور</th>
                        <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">رقم الجوال</th>
                        <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">الحالة</th>
                        <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium text-muted-foreground">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {usersArray.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((user: any) => {
                        const isDeleted = !!user.deletedAt;
                        const isLocked = user.lockoutUntil && new Date(user.lockoutUntil) > new Date();
                        return (
                          <tr key={user.id} className={isDeleted ? "bg-muted text-muted-foreground" : "hover:bg-muted"}>
                            <td className="px-2 sm:px-4 py-3 text-sm">{user.username}</td>
                            <td className="px-2 sm:px-4 py-3">
                              <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">{getRoleLabel(user.role)}</Badge>
                          </td>
                            <td className="px-2 sm:px-4 py-3 text-sm">{user.phone || "-"}</td>
                            <td className="px-2 sm:px-4 py-3">
                              {isDeleted ? (
                                <Badge variant="destructive" className="text-xs">محذوف</Badge>
                              ) : isLocked ? (
                                <Badge variant="warning" className="text-xs"><Lock className="inline w-3 h-3 mr-1" />محظور مؤقتاً</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">نشط</Badge>
                              )}
                          </td>
                            <td className="px-2 sm:px-4 py-3 flex flex-wrap gap-1 sm:gap-2">
                              {!isDeleted && canEditOrDelete(user) && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handleEdit(user)} title="تعديل" className="h-8 w-8 p-0">
                                    <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(user)} title="حذف" className="h-8 w-8 p-0">
                                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                                  </Button>
                                  {isLocked && (
                                    <Button size="sm" variant="ghost" onClick={() => resetLockoutMutation.mutate(user.id)} title="إلغاء الحظر" className="h-8 w-8 p-0">
                                      <Unlock className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                    </Button>
                                  )}
                                </>
                              )}
                              {isDeleted && (
                                <Button size="sm" variant="ghost" onClick={() => restoreUserMutation.mutate(user.id)} title="استعادة المستخدم" className="h-8 w-8 p-0">
                                  <Undo2 className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                                </Button>
                              )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {/* Pagination Controls */}
                  <div className="flex flex-wrap justify-center items-center gap-2 mt-4 px-4 sm:px-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="text-xs sm:text-sm"
                    >
                      السابق
                    </Button>
                    <span className="text-sm sm:text-base text-foreground px-2">صفحة {currentPage} من {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="text-xs sm:text-sm"
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 px-4">
                  <UsersIcon className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-muted-foreground">لا توجد مستخدمين</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit User Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-[95vw] w-full sm:max-w-md lg:max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-sm sm:text-base">اسم المستخدم *</Label>
                  <Input
                    id="username"
                    placeholder="اسم المستخدم"
                    {...form.register("username", { required: true })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm sm:text-base">كلمة المرور (اتركها فارغة للاحتفاظ بالحالية)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...form.register("password")}
                    className="mt-1"
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role" className="text-sm sm:text-base">نوع المستخدم *</Label>
                  <Select
                    value={form.watch("role")}
                    onValueChange={(value: "admin" | "head") => form.setValue("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">مشرف</SelectItem>
                      <SelectItem value="head">رب أسرة</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">
                      {form.formState.errors.role.message}
                    </p>
                  )}
                </div>

                {/* Info box only when editing a head and promoting to admin */}
                {editingUser && editingUser.role === 'head' && form.watch('role') === 'admin' && (
                  <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded text-foreground text-xs sm:text-sm">
                    <strong>تنبيه:</strong> عند ترقية رب الأسرة إلى مشرف، سيبقى بإمكانه تسجيل الدخول كرب أسرة باستخدام رقم الهوية، وكـ مشرف باستخدام اسم المستخدم. لن يتم تغيير اسم المستخدم الحالي.
                  </div>
                )}

                {/* Visual badge for dual-role only when editing a dual-role user */}
                {editingUser && editingUser.role === 'admin' && editingUser.identityId && (
                  <div className="mb-2">
                    <span className="inline-block bg-secondary/10 text-secondary px-3 py-1 rounded text-xs font-bold">مشرف + رب أسرة</span>
                  </div>
                )}

                <div>
                  <Label htmlFor="phone" className="text-sm sm:text-base">رقم الجوال</Label>
                  <Input
                    id="phone"
                    placeholder="0592524815"
                    {...form.register("phone")}
                    className="mt-1"
                  />
                </div>

                
                {currentUser?.role === 'root' && editingUser && editingUser.id !== currentUser.id && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="isProtected" className="text-sm">مستخدم محمي</Label>
                      <input
                        type="checkbox"
                        id="isProtected"
                        {...form.register("isProtected")}
                        checked={form.watch("isProtected")}
                        onChange={e => form.setValue("isProtected", e.target.checked)}
                        className="h-4 w-4"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">تفعيل هذا الخيار يجعل المستخدم محمي من الحذف أو التعديل من قبل غير المشرف الرئيسي.</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 sm:space-x-reverse pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUserMutation.isPending || updateUserMutation.isPending}
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    {(createUserMutation.isPending || updateUserMutation.isPending) ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                <AlertDialogDescription>
                  هل أنت متأكد من حذف المستخدم "{userToDelete?.username}"؟ 
                  هذا الإجراء لا يمكن التراجع عنه.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  حذف
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Cascade Delete Confirmation Dialog */}
          <AlertDialog open={cascadeDialogOpen} onOpenChange={setCascadeDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد الحذف المتسلسل</AlertDialogTitle>
                <AlertDialogDescription>
                  لا يمكن حذف هذا المستخدم لأنه مرتبط بعائلات. إذا تابعت، سيتم حذف جميع العائلات والأفراد المرتبطين به بشكل نهائي.
                  <ul className="mt-4 text-right text-sm text-red-700">
                    {familiesToCascade.map(f => (
                      <li key={f.id}>• {f.husbandName} (رقم الهوية: {f.husbandID})</li>
                    ))}
                  </ul>
                  <div className="mt-4 font-bold text-red-800">هل تريد بالتأكيد حذف المستخدم وجميع العائلات المرتبطة به؟ هذا الإجراء لا يمكن التراجع عنه.</div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse">
                <AlertDialogCancel onClick={() => setCascadeDialogOpen(false)}>إلغاء</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setCascadeDialogOpen(false);
                    if (userToDelete) cascadeDeleteUserMutation.mutate(userToDelete.id);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  حذف المستخدم والعائلات المرتبطة
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
              </div>
    </PageWrapper>
  );
}
