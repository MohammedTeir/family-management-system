import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getRequestStatusInArabic, getRequestTypeInArabic, formatDate } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Header } from "@/components/layout/header";

const requestSchema = z.object({
  type: z.enum(["financial", "medical", "damage"], { required_error: "نوع الطلب مطلوب" }),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
});

type RequestFormData = z.infer<typeof requestSchema>;

export default function Requests() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/requests"],
  });

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: "financial",
      description: "",
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      const res = await apiRequest("POST", "/api/requests", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "تم تقديم الطلب بنجاح",
        description: "سيتم مراجعة طلبكم والرد عليه قريباً",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في تقديم الطلب",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    createRequestMutation.mutate(data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-secondary" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  const pendingRequests = requests?.filter((req: any) => req.status === 'pending') || [];
  const approvedRequests = requests?.filter((req: any) => req.status === 'approved') || [];
  const rejectedRequests = requests?.filter((req: any) => req.status === 'rejected') || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">الطلبات</h1>
            <p className="text-sm sm:text-base text-muted-foreground">تقديم ومتابعة الطلبات والخدمات</p>
          </div>
          
          <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 w-full sm:w-auto justify-center text-sm sm:text-base">
            <Plus className="h-4 w-4" />
            تقديم طلب جديد
          </Button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الطلبات</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {requests?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">قيد المراجعة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {pendingRequests.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">موافق عليها</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {approvedRequests.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
                </div>
                <div className="mr-3 sm:mr-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">مرفوضة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {rejectedRequests.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">قائمة الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {requests && requests.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {requests.map((request: any) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:bg-background">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            <h3 className="text-base sm:text-lg font-semibold text-foreground">
                              {getRequestTypeInArabic(request.type)}
                            </h3>
                          </div>
                          <Badge variant={getStatusBadgeVariant(request.status)} className="text-xs w-fit">
                            {getRequestStatusInArabic(request.status)}
                          </Badge>
                        </div>
                        
                        <p className="text-sm sm:text-base text-muted-foreground mb-3 break-words">
                          {request.description}
                        </p>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                          <span>تاريخ التقديم: {formatDate(request.createdAt)}</span>
                          {request.updatedAt !== request.createdAt && (
                            <span>آخر تحديث: {formatDate(request.updatedAt)}</span>
                          )}
                        </div>
                        
                        {request.adminComment && (
                          <div className="mt-3 sm:mt-4 p-3 bg-blue-50 rounded-lg border-r-4 border-primary">
                            <p className="text-xs sm:text-sm font-medium text-foreground">تعليق الإدارة:</p>
                            <p className="text-xs sm:text-sm text-gray-700 mt-1 break-words">{request.adminComment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground mb-4">لم تقم بتقديم أي طلبات بعد</p>
                <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
                  تقديم طلب جديد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Request Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md mx-4">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">تقديم طلب جديد</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="type" className="text-sm sm:text-base">نوع الطلب *</Label>
                <Select
                  value={form.watch("type")}
                  onValueChange={(value: "financial" | "medical" | "damage") => form.setValue("type", value)}
                >
                  <SelectTrigger className="text-sm sm:text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">مساعدة مالية</SelectItem>
                    <SelectItem value="medical">مساعدة طبية</SelectItem>
                    <SelectItem value="damage">تقرير أضرار</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.type && (
                  <p className="text-xs sm:text-sm text-destructive mt-1">
                    {form.formState.errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-sm sm:text-base">وصف الطلب *</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="يرجى وصف طلبكم بالتفصيل..."
                  className="text-sm sm:text-base"
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-xs sm:text-sm text-destructive mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="w-full sm:w-auto text-sm sm:text-base order-2 sm:order-1"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createRequestMutation.isPending}
                  className="w-full sm:w-auto text-sm sm:text-base order-1 sm:order-2"
                >
                  {createRequestMutation.isPending ? "جاري التقديم..." : "تقديم الطلب"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
