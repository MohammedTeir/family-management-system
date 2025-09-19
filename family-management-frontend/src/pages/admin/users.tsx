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
import { Users as UsersIcon, UserPlus, Shield, ShieldCheck, Trash2, Edit2, AlertTriangle, Search, Undo2, Lock, Unlock, Loader2, Crown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { useSettingsContext } from "@/App";
import { useEffect } from "react";
import { validatePasswordWithPolicy } from "@/lib/utils";
import { PageWrapper } from "@/components/layout/page-wrapper";

// Extend the user schema to include isProtected as boolean
const userSchema = z.object({
  username: z.string().min(3, "اسم المستخدم يجب أن يكون 3 أحرف على الأقل"),
  password: z.string().optional(),
  role: z.literal("admin"),
  phone: z.string().optional(),
  isProtected: z.boolean().optional(),
});

const headSchema = z.object({
  username: z.string().regex(/^\d{9}$/, "رقم الهوية يجب أن يكون 9 أرقام"),
  husbandName: z.string().min(1, "الاسم مطلوب"),
  husbandBirthDate: z.string().min(1, "تاريخ الميلاد مطلوب"),
  husbandJob: z.string().min(1, "المهنة مطلوبة"),
  primaryPhone: z.string().min(1, "رقم الجوال مطلوب"),
  secondaryPhone: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;
type HeadFormData = z.infer<typeof headSchema>;

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isHeadDialogOpen, setIsHeadDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cascadeDialogOpen, setCascadeDialogOpen] = useState(false);
  const [familiesToCascade, setFamiliesToCascade] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deleteAllHeadsDialogOpen, setDeleteAllHeadsDialogOpen] = useState(false);
  const [headsToDelete, setHeadsToDelete] = useState<any[]>([]);
  const { settings } = useSettingsContext();

  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings.siteTitle, settings.language]);

  // Only allow root users and admins to access this page
  if (currentUser?.role !== 'root' && currentUser?.role !== 'admin') {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-accent mx-auto mb-4" />
            <div className="text-lg text-muted-foreground">غير مصرح لك بالوصول لهذه الصفحة</div>
          </div>
        </div>
      </PageWrapper>
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
      isProtected: false,
    },
  });

  const headForm = useForm<HeadFormData>({
    resolver: zodResolver(headSchema),
    defaultValues: {
      username: "",
      husbandName: "",
      husbandBirthDate: "",
      husbandJob: "",
      primaryPhone: "",
      secondaryPhone: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      return res.data;
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

  const createHeadMutation = useMutation({
    mutationFn: async (data: HeadFormData) => {
      const requestData = {
        user: {}, // No password needed for heads created by admin
        family: {
          husbandID: data.username,
          husbandName: data.husbandName,
          husbandBirthDate: data.husbandBirthDate,
          husbandJob: data.husbandJob,
          primaryPhone: data.primaryPhone,
          secondaryPhone: data.secondaryPhone
        },
        members: []
      };
      const res = await apiRequest("POST", "/api/register-family", requestData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsHeadDialogOpen(false);
      headForm.reset();
      toast({
        title: "تم إنشاء رب الأسرة",
        description: "تم إنشاء رب الأسرة الجديد بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في إنشاء رب الأسرة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data: Partial<UserFormData>) => {
      const res = await apiRequest("PUT", `/api/admin/users/${editingUser.id}`, data);
      return res.data;
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

  // Delete all heads mutation
  const deleteAllHeadsMutation = useMutation({
    mutationFn: async () => {
      const headsToDeleteIds = headUsers.map(user => user.id);
      // Delete all heads with cascade and hard delete
      const deletePromises = headsToDeleteIds.map(id => 
        apiRequest("DELETE", `/api/admin/users/${id}?cascade=true&hard=true`)
      );
      await Promise.all(deletePromises);
      return headsToDeleteIds.length;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setDeleteAllHeadsDialogOpen(false);
      setHeadsToDelete([]);
      toast({
        title: "تم حذف جميع رؤساء الأسر",
        description: `تم حذف ${deletedCount} رب أسرة وجميع العائلات والأفراد المرتبطين بهم بنجاح.`,
      });
    },
    onError: (error: any) => {
      let message = error.message;
      if (message.includes('<!DOCTYPE') || message === 'Internal server error') {
        message = "حدث خطأ غير متوقع أثناء حذف رؤساء الأسر. يرجى المحاولة لاحقاً أو التواصل مع الدعم.";
      }
      toast({
        title: "خطأ في حذف رؤساء الأسر",
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

  const filteredUsers = usersArray.filter((user: any) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      user.username.toLowerCase().includes(searchLower) ||
      user.phone?.toLowerCase().includes(searchLower)
    );
    
    // Filter by role tab
    const matchesRole = (() => {
      switch (activeTab) {
        case "admins":
          return user.role === 'admin' && !isNumeric(user.username);
        case "heads":
          return user.role === 'head' || (user.role === 'admin' && isNumeric(user.username));
        case "root":
          return user.role === 'root';
        default:
          return true; // "all" tab
      }
    })();
    
    return matchesSearch && matchesRole;
  });
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const onSubmit = (data: UserFormData) => {
    // For new admin user, password is required
    if (!editingUser && !data.password) {
      form.setError("password", { type: "manual", message: "كلمة المرور مطلوبة للمشرفين" });
      return;
    }
    
    // If password is provided, validate it
    if (data.password) {
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

  const onHeadSubmit = (data: HeadFormData) => {
    createHeadMutation.mutate(data);
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
      role: "admin",
      phone: "",
      isProtected: false,
    });
    setIsDialogOpen(true);
  };

  const handleAddHead = () => {
    headForm.reset({
      username: "",
      husbandName: "",
      husbandBirthDate: "",
      husbandJob: "",
      primaryPhone: "",
      secondaryPhone: "",
    });
    setIsHeadDialogOpen(true);
  };

  const handleDeleteAllHeads = () => {
    setHeadsToDelete(headUsers);
    setDeleteAllHeadsDialogOpen(true);
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
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAdd} className="flex items-center gap-2 w-full sm:w-auto">
                <Shield className="h-4 w-4" />
                <span className="sm:inline">إضافة مشرف</span>
              </Button>
              <Button 
                onClick={handleAddHead}
                variant="outline" 
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <UserPlus className="h-4 w-4" />
                <span className="sm:inline">إضافة رب أسرة</span>
              </Button>
              {headUsers.length > 0 && (
                <Button 
                  onClick={handleDeleteAllHeads}
                  variant="destructive" 
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sm:inline">حذف جميع رؤساء الأسر</span>
                </Button>
              )}
            </div>
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

          {/* Role Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 border-b border-border">
              <button
                onClick={() => {setActiveTab("all"); setCurrentPage(1);}}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "all" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <UsersIcon className="inline w-4 h-4 mr-2" />
                الكل ({usersArray.length})
              </button>
              <button
                onClick={() => {setActiveTab("admins"); setCurrentPage(1);}}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "admins" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="inline w-4 h-4 mr-2" />
                المشرفين ({adminUsers.length})
              </button>
              <button
                onClick={() => {setActiveTab("heads"); setCurrentPage(1);}}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "heads" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <UsersIcon className="inline w-4 h-4 mr-2" />
                رؤساء الأسر ({headUsers.length})
              </button>
              <button
                onClick={() => {setActiveTab("root"); setCurrentPage(1);}}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "root" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Crown className="inline w-4 h-4 mr-2" />
                المشرفين الرئيسيين ({usersArray.filter((u: any) => u.role === 'root').length})
              </button>
            </div>
          </div>

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
                      {paginatedUsers.map((user: any) => {
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
                                <Badge variant="destructive" className="text-xs"><Lock className="inline w-3 h-3 mr-1" />محظور مؤقتاً</Badge>
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
                  {editingUser ? "تعديل المشرف" : "إضافة مشرف جديد"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  الحقول المتاحة: اسم المستخدم، كلمة المرور، رقم الجوال، حالة الحماية
                </p>
              </DialogHeader>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-sm sm:text-base">اسم المستخدم *</Label>
                  <Input
                    id="username"
                    placeholder="أدخل اسم المستخدم (مثال: admin01)"
                    {...form.register("username", { required: true })}
                    className="mt-1"
                  />
                  {form.formState.errors.username && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{form.formState.errors.username.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm sm:text-base">كلمة المرور {!editingUser ? "*" : "(اتركها فارغة للاحتفاظ بالحالية)"}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="أدخل كلمة المرور"
                    {...form.register("password")}
                    className="mt-1"
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{form.formState.errors.password.message}</p>
                  )}
                </div>

                {/* Info box only when editing a head and promoting to admin */}
                {editingUser && editingUser.role === 'head' && form.watch('role') === 'admin' && (
                  <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded text-foreground text-xs sm:text-sm">
                    <strong>تنبيه:</strong> عند ترقية رب الأسرة إلى مشرف، سيبقى بإمكانه تسجيل الدخول كرب أسرة باستخدام رقم الهوية، وكـ مشرف باستخدام اسم المستخدم. لن يتم تغيير اسم المستخدم الحالي.
                  </div>
                )}

                {/* Visual badge for dual-role only when editing a dual-role user with numeric username */}
                {editingUser && editingUser.role === 'admin' && /^\d+$/.test(editingUser.username) && (
                  <div className="mb-2">
                    <span className="inline-block bg-secondary/10 text-secondary px-3 py-1 rounded text-xs font-bold">مشرف + رب أسرة</span>
                  </div>
                )}

                <div>
                  <Label htmlFor="phone" className="text-sm sm:text-base">رقم الجوال</Label>
                  <Input
                    id="phone"
                    placeholder="أدخل رقم الجوال (مثال: 0592524815)"
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

          {/* Add Head User Dialog */}
          <Dialog open={isHeadDialogOpen} onOpenChange={setIsHeadDialogOpen}>
            <DialogContent className="max-w-[95vw] w-full sm:max-w-md lg:max-w-lg p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إضافة رب أسرة جديد</DialogTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  أدخل البيانات الأساسية لرب الأسرة الجديد
                </p>
              </DialogHeader>
              
              <form onSubmit={headForm.handleSubmit(onHeadSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="head-username" className="text-sm sm:text-base">رقم الهوية *</Label>
                  <Input
                    id="head-username"
                    placeholder="أدخل رقم الهوية (9 أرقام)"
                    {...headForm.register("username", { required: true })}
                    className="mt-1"
                  />
                  {headForm.formState.errors.username && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{headForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="head-name" className="text-sm sm:text-base">الاسم الرباعي *</Label>
                  <Input
                    id="head-name"
                    placeholder="أدخل الاسم الرباعي"
                    {...headForm.register("husbandName", { required: true })}
                    className="mt-1"
                  />
                  {headForm.formState.errors.husbandName && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{headForm.formState.errors.husbandName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="head-birthdate" className="text-sm sm:text-base">تاريخ الميلاد *</Label>
                  <Input
                    id="head-birthdate"
                    type="date"
                    {...headForm.register("husbandBirthDate", { required: true })}
                    className="mt-1"
                  />
                  {headForm.formState.errors.husbandBirthDate && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{headForm.formState.errors.husbandBirthDate.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="head-job" className="text-sm sm:text-base">المهنة *</Label>
                  <Input
                    id="head-job"
                    placeholder="أدخل المهنة"
                    {...headForm.register("husbandJob", { required: true })}
                    className="mt-1"
                  />
                  {headForm.formState.errors.husbandJob && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{headForm.formState.errors.husbandJob.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="head-primary-phone" className="text-sm sm:text-base">رقم الجوال الأساسي *</Label>
                  <Input
                    id="head-primary-phone"
                    placeholder="أدخل رقم الجوال (مثال: 0592524815)"
                    {...headForm.register("primaryPhone", { required: true })}
                    className="mt-1"
                  />
                  {headForm.formState.errors.primaryPhone && (
                    <p className="text-xs sm:text-sm text-destructive mt-1">{headForm.formState.errors.primaryPhone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="head-secondary-phone" className="text-sm sm:text-base">رقم الجوال البديل</Label>
                  <Input
                    id="head-secondary-phone"
                    placeholder="أدخل رقم الجوال البديل"
                    {...headForm.register("secondaryPhone")}
                    className="mt-1"
                  />
                </div>


                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:space-x-2 sm:space-x-reverse pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsHeadDialogOpen(false)}
                    className="w-full sm:w-auto order-2 sm:order-1"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={createHeadMutation.isPending}
                    className="w-full sm:w-auto order-1 sm:order-2"
                  >
                    {createHeadMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Delete All Heads Confirmation Dialog */}
          <AlertDialog open={deleteAllHeadsDialogOpen} onOpenChange={setDeleteAllHeadsDialogOpen}>
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>تأكيد حذف جميع رؤساء الأسر</AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteAllHeadsMutation.isPending ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin text-destructive" />
                        <div className="text-center">
                          <p className="font-medium text-destructive">جاري حذف جميع رؤساء الأسر...</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            يتم حذف {headUsers.length} رب أسرة وجميع البيانات المرتبطة بهم
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            ⚠️ هذه العملية قد تستغرق عدة دقائق، يرجى عدم إغلاق النافذة
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      هذا الإجراء سيحذف جميع رؤساء الأسر ({headUsers.length} مستخدم) وجميع العائلات والأفراد المرتبطين بهم بشكل نهائي ودائم من قاعدة البيانات.
                      <br/><br/>
                      <strong className="text-destructive">⚠️ حذف دائم - لا يمكن التراجع عنه أو استعادة البيانات. هل أنت متأكد من المتابعة؟</strong>
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse">
                <AlertDialogCancel 
                  onClick={() => setDeleteAllHeadsDialogOpen(false)}
                  disabled={deleteAllHeadsMutation.isPending}
                >
                  {deleteAllHeadsMutation.isPending ? "إغلاق" : "إلغاء"}
                </AlertDialogCancel>
                {!deleteAllHeadsMutation.isPending && (
                  <AlertDialogAction
                    onClick={() => deleteAllHeadsMutation.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    حذف جميع رؤساء الأسر
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
              </div>
    </PageWrapper>
  );
}