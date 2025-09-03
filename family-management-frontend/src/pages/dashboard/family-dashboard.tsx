import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Clock, Bell, Edit, Plus, Printer, AlertTriangle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { getRequestStatusInArabic, getRequestTypeInArabic, getDamageDescriptionInArabic, getBranchInArabic, getSocialStatusInArabic, isChild, calculateDetailedAge } from "@/lib/utils";
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function FamilyDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
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

  
  // Fetch family data
  const { data: family, isLoading: familyLoading } = useQuery({
    queryKey: ["/api/family"],
  });

  // Fetch requests data
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/requests"],
  });

  // Fetch notifications data
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ["/api/notifications"],
  });

  const isLoading = authLoading || familyLoading || requestsLoading || notificationsLoading;

  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  const members = family?.members || [];
  
  const totalMembers = members.length;
  const maleCount = members.filter((m: any) => m.gender === 'male').length;
  const femaleCount = members.filter((m: any) => m.gender === 'female').length;

  const storedTotalMembers = family?.totalMembers || 0;
  const storedNumMales = family?.numMales || 0;
  const storedNumFemales = family?.numFemales || 0;

  const pendingRequests = requests?.filter((req: any) => req.status === 'pending') || [];
  const unreadNotifications = notifications?.slice(0, 3) || [];

  // Filter children (under 2 years old)
  const children = members.filter((member: any) => isChild(member.birthDate));

  // Filter recent requests
  const filteredRecentRequests = [...(requests || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3)
    .filter((request: any) => {
      const matchesSearch = request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.id.toString().includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      const matchesType = typeFilter === 'all' || request.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            مرحباً {family?.husbandName || user?.username}
          </h1>
          <p className="text-muted-foreground">
            {family ? `مرحباً بك في لوحة تحكم بيانات الأسرة` : "مرحباً بك في نظام إدارة البيانات العائلية"}
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">إجمالي أفراد الأسرة (محسوب)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalMembers}
                  </p>
                  <p className="text-xs text-muted-foreground">محفوظ: {storedTotalMembers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-secondary" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">الطلبات المقدمة</p>
                  <p className="text-2xl font-bold text-foreground">
                    {requests?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">طلبات معلقة</p>
                  <p className="text-2xl font-bold text-foreground">
                    {pendingRequests.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Bell className="h-6 w-6 text-accent" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">تنبيهات جديدة</p>
                  <p className="text-2xl font-bold text-foreground">
                    {notifications?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>الإجراءات السريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/dashboard/family">
                <Button variant="outline" className="w-full h-auto p-4 justify-start">
                  <Edit className="h-5 w-5 ml-3" />
                  <span>تحديث بيانات الأسرة</span>
                </Button>
              </Link>
              
              <Link href="/dashboard/members">
                <Button variant="outline" className="w-full h-auto p-4 justify-start">
                  <Users className="h-5 w-5 ml-3" />
                  <span>عرض أفراد الأسرة</span>
                </Button>
              </Link>
              
              <Link href="/dashboard/requests">
                <Button variant="outline" className="w-full h-auto p-4 justify-start">
                  <FileText className="h-5 w-5 ml-3" />
                  <span>إدارة الطلبات</span>
                </Button>
              </Link>

              <Link href="/dashboard/notifications">
                <Button variant="outline" className="w-full h-auto p-4 justify-start">
                  <Bell className="h-5 w-5 ml-3" />
                  <span>التنبيهات</span>
                </Button>
              </Link>
              
              <Link href="/dashboard/print-summary">
                <Button variant="outline" className="w-full h-auto p-4 justify-start">
                  <Printer className="h-5 w-5 ml-3" />
                  <span>طباعة بيانات الأسرة</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Branch and Damage Information */}
        {(family?.branch || family?.warDamage2024 || family?.socialStatus) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Branch Information */}
            {family?.branch && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    الفرع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    {getBranchInArabic(family.branch)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Damage Information */}
            {family?.warDamage2024 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    أضرار 2024
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    {family.warDamageDescription ? 
                      getDamageDescriptionInArabic(family.warDamageDescription) : 
                      "أضرار مسجلة"
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Social Status Information */}
            {family?.socialStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-green-500" />
                    الحالة الاجتماعية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    {getSocialStatusInArabic(family.socialStatus)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Requests */}
          <Card>
            <CardHeader>
              <CardTitle>آخر الطلبات</CardTitle>
              <CardDescription>آخر الطلبات المقدمة</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters above the recent requests */}
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
              <div className="space-y-4">
                {filteredRecentRequests.map((request: any) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-background rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">
                        {getRequestTypeInArabic(request.type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                      {request.adminComment && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg border-r-4 border-primary">
                          <p className="text-xs font-medium text-foreground">تعليق الإدارة:</p>
                          <p className="text-xs text-gray-700 mt-1">{request.adminComment}</p>
                        </div>
                      )}
                    </div>
                    <Badge variant={
                      request.status === 'pending' ? 'default' :
                      request.status === 'approved' ? 'success' : 'destructive'
                    } className={request.status === 'approved' ? 'bg-green-600 text-white' : request.status === 'rejected' ? 'bg-red-600 text-white' : ''}>
                      {getRequestStatusInArabic(request.status)}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">لا توجد طلبات</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>التنبيهات الأخيرة</CardTitle>
              <CardDescription>آخر التنبيهات والرسائل</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {unreadNotifications.map((notification: any) => (
                  <div key={notification.id} className="p-4 bg-blue-50 rounded-lg border-r-4 border-primary">
                    <p className="font-medium text-foreground">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                )) || (
                  <p className="text-muted-foreground text-center py-4">لا توجد تنبيهات</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        
          
        
      </div>
    </div>
  );
}

