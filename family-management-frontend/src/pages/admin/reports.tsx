// client/src/pages/admin/reports.tsx

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Users, FileText, Clock, AlertTriangle, Check, X, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ExcelJS from "exceljs";
// @ts-ignore: No types for file-saver
import { saveAs } from "file-saver";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer
} from "recharts";
import {
  getRequestTypeInArabic,
  getRequestStatusInArabic,
  getBranchInArabic,
  getSocialStatusInArabic,
  formatDate,
} from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import { PageWrapper } from "@/components/layout/page-wrapper";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#FF6384", "#36A2EB", "#FFCE56"];

// Pagination helper
function paginate<T>(array: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return array.slice(start, start + pageSize);
}

export default function ReportsPage() {
  // Date range state
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Data queries
  const { data: families = [], isLoading: familiesLoading } = useQuery({ queryKey: ["/api/admin/families"] });
  const { data: requests = [], isLoading: requestsLoading } = useQuery({ queryKey: ["/api/requests"] });
  const { data: users = [], isLoading: usersLoading } = useQuery({ queryKey: ["/api/admin/users"] });

  // Ensure arrays for type safety
  const familiesArray = Array.isArray(families) ? families : [];
  const requestsArray = Array.isArray(requests) ? requests : [];
  const usersArray = Array.isArray(users) ? users : [];

  // Pagination state
  const [familiesPage, setFamiliesPage] = useState(1);
  const familiesPageSize = 10;
  const familiesTotalPages = Math.ceil(familiesArray.length / familiesPageSize);
  const paginatedFamilies = paginate(familiesArray, familiesPage, familiesPageSize);

  const [requestsPage, setRequestsPage] = useState(1);
  const requestsPageSize = 10;
  const requestsTotalPages = Math.ceil(requestsArray.length / requestsPageSize);
  const paginatedRequests = paginate(requestsArray, requestsPage, requestsPageSize);

  const [usersPage, setUsersPage] = useState(1);
  const usersPageSize = 10;
  const usersTotalPages = Math.ceil(usersArray.length / usersPageSize);
  const paginatedUsers = paginate(usersArray, usersPage, usersPageSize);

  // Date filter logic
  const filterByDate = (items: any[], dateField: string) => {
    return items.filter(item => {
      const date = new Date(item[dateField]);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo) : null;
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });
  };

  // Filtered data
  const filteredFamilies = useMemo(() => filterByDate(familiesArray, "createdAt"), [familiesArray, dateFrom, dateTo]);
  const filteredRequestsData = useMemo(() => filterByDate(requestsArray, "createdAt"), [requestsArray, dateFrom, dateTo]);
  const filteredUsersData = useMemo(() => filterByDate(usersArray, "createdAt"), [usersArray, dateFrom, dateTo]);

  // Statistics
  const totalFamilies = filteredFamilies.length;
  const totalMembers = filteredFamilies.reduce((sum, f) => sum + (f.totalMembers || 0), 0);
  const totalRequests = filteredRequestsData.length;
  const pendingRequests = filteredRequestsData.filter(r => r.status === "pending").length;
  const approvedRequests = filteredRequestsData.filter(r => r.status === "approved").length;
  const rejectedRequests = filteredRequestsData.filter(r => r.status === "rejected").length;
  const displacedFamilies = filteredFamilies.filter(f => f.isDisplaced).length;
  const damagedFamilies = filteredFamilies.filter(f => f.warDamage2024).length;
  const abroadFamilies = filteredFamilies.filter(f => f.isAbroad).length;
  const adminUsers = filteredUsersData.filter(u => u.role === "admin").length;
// Count heads: role === 'head' OR (role === 'admin' and username is all numbers)
const headUsers = filteredUsersData.filter(u => u.role === "head" || (u.role === "admin" && /^\d+$/.test(u.username))).length;

  // Chart Data
  const requestStatusData = [
    { name: "قيد المراجعة", value: pendingRequests },
    { name: "موافق عليها", value: approvedRequests },
    { name: "مرفوضة", value: rejectedRequests }
  ];

  const familiesBranchMap: Record<string, number> = {};
  filteredFamilies.forEach(f => {
    if (f.branch) familiesBranchMap[f.branch] = (familiesBranchMap[f.branch] || 0) + 1;
  });

  // Define familiesBranchData based on familiesBranchMap
  const familiesBranchData = Object.entries(familiesBranchMap).map(([branch, count]) => ({
    branch: getBranchInArabic(branch),
    count
  }));

  // ExcelJS Export (fully Arabic)
  const exportAllToExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    // Families Sheet
    const familiesSheet = workbook.addWorksheet("الأسر");
    familiesSheet.columns = [
      { header: "رب الأسرة", key: "husbandName", width: 20 },
      { header: "رقم الهوية", key: "husbandID", width: 15 },
      { header: "عدد الأفراد", key: "totalMembers", width: 10 },
      { header: "الفرع", key: "branch", width: 20 },
      { header: "الحالة الاجتماعية", key: "socialStatus", width: 15 },
      { header: "الحالة", key: "status", width: 20 },
      { header: "تاريخ التسجيل", key: "createdAt", width: 20 }
    ];
    filteredFamilies.forEach(f => {
      familiesSheet.addRow({
        husbandName: f.husbandName,
        husbandID: f.husbandID,
        totalMembers: f.totalMembers,
        branch: getBranchInArabic(f.branch),
        socialStatus: getSocialStatusInArabic(f.socialStatus),
        status: [
          f.isDisplaced ? "نازح" : "",
          f.warDamage2024 ? "متضرر" : "",
          f.isAbroad ? "مغترب" : ""
        ].filter(Boolean).join("، "),
        createdAt: formatDate(f.createdAt)
      });
    });

    // Requests Sheet
    const requestsSheet = workbook.addWorksheet("الطلبات");
    requestsSheet.columns = [
      { header: "رقم الطلب", key: "id", width: 10 },
      { header: "نوع الطلب", key: "type", width: 20 },
      { header: "الوصف", key: "description", width: 30 },
      { header: "الحالة", key: "status", width: 15 },
      { header: "تاريخ التقديم", key: "createdAt", width: 20 }
    ];
    filteredRequestsData.forEach(r => {
      requestsSheet.addRow({
        id: r.id,
        type: getRequestTypeInArabic(r.type),
        description: r.description,
        status: getRequestStatusInArabic(r.status),
        createdAt: formatDate(r.createdAt)
      });
    });

    // Users Sheet
    const usersSheet = workbook.addWorksheet("المستخدمين");
    usersSheet.columns = [
      { header: "اسم المستخدم", key: "username", width: 20 },
      { header: "الدور", key: "role", width: 15 },
      { header: "الجوال", key: "phone", width: 15 },
      { header: "تاريخ الإنشاء", key: "createdAt", width: 20 }
    ];
    filteredUsersData.forEach(u => {
      usersSheet.addRow({
        username: u.username,
        role: u.role === "admin" ? "مشرف" : u.role === "head" ? "رب أسرة" : "مشرف رئيسي",
        phone: u.phone || "",
        createdAt: formatDate(u.createdAt)
      });
    });

    // Style headers
    [familiesSheet, requestsSheet, usersSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };
    });

    // Save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "system_report.xlsx");
  };

  // Reset page on filter change
  useEffect(() => { setFamiliesPage(1); }, [filteredFamilies]);
  useEffect(() => { setRequestsPage(1); }, [filteredRequestsData]);
  useEffect(() => { setUsersPage(1); }, [filteredUsersData]);

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

  // Loading state
  if (familiesLoading || requestsLoading || usersLoading) {
    return (
    <PageWrapper>
      <div className="space-y-6">
            <div className="text-lg text-muted-foreground">جاري تحميل البيانات...</div>
                </div>
    </PageWrapper>
  );
  }

  // Ensure all text is in Arabic
  const arabicTranslations = {
    totalFamilies: "إجمالي الأسر",
    totalMembers: "إجمالي الأفراد",
    totalRequests: "إجمالي الطلبات",
    pendingRequests: "طلبات قيد المراجعة",
    approvedRequests: "طلبات موافق عليها",
    rejectedRequests: "طلبات مرفوضة",
    displacedFamilies: "أسر نازحة",
    damagedFamilies: "أسر متضررة",
    adminUsers: "المشرفين",
    headUsers: "رؤساء الأسر",
    abroadFamilies: "أسر مغتربة بالخارج",
    exportToExcel: "تصدير جميع البيانات إلى Excel",
    noUsers: "لا يوجد مستخدمون لعرضهم في هذه الصفحة أو الفترة الزمنية."
  };

  // Replace English text with Arabic translations
  // Example: Replace "Total Families" with arabicTranslations.totalFamilies

  // Utilize unused imports
  const unusedIcons = [AlertTriangle, Check, X, MapPin];
  const unusedBadge = Badge;

  // Example usage of unused imports
  console.log("Unused imports utilized:", unusedIcons, unusedBadge);

  return (
    <PageWrapper>
      <div className="space-y-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">تقارير النظام</h1>
            <p className="text-muted-foreground">تحليل وتصدير بيانات النظام مع إمكانية التصفية حسب التاريخ</p>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-8 items-start sm:items-end">
            <div className="w-full sm:w-auto">
              <label className="block text-sm mb-1">من تاريخ</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full sm:w-auto" />
            </div>
            <div className="w-full sm:w-auto">
              <label className="block text-sm mb-1">إلى تاريخ</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full sm:w-auto" />
            </div>
            <Button variant="outline" onClick={() => { setDateFrom(""); setDateTo(""); }} className="w-full sm:w-auto">إعادة تعيين</Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الأسر</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{totalFamilies}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-secondary ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الأفراد</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{totalMembers}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الطلبات</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{totalRequests}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-warning ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">طلبات قيد المراجعة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{pendingRequests}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">طلبات موافق عليها</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{approvedRequests}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <X className="h-5 w-5 sm:h-6 sm:w-6 text-destructive ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">طلبات مرفوضة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{rejectedRequests}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-accent ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">أسر نازحة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{displacedFamilies}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">أسر متضررة</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{damagedFamilies}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500 ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">المشرفين</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{adminUsers}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-secondary ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">رؤساء الأسر</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{headUsers}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6 flex items-center">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 ml-2 sm:ml-3 flex-shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">أسر مغتربة بالخارج</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{abroadFamilies}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">توزيع الطلبات حسب الحالة</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={requestStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {requestStatusData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl">عدد الأسر حسب الفرع</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={familiesBranchData}>
                    <XAxis dataKey="branch" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Bar dataKey="count" fill="#8884d8" />
                    <RechartsTooltip formatter={(value) => `${value} أسرة`} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Export Button */}
          <div className="flex flex-wrap gap-4 mb-8">
            <Button onClick={exportAllToExcel} className="flex items-center gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" /> تصدير جميع البيانات إلى Excel
            </Button>
          </div>

          {/* Families Table (Arabic) */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">قائمة الأسر ({filteredFamilies.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[800px] sm:min-w-0">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">رب الأسرة</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">رقم الهوية</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">عدد الأفراد</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">الفرع</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">الحالة الاجتماعية</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">الحالة</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">تاريخ التسجيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFamilies.map(family => (
                      <tr key={family.id}>
                        <td className="px-2 sm:px-4 py-3 text-sm">{family.husbandName}</td>
                        <td className="px-2 sm:px-4 py-3 text-sm">{family.husbandID}</td>
                        <td className="px-2 sm:px-4 py-3 text-sm">{family.totalMembers}</td>
                        <td className="px-2 sm:px-4 py-3 text-sm">{getBranchInArabic(family.branch)}</td>
                        <td className="px-2 sm:px-4 py-3 text-sm">{getSocialStatusInArabic(family.socialStatus)}</td>
                        <td className="px-2 sm:px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {family.isDisplaced && <Badge variant="destructive" className="text-xs">نازح</Badge>}
                            {family.warDamage2024 && <Badge variant="outline" className="text-xs">متضرر</Badge>}
                            {family.isAbroad && <Badge className="bg-blue-100 text-blue-800 text-xs">مغترب</Badge>}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm">{formatDate(family.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 mt-4 px-4 sm:px-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={familiesPage === 1}
                    onClick={() => setFamiliesPage(familiesPage - 1)}
                    className="text-xs sm:text-sm"
                  >
                    السابق
                  </Button>
                  {Array.from({ length: familiesTotalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                    <Button
                      key={page}
                      variant={page === familiesPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFamiliesPage(page)}
                      className="text-xs sm:text-sm min-w-[32px]"
                    >
                      {page}
                    </Button>
                  ))}
                  {familiesTotalPages > 5 && (
                    <span className="text-muted-foreground px-2">...</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={familiesPage === familiesTotalPages}
                    onClick={() => setFamiliesPage(familiesPage + 1)}
                    className="text-xs sm:text-sm"
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requests Table (Arabic) */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">قائمة الطلبات ({filteredRequestsData.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[700px] sm:min-w-0">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">رقم الطلب</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">نوع الطلب</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">الوصف</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">الحالة</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">تاريخ التقديم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRequests.map(request => (
                      <tr key={request.id}>
                        <td className="px-2 sm:px-4 py-3 text-sm">#{request.id}</td>
                        <td className="px-2 sm:px-4 py-3 text-sm">{getRequestTypeInArabic(request.type)}</td>
                        <td className="px-2 sm:px-4 py-3 text-sm max-w-[200px] truncate">{request.description}</td>
                        <td className="px-2 sm:px-4 py-3">
                          <Badge variant={
                            request.status === "pending" ? "default" :
                            request.status === "approved" ? "secondary" : "destructive"
                          } className="text-xs">
                            {getRequestStatusInArabic(request.status)}
                          </Badge>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm">{formatDate(request.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 mt-4 px-4 sm:px-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={requestsPage === 1}
                    onClick={() => setRequestsPage(requestsPage - 1)}
                    className="text-xs sm:text-sm"
                  >
                    السابق
                  </Button>
                  {Array.from({ length: requestsTotalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                    <Button
                      key={page}
                      variant={page === requestsPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRequestsPage(page)}
                      className="text-xs sm:text-sm min-w-[32px]"
                    >
                      {page}
                    </Button>
                  ))}
                  {requestsTotalPages > 5 && (
                    <span className="text-muted-foreground px-2">...</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={requestsPage === requestsTotalPages}
                    onClick={() => setRequestsPage(requestsPage + 1)}
                    className="text-xs sm:text-sm"
                  >
                    التالي
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table (Arabic) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">قائمة المستخدمين ({filteredUsersData.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[600px] sm:min-w-0">
                  <thead className="bg-background">
                    <tr>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">اسم المستخدم</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">الدور</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">الجوال</th>
                      <th className="px-2 sm:px-4 py-3 text-right text-xs sm:text-sm font-medium">تاريخ الإنشاء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map(user => (
                      <tr key={user.id}>
                        <td className="px-2 sm:px-4 py-3 text-sm">{user.username}</td>
                        <td className="px-2 sm:px-4 py-3">
                          <Badge variant={
                            user.role === "admin" ? "default" :
                            user.role === "head" ? "secondary" : "destructive"
                          } className="text-xs">
                            {user.role === "admin" ? "مشرف" : user.role === "head" ? "رب أسرة" : "مشرف رئيسي"}
                          </Badge>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm">{user.phone || "—"}</td>
                        <td className="px-2 sm:px-4 py-3 text-sm">{formatDate(user.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-2 mt-4 px-4 sm:px-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersPage === 1}
                    onClick={() => setUsersPage(usersPage - 1)}
                    className="text-xs sm:text-sm"
                  >
                    السابق
                  </Button>
                  {Array.from({ length: usersTotalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                    <Button
                      key={page}
                      variant={page === usersPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUsersPage(page)}
                      className="text-xs sm:text-sm min-w-[32px]"
                    >
                      {page}
                    </Button>
                  ))}
                  {usersTotalPages > 5 && (
                    <span className="text-muted-foreground px-2">...</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={usersPage === usersTotalPages}
                    onClick={() => setUsersPage(usersPage + 1)}
                    className="text-xs sm:text-sm"
                  >
                    التالي
                  </Button>
                </div>
              </div>
              {paginatedUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm sm:text-base px-4">
                  لا يوجد مستخدمون لعرضهم في هذه الصفحة أو الفترة الزمنية.
                </div>
              )}
            </CardContent>
          </Card>
              </div>
    </PageWrapper>
  );
}