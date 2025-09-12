import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Plus, Send, Users, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSettingsContext } from "@/App";
import { PageWrapper } from "@/components/layout/page-wrapper";

const notificationSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب"),
  message: z.string().min(10, "الرسالة يجب أن تكون 10 أحرف على الأقل"),
  target: z.enum(["all", "head", "admin", "specific", "urgent"], { required_error: "نوع المستقبل مطلوب" }),
  recipients: z.array(z.number()).optional(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

export default function AdminNotifications() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const { data: families, isLoading: familiesLoading } = useQuery({
    queryKey: ["/api/admin/families"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

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

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      title: "",
      message: "",
      target: "all",
      recipients: [],
    },
  });

  // Clear recipients if not 'specific'
  useEffect(() => {
    if (form.watch("target") !== "specific") {
      form.setValue("recipients", []);
    }
  }, [form.watch("target")]);

  // Extract unique branches and statuses from families
  const branchOptions = useMemo(() => {
    if (!families) return [];
    return Array.from(new Set(families.map((f: any) => f.branch).filter(Boolean)));
  }, [families]);
  const statusOptions = useMemo(() => {
    if (!families) return [];
    return Array.from(new Set(families.map((f: any) => f.socialStatus).filter(Boolean)));
  }, [families]);

  const adminUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u: any) => u.role === 'admin');
  }, [users]);

  // Filtered heads for selection
  const filteredHeads = useMemo(() => {
    if (!families) return [];
    return families.filter((family: any) => {
      const matchesSearch = family.husbandName.toLowerCase().includes(recipientSearch.toLowerCase()) || family.husbandID.includes(recipientSearch);
      const matchesBranch = branchFilter === 'all' || family.branch === branchFilter;
      const matchesStatus = statusFilter === 'all' || family.socialStatus === statusFilter;
      return matchesSearch && matchesBranch && matchesStatus;
    });
  }, [families, recipientSearch, branchFilter, statusFilter]);

  const createNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      const res = await apiRequest("POST", "/api/notifications", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "تم إرسال التنبيه",
        description: "تم إرسال التنبيه بنجاح إلى المستقبلين",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في الإرسال",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NotificationFormData) => {
    createNotificationMutation.mutate(data);
  };

  const getTargetLabel = (target: string) => {
    switch (target) {
      case 'all':
        return 'جميع المستخدمين';
      case 'head':
        return 'رؤساء الأسر';
      case 'admin':
        return 'المشرفين';
      case 'urgent':
        return 'تنبيه عاجل';
      case 'specific':
        return 'محدد';
      default:
        return target;
    }
  };

  const getNotificationBadge = (notification: any) => {
    if (notification.target === 'urgent') return <Badge className="bg-red-600 text-white">عاجل</Badge>;
    if (notification.target === 'success') return <Badge className="bg-green-600 text-white">نجاح</Badge>;
    if (notification.target === 'head') return <Badge className="bg-purple-600 text-white">رؤساء الأسر</Badge>;
    if (notification.target === 'admin') return <Badge className="bg-orange-500 text-white">مشرفين</Badge>;
    if (notification.target === 'all') return <Badge className="bg-background0 text-white">الكل</Badge>;
    if (notification.target === 'specific') return <Badge className="bg-teal-600 text-white">محدد</Badge>;
    return <Badge variant="default">معلومات</Badge>;
  };

  if (notificationsLoading || familiesLoading) {
    return (
    <PageWrapper>
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">جاري تحميل البيانات...</div>
      </div>
    </PageWrapper>
  );
  }

  const totalNotifications = notifications?.length || 0;
  const thisWeekNotifications = notifications?.filter((n: any) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(n.createdAt) > weekAgo;
  }) || [];

  const filteredNotifications = notifications || [];
  const totalPages = Math.ceil(filteredNotifications.length / pageSize);
  const paginatedNotifications = filteredNotifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <PageWrapper>
      <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">قائمة التنبيهات</h1>
              <p className="text-muted-foreground">إرسال تنبيهات ورسائل للمستخدمين</p>
            </div>
            
            <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              إرسال تنبيه جديد
            </Button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                    <Bell className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">إجمالي التنبيهات</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{totalNotifications}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                    <Send className="h-5 w-5 md:h-6 md:w-6 text-secondary" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">هذا الأسبوع</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{thisWeekNotifications.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="sm:col-span-2 lg:col-span-1">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">المستقبلين النشطين</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{families?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>إرسال سريع</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => {
                    form.setValue("title", "تنبيه عاجل");
                    form.setValue("target", "urgent");
                    setIsDialogOpen(true);
                  }}
                >
                  <AlertCircle className="h-4 w-4 md:h-5 md:w-5 ml-2 md:ml-3 text-accent flex-shrink-0" />
                  <div className="text-right">
                    <div className="font-medium text-sm md:text-base">تنبيه عاجل</div>
                    <div className="text-xs md:text-sm text-muted-foreground">لجميع المستخدمين (بارز)</div>
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start"
                  onClick={() => {
                    form.setValue("title", "إشعار لرؤساء الأسر");
                    form.setValue("target", "head");
                    setIsDialogOpen(true);
                  }}
                >
                  <Users className="h-4 w-4 md:h-5 md:w-5 ml-2 md:ml-3 text-secondary flex-shrink-0" />
                  <div className="text-right">
                    <div className="font-medium text-sm md:text-base">إشعار لرؤساء الأسر</div>
                    <div className="text-xs md:text-sm text-muted-foreground">رؤساء الأسر فقط</div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto p-4 justify-start md:col-span-2 xl:col-span-1"
                  onClick={() => {
                    form.setValue("title", "إشعار للمشرفين");
                    form.setValue("target", "admin");
                    setIsDialogOpen(true);
                  }}
                >
                  <Users className="h-4 w-4 md:h-5 md:w-5 ml-2 md:ml-3 text-orange-500 flex-shrink-0" />
                  <div className="text-right">
                    <div className="font-medium text-sm md:text-base">إشعار للمشرفين</div>
                    <div className="text-xs md:text-sm text-muted-foreground">جميع المشرفين فقط</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة التنبيهات ({filteredNotifications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredNotifications.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-background">
                      <tr>
                        <th className="py-2 px-2 md:px-4 text-left text-xs md:text-sm font-semibold text-muted-foreground">العنوان</th>
                        <th className="py-2 px-2 md:px-4 text-left text-xs md:text-sm font-semibold text-muted-foreground hidden md:table-cell">الرسالة</th>
                        <th className="py-2 px-2 md:px-4 text-left text-xs md:text-sm font-semibold text-muted-foreground">الهدف</th>
                        <th className="py-2 px-2 md:px-4 text-left text-xs md:text-sm font-semibold text-muted-foreground hidden lg:table-cell">المستقبلين</th>
                        <th className="py-2 px-2 md:px-4 text-left text-xs md:text-sm font-semibold text-muted-foreground hidden sm:table-cell">تاريخ الإرسال</th>
                        <th className="py-2 px-2 md:px-4 text-left text-xs md:text-sm font-semibold text-muted-foreground hidden xl:table-cell">من</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedNotifications.map((notification: any) => (
                        <tr key={notification.id} className="hover:bg-muted">
                          <td className="py-2 px-2 md:px-4 text-xs md:text-sm text-foreground">
                            <div className="flex flex-col">
                              <span className="font-medium">{notification.title}</span>
                              <span className="md:hidden text-xs text-muted-foreground mt-1 truncate max-w-32">{notification.message}</span>
                              <span className="sm:hidden text-xs text-muted-foreground mt-1">{formatDate(notification.createdAt)}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 md:px-4 text-xs md:text-sm text-foreground hidden md:table-cell">
                            <span className="max-w-xs truncate block">{notification.message}</span>
                          </td>
                          <td className="py-2 px-2 md:px-4 text-xs md:text-sm text-foreground">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs">{getTargetLabel(notification.target)}</span>
                              {getNotificationBadge(notification)}
                              <span className="lg:hidden text-xs text-muted-foreground mt-1">
                                {notification.target === 'head' && (!notification.recipients || notification.recipients.length === 0) ? (
                                  'جميع رؤساء الأسر'
                                ) : notification.target === 'admin' && (!notification.recipients || notification.recipients.length === 0) ? (
                                  'جميع المشرفين'
                                ) : notification.recipients && notification.recipients.length > 0 ? (
                                  `${notification.recipients.length} مستخدم`
                                ) : (
                                  'جميع المستخدمين'
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-2 md:px-4 text-xs md:text-sm text-foreground hidden lg:table-cell">
                            {notification.target === 'head' && (!notification.recipients || notification.recipients.length === 0) ? (
                              'جميع رؤساء الأسر'
                            ) : notification.target === 'admin' && (!notification.recipients || notification.recipients.length === 0) ? (
                              'جميع المشرفين'
                            ) : notification.recipients && notification.recipients.length > 0 ? (
                              notification.recipients.map((id: number) => {
                                const user = users?.find((u: any) => u.id === id);
                                if (user) {
                                  return `${user.username} (${user.phone || 'بدون رقم'})`;
                                }
                                const family = families?.find((f: any) => f.userId === id);
                                if (family) {
                                  return `${family.husbandName} (${family.husbandID})`;
                                }
                                return id;
                              }).join(', ')
                            ) : (
                              'جميع المستخدمين'
                            )}
                          </td>
                          <td className="py-2 px-2 md:px-4 text-xs md:text-sm text-foreground hidden sm:table-cell">
                            {formatDate(notification.createdAt)}
                          </td>
                          <td className="py-2 px-2 md:px-4 text-xs md:text-sm text-foreground hidden xl:table-cell">الإدارة</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination Controls */}
                  <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      السابق
                    </Button>
                    <div className="flex gap-1 flex-wrap justify-center">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-8"
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لم يتم إرسال أي تنبيهات بعد</p>
                  <Button onClick={() => setIsDialogOpen(true)} className="mt-4">
                    إرسال أول تنبيه
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* New Notification Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl w-[95vw] md:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إرسال تنبيه جديد</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <Label htmlFor="title">عنوان التنبيه *</Label>
                  <Input
                    id="title"
                    placeholder="عنوان التنبيه..."
                    {...form.register("title")}
                  />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="target">المستقبلين *</Label>
                  <Select
                    value={form.watch("target")}
                    onValueChange={(value: "all" | "head" | "admin" | "specific" | "urgent") => form.setValue("target", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستخدمين</SelectItem>
                      <SelectItem value="head">رؤساء الأسر فقط</SelectItem>
                      <SelectItem value="admin">المشرفين فقط</SelectItem>
                      <SelectItem value="urgent">تنبيه عاجل (كل المستخدمين)</SelectItem>
                      <SelectItem value="specific">مستخدمين محددين</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.watch("target") === "all" && "سيتم إرسال التنبيه لجميع المستخدمين (الإدارة ورؤساء الأسر)."}
                    {form.watch("target") === "head" && "سيتم إرسال التنبيه لجميع رؤساء الأسر فقط."}
                    {form.watch("target") === "urgent" && "سيتم إرسال تنبيه عاجل لجميع المستخدمين (سيظهر بشكل بارز)."}
                    {form.watch("target") === "specific" && "اختر رؤساء الأسر الذين تريد إرسال التنبيه لهم."}
                    {form.watch("target") === "admin" && "سيتم إرسال التنبيه لجميع المشرفين فقط."}
                  </p>
                  {form.formState.errors.target && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.target.message}
                    </p>
                  )}
                </div>
                {/* If 'specific', show recipients selection */}
                {form.watch("target") === "specific" && (
                  <div>
                    <Label htmlFor="recipients">اختر رؤساء الأسر</Label>
                    <div className="space-y-2 md:space-y-0 md:flex md:gap-2 mb-2">
                      <Input
                        placeholder="بحث بالاسم أو رقم الهوية..."
                        value={recipientSearch}
                        onChange={e => setRecipientSearch(e.target.value)}
                        className="w-full md:w-48"
                      />
                      <div className="grid grid-cols-2 gap-2 md:flex md:gap-2">
                        <Select value={branchFilter} onValueChange={setBranchFilter}>
                          <SelectTrigger className="w-full md:w-32"><SelectValue>{branchFilter === 'all' ? 'كل الفروع' : branchFilter}</SelectValue></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">كل الفروع</SelectItem>
                            {branchOptions.map((branch) => (
                              <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full md:w-32"><SelectValue>{statusFilter === 'all' ? 'كل الحالات' : statusFilter}</SelectValue></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">كل الحالات الاجتماعية</SelectItem>
                            {statusOptions.map((status) => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded p-2 bg-background">
                      {/* Heads only, no admins */}
                      {filteredHeads.map((family: any) => (
                        <label key={family.userId} className="flex items-center gap-2 py-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.watch('recipients')?.includes(family.userId) || false}
                            onChange={e => {
                              const current = form.watch('recipients') || [];
                              if (e.target.checked) {
                                form.setValue('recipients', [...current, family.userId]);
                              } else {
                                form.setValue('recipients', current.filter((id: number) => id !== family.userId));
                              }
                            }}
                          />
                          <span>{family.husbandName} ({family.husbandID})</span>
                        </label>
                      ))}
                    </div>
                    {form.formState.errors.recipients && (
                      <p className="text-sm text-destructive mt-1">
                        {form.formState.errors.recipients.message}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="message">نص الرسالة *</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    placeholder="اكتب رسالتك هنا..."
                    {...form.register("message")}
                  />
                  {form.formState.errors.message && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.message.message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-0 sm:space-x-2 sm:space-x-reverse pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={createNotificationMutation.isPending}
                    className="bg-primary text-primary-foreground w-full sm:w-auto"
                  >
                    {createNotificationMutation.isPending ? (
                      <>
                        <Send className="h-4 w-4 ml-2 animate-pulse" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 ml-2" />
                        إرسال التنبيه
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
              </div>
    </PageWrapper>
  );
}
