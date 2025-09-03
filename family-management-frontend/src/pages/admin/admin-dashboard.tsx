import { useAuth } from "@/hooks/use-auth";
import { fetchApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Users, FileText, Clock, AlertTriangle, Bell, Eye, Check, X, Edit } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getRequestStatusInArabic, getRequestTypeInArabic, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { Separator } from "@radix-ui/react-select";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [adminComment, setAdminComment] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    status: "pending"
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
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

  const { data: families, isLoading: familiesLoading } = useQuery({
    queryKey: ["/api/admin/families"],
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/requests"],
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  // Mutations for request actions
  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status, adminComment }: { id: number; status: string; adminComment?: string }) => {
      const res = await fetchApi(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminComment }),
      });
      if (!res.ok) throw new Error('Failed to update request');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      toast({
        title: "تم تحديث الطلب بنجاح",
        description: "تم تحديث حالة الطلب",
      });
    },
    onError: () => {
      toast({
        title: "خطأ في تحديث الطلب",
        description: "حدث خطأ أثناء تحديث حالة الطلب",
        variant: "destructive",
      });
    },
  });

  const handleViewRequest = (request: any) => {
    let reqWithFamily = request;
    if (!request.family && families) {
      const foundFamily = families.find((f: any) => f.id === request.familyId);
      if (foundFamily) {
        reqWithFamily = { ...request, family: foundFamily };
      }
    }
    setSelectedRequest(reqWithFamily);
    setShowRequestModal(true);
    setIsEditMode(false);
    setAdminComment("");
    setEditFormData({
      status: request.status || "pending"
    });
  };

  const handleApproveRequest = (requestId: number) => {
    updateRequestMutation.mutate({ id: requestId, status: 'approved', adminComment });
    setAdminComment(""); // Reset comment after action
  };

  const handleRejectRequest = (requestId: number) => {
    updateRequestMutation.mutate({ id: requestId, status: 'rejected', adminComment });
    setAdminComment(""); // Reset comment after action
  };

  const handleEditRequest = () => {
    setIsEditMode(true);
  };

  const handleSaveEdit = () => {
    updateRequestMutation.mutate({ 
      id: selectedRequest.id, 
      status: editFormData.status,
      adminComment
    });
    setIsEditMode(false);
    setAdminComment(""); // Reset comment after saving
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditFormData({
      status: selectedRequest.status || "pending"
    });
  };

  if (familiesLoading || requestsLoading || notificationsLoading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">جاري تحميل البيانات...</div>
        </div>
      </PageWrapper>
    );
  }

  const totalFamilies = families?.length || 0;
  const totalMembers = families?.reduce((sum: number, family: any) => sum + (family.totalMembers || 0), 0) || 0;
  const pendingRequests = requests?.filter((req: any) => req.status === 'pending') || [];
  const damagedFamilies = families?.filter((family: any) => family.warDamage2024) || [];
  const displacedFamilies = families?.filter((family: any) => family.isDisplaced) || [];
  const abroadFamilies = families?.filter((family: any) => family.isAbroad) || [];
  const approvedRequests = requests?.filter((req: any) => req.status === 'approved') || [];

  // Get recent requests (last 5)
  const recentRequests = requests?.slice(0, 5) || [];

  // Filter recent requests
  const filteredRecentRequests = recentRequests.filter((request: any) => {
    const matchesSearch = request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.id.toString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <PageWrapper>
      <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              مرحباً {user?.username}
            </h1>
            <p className="text-muted-foreground">لوحة تحكم الإدارة - نظرة عامة على النظام</p>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">إجمالي الأسر</p>
                    <p className="text-2xl font-bold text-foreground">{totalFamilies}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-secondary/10 rounded-lg">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">إجمالي الأفراد</p>
                    <p className="text-2xl font-bold text-foreground">{totalMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-warning/10 rounded-lg">
                    <Clock className="h-6 w-6 text-warning" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">الطلبات المعلقة</p>
                    <p className="text-2xl font-bold text-foreground">{pendingRequests.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-accent" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">أسر متضررة 2024</p>
                    <p className="text-2xl font-bold text-foreground">{damagedFamilies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions and Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>الإجراءات السريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/admin/notifications">
                    <Button variant="outline" className="w-full justify-start">
                      <Bell className="h-4 w-4 ml-3" />
                      إرسال تنبيه جديد
                    </Button>
                  </Link>
                  
                  <Separator > </Separator>
                  
                  <Link href="/admin/requests">
                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="h-4 w-4 ml-3" />
                      مراجعة الطلبات المعلقة
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إحصائيات سريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">الأسر النازحة</span>
                    <span className="font-semibold text-foreground">{displacedFamilies.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">المغتربون</span>
                    <span className="font-semibold text-foreground">{abroadFamilies.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">طلبات هذا الأسبوع</span>
                    <span className="font-semibold text-foreground">{requests?.filter((req: any) => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(req.createdAt) > weekAgo;
                    }).length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">طلبات تمت الموافقة عليها</span>
                    <span className="font-semibold text-secondary">{approvedRequests.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Requests Table */}
          <Card>
            <CardHeader>
              <CardTitle>آخر الطلبات المقدمة</CardTitle>
            </CardHeader>
            <CardContent>
              {recentRequests.length > 0 ? (
                <div className="overflow-x-auto">
                  {/* Filters above the table */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="بحث برقم الطلب أو الوصف..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="border rounded px-2 py-1 text-sm"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32"><SelectValue>{statusFilter === 'all' ? 'كل الحالات' : getRequestStatusInArabic(statusFilter)}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="pending">{getRequestStatusInArabic('pending')}</SelectItem>
                        <SelectItem value="approved">{getRequestStatusInArabic('approved')}</SelectItem>
                        <SelectItem value="rejected">{getRequestStatusInArabic('rejected')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-32"><SelectValue>{typeFilter === 'all' ? 'كل الأنواع' : getRequestTypeInArabic(typeFilter)}</SelectValue></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الأنواع</SelectItem>
                        <SelectItem value="financial">مساعدة مالية</SelectItem>
                        <SelectItem value="medical">مساعدة طبية</SelectItem>
                        <SelectItem value="damage">تقرير أضرار</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <table className="w-full">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رقم الطلب</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">نوع الطلب</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">التاريخ</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الحالة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {filteredRecentRequests.map((request: any) => (
                        <tr key={request.id} className="hover:bg-muted">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">#{request.id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {getRequestTypeInArabic(request.type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(request.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={
                              request.status === 'pending' ? 'default' :
                              request.status === 'approved' ? 'secondary' : 'destructive'
                            }>
                              {getRequestStatusInArabic(request.status)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2 space-x-reverse">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewRequest(request)}
                                disabled={updateRequestMutation.isPending}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {request.status === 'pending' && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-secondary"
                                    onClick={() => handleApproveRequest(request.id)}
                                    disabled={updateRequestMutation.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-destructive"
                                    onClick={() => handleRejectRequest(request.id)}
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
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد طلبات</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Details Modal */}
          <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-center">تفاصيل الطلب #{selectedRequest?.id}</DialogTitle>
                <DialogDescription className="text-center">
                  عرض تفاصيل الطلب مع إمكانية الموافقة أو الرفض
                </DialogDescription>
              </DialogHeader>
              
              {selectedRequest && (
                <div className="space-y-6">
                  {/* Request Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">معلومات الطلب</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">نوع الطلب:</span>
                          <span className="font-medium text-foreground">{getRequestTypeInArabic(selectedRequest.type)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الحالة:</span>
                          <Badge variant={
                            selectedRequest.status === 'pending' ? 'default' :
                            selectedRequest.status === 'approved' ? 'default' : 'destructive'
                          }>
                            {getRequestStatusInArabic(selectedRequest.status)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">تاريخ التقديم:</span>
                          <span className="font-medium text-foreground">{formatDate(selectedRequest.createdAt)}</span>
                        </div>
                        {selectedRequest.updatedAt && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">آخر تحديث:</span>
                            <span className="font-medium text-foreground">{formatDate(selectedRequest.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">معلومات مقدم الطلب</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">اسم رب الأسرة:</span>
                          <span className="font-medium text-right">{selectedRequest.family?.husbandName || 'غير محدد'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رقم الهوية:</span>
                          <span className="font-medium">{selectedRequest.family?.husbandID || 'غير محدد'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">رقم الجوال:</span>
                          <span className="font-medium">{selectedRequest.family?.primaryPhone || 'غير محدد'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">الوصف:</span>
                          <span className="font-medium text-right">{selectedRequest.description || 'غير محدد'}</span>
                        </div>
                        {selectedRequest.adminComment && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">التعليق الإداري:</span>
                            <span className="font-medium text-right text-blue-600">{selectedRequest.adminComment}</span>
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
                  <div className="flex justify-end space-x-3 space-x-reverse pt-4 border-t">
                    {isEditMode ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                        >
                          إلغاء التعديل
                        </Button>
                        <Button
                          className="bg-blue-600 hover:bg-blue-700 text-white"
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
                          onClick={() => setShowRequestModal(false)}
                        >
                          {selectedRequest.status === 'pending' ? 'إلغاء' : 'إغلاق'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={handleEditRequest}
                        >
                          <Edit className="h-4 w-4 ml-2" />
                          تعديل
                        </Button>
                        
                        {selectedRequest.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => {
                                handleRejectRequest(selectedRequest.id);
                                setShowRequestModal(false);
                              }}
                              disabled={updateRequestMutation.isPending}
                            >
                              <X className="h-4 w-4 ml-2" />
                              رفض الطلب
                            </Button>
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                handleApproveRequest(selectedRequest.id);
                                setShowRequestModal(false);
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
