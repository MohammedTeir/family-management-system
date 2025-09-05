import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { FileText, Search, Eye, Check, X, Clock, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getRequestStatusInArabic, getRequestTypeInArabic, formatDate } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function AdminRequests() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: "pending",
    adminComment: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/requests"],
  });

  const { data: families, isLoading: familiesLoading } = useQuery({
    queryKey: ["/api/admin/families"],
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, adminComment }: { id: number; status: string; adminComment?: string }) => {
      const res = await apiRequest("PUT", `/api/requests/${id}`, { status, adminComment });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      setIsDialogOpen(false);
      setSelectedRequest(null);
      setAdminComment("");
      toast({
        title: "تم تحديث الطلب",
        description: "تم تحديث حالة الطلب بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في التحديث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredRequests = Array.isArray(requests) ? requests.filter((request: any) => {
    const matchesSearch = request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          request.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === "all" || request.status === statusFilter;
    const matchesType = typeFilter === "all" || request.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) : [];

  const totalPages = Math.ceil(filteredRequests.length / pageSize);
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleViewRequest = (request: any) => {
    let reqWithFamily = request;
    if (!request.family && Array.isArray(families)) {
      const foundFamily = families.find((f: any) => f.id === request.familyId);
      if (foundFamily) {
        reqWithFamily = { ...request, family: foundFamily };
      }
    }
    setSelectedRequest(reqWithFamily);
    setAdminComment(request.adminComment || "");
    setIsDialogOpen(true);
    setIsEditMode(false); // Ensure it's not in edit mode when viewing
  };

  const handleUpdateRequest = (status: string) => {
    if (selectedRequest) {
      updateRequestMutation.mutate({
        id: selectedRequest.id,
        status,
        adminComment: adminComment.trim() || undefined
      });
    }
  };

  const handleEditRequest = () => {
    setIsEditMode(true);
    setEditFormData({
      status: selectedRequest.status,
      adminComment: selectedRequest.adminComment || "",
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({
      status: selectedRequest.status,
      adminComment: selectedRequest.adminComment || "",
    });
  };

  const handleSaveEdit = () => {
    if (selectedRequest) {
      updateRequestMutation.mutate({
        id: selectedRequest.id,
        status: editFormData.status,
        adminComment: editFormData.adminComment.trim() || undefined,
      });
      setIsEditMode(false);
    }
  };

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

  if (isLoading) {
    return (
    <PageWrapper>
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">جاري تحميل البيانات...</div>
      </div>
    </PageWrapper>
  );
  }

  const totalRequests = Array.isArray(requests) ? requests.length : 0;
  const pendingRequests = Array.isArray(requests) ? requests.filter((req: any) => req.status === 'pending') : [];
  const approvedRequests = Array.isArray(requests) ? requests.filter((req: any) => req.status === 'approved') : [];
  const rejectedRequests = Array.isArray(requests) ? requests.filter((req: any) => req.status === 'rejected') : [];

  return (
    <PageWrapper>
      <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">إدارة الطلبات</h1>
            <p className="text-muted-foreground">مراجعة والرد على طلبات الأسر</p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">إجمالي الطلبات</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{totalRequests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-warning" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">قيد المراجعة</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{pendingRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                    <Check className="h-5 w-5 md:h-6 md:w-6 text-secondary" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">موافق عليها</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{approvedRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 md:p-3 bg-red-100 rounded-lg">
                    <X className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
                  </div>
                  <div className="mr-3 md:mr-4">
                    <p className="text-xs md:text-sm text-muted-foreground">مرفوضة</p>
                    <p className="text-xl md:text-2xl font-bold text-foreground">{rejectedRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                البحث والتصفية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-3 gap-4">
                <div className="relative md:col-span-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="البحث برقم الطلب أو الوصف..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 w-full"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 md:col-span-2 md:grid-cols-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="تصفية بالحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="pending">قيد المراجعة</SelectItem>
                      <SelectItem value="approved">موافق عليها</SelectItem>
                      <SelectItem value="rejected">مرفوضة</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="تصفية بالنوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="financial">مساعدة مالية</SelectItem>
                      <SelectItem value="medical">مساعدة طبية</SelectItem>
                      <SelectItem value="damage">تقرير أضرار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة الطلبات ({filteredRequests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رقم الطلب</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">نوع الطلب</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">الوصف</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">التاريخ</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الحالة</th>
                        <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {paginatedRequests.map((request: any) => (
                        <tr key={request.id} className="hover:bg-muted">
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            #{request.id}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            <div className="flex flex-col">
                              <span>{getRequestTypeInArabic(request.type)}</span>
                              <span className="lg:hidden text-xs text-muted-foreground mt-1">{formatDate(request.createdAt)}</span>
                              <span className="md:hidden text-xs text-muted-foreground mt-1 truncate max-w-32">{request.description}</span>
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-4 text-sm text-foreground max-w-xs truncate hidden md:table-cell">
                            {request.description}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-muted-foreground hidden lg:table-cell">
                            {formatDate(request.createdAt)}
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                            <Badge variant={
                              request.status === 'pending' ? 'default' :
                              request.status === 'approved' ? 'success' : 'destructive'
                            } className="text-xs">
                              {getRequestStatusInArabic(request.status)}
                            </Badge>
                          </td>
                          <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex flex-wrap gap-1 md:flex-nowrap md:space-x-2 md:space-x-reverse">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewRequest(request)}
                                disabled={updateRequestMutation.isPending}
                                className="w-8 h-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {request.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-secondary w-8 h-8 p-0"
                                    onClick={() => handleUpdateRequest('approved')}
                                    disabled={updateRequestMutation.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-destructive w-8 h-8 p-0"
                                    onClick={() => handleUpdateRequest('rejected')}
                                    disabled={updateRequestMutation.isPending}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
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
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                      ? 'لم يتم العثور على طلبات تطابق المعايير' 
                      : 'لا توجد طلبات'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Details Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-2xl w-[95vw] md:w-full max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-center">تفاصيل الطلب #{selectedRequest?.id}</DialogTitle>
                <DialogDescription className="text-center">
                  عرض تفاصيل الطلب مع إمكانية الموافقة أو الرفض
                </DialogDescription>
              </DialogHeader>
              {selectedRequest && (
                <div className="space-y-6">
                  {/* Request Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">معلومات الطلب</h4>
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">نوع الطلب:</span>
                          <span className="font-medium">{getRequestTypeInArabic(selectedRequest.type)}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                          <span className="text-muted-foreground">الحالة:</span>
                          <Badge variant={
                            selectedRequest.status === 'pending' ? 'default' :
                            selectedRequest.status === 'approved' ? 'default' : 'destructive'
                          }>
                            {getRequestStatusInArabic(selectedRequest.status)}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">تاريخ التقديم:</span>
                          <span className="font-medium">{formatDate(selectedRequest.createdAt)}</span>
                        </div>
                        {selectedRequest.updatedAt && (
                          <div className="flex flex-col sm:flex-row sm:justify-between">
                            <span className="text-muted-foreground">آخر تحديث:</span>
                            <span className="font-medium">{formatDate(selectedRequest.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">معلومات مقدم الطلب</h4>
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">اسم رب الأسرة:</span>
                          <span className="font-medium text-right">{selectedRequest.family?.husbandName || 'غير محدد'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">رقم الهوية:</span>
                          <span className="font-medium">{selectedRequest.family?.husbandID || 'غير محدد'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">رقم الجوال:</span>
                          <span className="font-medium">{selectedRequest.family?.primaryPhone || 'غير محدد'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between">
                          <span className="text-muted-foreground">الوصف:</span>
                          <span className="font-medium text-right break-words">{selectedRequest.description || 'غير محدد'}</span>
                        </div>
                        {selectedRequest.adminComment && (
                          <div className="flex flex-col sm:flex-row sm:justify-between">
                            <span className="text-muted-foreground">التعليق الإداري:</span>
                            <span className="font-medium text-right text-blue-600 break-words">{selectedRequest.adminComment}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Admin Comment Field - Show in both view and edit modes for pending requests */}
                  {selectedRequest.status === 'pending' && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-semibold text-foreground">
                        {isEditMode ? 'تعديل حالة الطلب' : 'إجراء على الطلب'}
                      </h4>
                      {isEditMode && (
                        <div className="space-y-2">
                          <Label htmlFor="editStatus">حالة الطلب</Label>
                          <Select
                            value={editFormData.status}
                            onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر حالة الطلب" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">معلق</SelectItem>
                              <SelectItem value="approved">تمت الموافقة</SelectItem>
                              <SelectItem value="rejected">مرفوض</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {/* Admin Comment Field */}
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                          <div className="flex-1">
                            <Label htmlFor="adminComment">تعليق إداري</Label>
                            <Input
                              id="adminComment"
                              placeholder="أضف تعليقاً إدارياً (اختياري)"
                              value={adminComment}
                              onChange={(e) => setAdminComment(e.target.value)}
                            />
                          </div>
                          {/* Save Comment Button (only if not in edit mode) */}
                          {!isEditMode && (
                            <Button
                              variant="secondary"
                              disabled={updateRequestMutation.isPending || adminComment.trim() === (selectedRequest.adminComment || "").trim()}
                              onClick={() => {
                                updateRequestMutation.mutate({
                                  id: selectedRequest.id,
                                  status: selectedRequest.status,
                                  adminComment: adminComment.trim() || undefined,
                                });
                              }}
                              className="w-full sm:w-auto whitespace-nowrap"
                            >
                              حفظ التعليق
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Edit Mode Fields - Only for non-pending requests */}
                  {isEditMode && selectedRequest.status !== 'pending' && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-semibold text-foreground">تعديل حالة الطلب</h4>
                      <div className="space-y-2">
                        <Label htmlFor="editStatus">حالة الطلب</Label>
                        <Select
                          value={editFormData.status}
                          onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر حالة الطلب" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">معلق</SelectItem>
                            <SelectItem value="approved">تمت الموافقة</SelectItem>
                            <SelectItem value="rejected">مرفوض</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Admin Comment Field */}
                      <div className="space-y-2">
                        <Label htmlFor="adminComment">تعليق إداري</Label>
                        <Input
                          id="adminComment"
                          placeholder="أضف تعليقاً إدارياً (اختياري)"
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                    />
                  </div>
                    </div>
                  )}
                  {/* Action Buttons */}
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-0 sm:space-x-3 sm:space-x-reverse pt-4 border-t">
                    {isEditMode ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="w-full sm:w-auto"
                        >
                          إلغاء التعديل
                        </Button>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                          onClick={handleSaveEdit}
                          disabled={updateRequestMutation.isPending}
                        >
                          حفظ التعديلات
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="w-full sm:w-auto"
                        >
                          {selectedRequest.status === 'pending' ? 'إلغاء' : 'إغلاق'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleEditRequest}
                          className="w-full sm:w-auto"
                        >
                          <Edit className="h-4 w-4 ml-2" />
                          تعديل
                        </Button>
                        {selectedRequest.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full sm:w-auto"
                              onClick={() => {
                                handleUpdateRequest('rejected');
                                setIsDialogOpen(false);
                              }}
                              disabled={updateRequestMutation.isPending}
                            >
                              <X className="h-4 w-4 ml-2" />
                              رفض الطلب
                            </Button>
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                              onClick={() => {
                                handleUpdateRequest('approved');
                                setIsDialogOpen(false);
                              }}
                              disabled={updateRequestMutation.isPending}
                            >
                              <Check className="h-4 w-4 ml-2" />
                              موافقة
                            </Button>
                          </>
                        )}
                      </>
                    )}
                    </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
              </div>
    </PageWrapper>
  );
}
