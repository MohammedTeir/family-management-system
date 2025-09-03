import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Search, Eye, Printer, Phone, MapPin, FileSpreadsheet, Edit2, Trash2, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDate } from "@/lib/utils";
import { getRelationshipInArabic, getGenderInArabic, calculateDetailedAge, getRequestTypeInArabic, getRequestStatusInArabic, getSocialStatusInArabic, isChild, getBranchInArabic, getDamageDescriptionInArabic } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExcelJS from 'exceljs';
import { useSettings } from "@/hooks/use-settings";
import { PageWrapper } from "@/components/layout/page-wrapper";

export default function AdminFamilies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [branchFilter, setBranchFilter] = useState('all');
  const [displacedFilter, setDisplacedFilter] = useState('all');
  const [damagedFilter, setDamagedFilter] = useState('all');
  const [abroadFilter, setAbroadFilter] = useState('all');
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

  // Helper to get age
  const getAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Helper to get housing status for export
  const getHousingStatus = (family: any) => {
    if (family.isAbroad) {
      return family.abroadLocation || 'مغترب بالخارج';
    } else if (family.isDisplaced) {
      return 'نازح';
    } else {
      return 'مقيم';
    }
  };

  // Families data fetching
  const { data: families, isLoading } = useQuery({
    queryKey: ["/api/admin/families"],
  });

  const { data: familyDetails, isLoading: familyDetailsLoading, error: familyDetailsError } = useQuery({
    queryKey: ["/api/admin/families", selectedFamily?.id],
    enabled: !!selectedFamily?.id,
    queryFn: async () => {
      const res = await fetchApi(`/api/admin/families/${selectedFamily.id}`);
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    }
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: async (familyId: number) => {
      const res = await fetchApi(`/api/admin/families/${familyId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في حذف الأسرة");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم حذف الأسرة", description: "تم حذف الأسرة بنجاح" });
      // Refetch families
      window.location.reload(); // or use queryClient.invalidateQueries if available
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
    },
  });

  // Extract unique branches
  const branchOptions = Array.from(new Set((families || []).map((f: any) => f.branch).filter(Boolean)));

  // Filtering logic
  const filteredFamilies: any[] = Array.isArray(families) ? families.filter((family: any) => {
    const matchesSearch =
      family.husbandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      family.husbandID.includes(searchTerm) ||
      getBranchInArabic(family.branch)?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = branchFilter === 'all' || getBranchInArabic(family.branch) === branchFilter;
    const matchesDisplaced = displacedFilter === 'all' || (displacedFilter === 'yes' ? family.isDisplaced : !family.isDisplaced);
    const matchesDamaged = damagedFilter === 'all' || (damagedFilter === 'yes' ? family.warDamage2024 : !family.warDamage2024);
    const matchesAbroad = abroadFilter === 'all' || (abroadFilter === 'yes' ? family.isAbroad : !family.isAbroad);
    return matchesSearch && matchesBranch && matchesDisplaced && matchesDamaged && matchesAbroad;
  }) : [];

  // Dynamically count sons and children from filtered data
  const safeFamilies: any[] = Array.isArray(filteredFamilies) ? filteredFamilies : [];
  let maxSons = 0;
  let maxChildren = 0;
  if (Array.isArray(safeFamilies) && safeFamilies.length > 0) {
    maxSons = Math.max(0, ...safeFamilies.map(f => (Array.isArray(f.members) ? f.members.filter((m: any) => !isChild(m.birthDate)).length : 0)));
    maxChildren = Math.max(0, ...safeFamilies.map(f => (Array.isArray(f.members) ? f.members.filter((m: any) => isChild(m.birthDate)).length : 0)));
  }

  // Build columns in the exact order provided, only add sons/children columns if there are any
  const orderedColumns = [
    { key: 'husbandName', label: 'اسم الزوج رباعي', checked: true },
    { key: 'husbandID', label: 'رقم هوية الزوج', checked: true },
    { key: 'husbandJob', label: 'عمل الزوج', checked: true },
    { key: 'husbandBirthDate', label: 'تاريخ ميلاد الزوج', checked: true },
    { key: 'husbandAge', label: 'عمر الزوج', checked: true },
    { key: 'wifeName', label: 'اسم الزوجة رباعي', checked: true },
    { key: 'wifeID', label: 'رقم هوية الزوجة', checked: true },
    { key: 'wifeJob', label: 'عمل الزوجة', checked: true },
    { key: 'wifeBirthDate', label: 'تاريخ ميلاد الزوجة', checked: true },
    { key: 'wifeAge', label: 'عمر الزوجة', checked: true },
    { key: 'primaryPhone', label: 'رقم الجوال للتواصل', checked: true },
    { key: 'secondaryPhone', label: 'رقم الجوال البديل', checked: true },
    { key: 'originalResidence', label: 'السكن الأصلي', checked: true },
    { key: 'currentHousing', label: 'حالة السكن الحالي', checked: true },
    { key: 'displacedLocation', label: 'اقرب معلم لك في حال كنت نازح حاليا', checked: true },
    { key: 'warDamageDescription', label: 'الاضرار الناجمة عن حرب 2024', checked: true },
    { key: 'branch', label: 'الفرع', checked: true },
    { key: 'totalMembers', label: 'عدد افراد الأسرة مع الأب والأم', checked: true },
    { key: 'hasDisabledMembers', label: 'هل يوجد افراد ذوي اعاقة في العائلة', checked: true },
    { key: 'disabilityTypes', label: 'اذا كان يوجد أشخاص ذوي اعاقة اذكر نوع الإعاقة', checked: true },
    { key: 'hasChildrenUnderTwo', label: 'هل لديك ابناء اقل من سنتين', checked: true },
    // Sons columns (dynamic, only if maxSons > 0)
    ...(maxSons > 0 ? Array.from({length: maxSons}).flatMap((_, i) => [
      { key: `sonName${i+1}`, label: `اسم الابن ${i+1}`, checked: true },
      { key: `sonID${i+1}`, label: `رقم هوية الابن ${i+1}`, checked: true },
      { key: `sonBirthDate${i+1}`, label: `تاريخ الميلاد`, checked: true },
    ]) : []),
    // Children columns (dynamic, only if maxChildren > 0)
    ...(maxChildren > 0 ? Array.from({length: maxChildren}).flatMap((_, i) => [
      { key: `childName${i+1}`, label: `اسم الطفل رباعي ${i+1}`, checked: true },
      { key: `childID${i+1}`, label: `رقم هوية الطفل ${i+1}`, checked: true },
      { key: `childBirthDate${i+1}`, label: `تاريخ الميلاد`, checked: true },
    ]) : []),
    { key: 'hasChildrenAboveTwo', label: 'هل لديك ابناء أكبر من سنتين', checked: true },
    { key: 'wifePregnant', label: 'هل الزوجة حامل', checked: true },
    { key: 'numMales', label: 'عدد الافراد الذكور', checked: true },
    { key: 'numFemales', label: 'عدد الافراد الاناث', checked: true },
    { key: 'socialStatus', label: 'الحالة الاجتماعية لرب الاسرة', checked: true },
    { key: 'abroadLocation', label: 'اسم الدولة إذا كنت مغترب خارج البلاد', checked: true },
    { key: 'adminNotes', label: 'ملاحظات إدارية', checked: true },
  ];

  const excelColumns = useMemo(() => orderedColumns, [maxSons, maxChildren]);

  const [checkedColumns, setCheckedColumns] = useState<{ [key: string]: boolean }>({});

  // Sync checkedColumns with available columns
  useEffect(() => {
    setCheckedColumns(prev => {
      const next: { [key: string]: boolean } = {};
      for (const col of excelColumns) {
        next[col.key] = prev[col.key] !== undefined ? prev[col.key] : true;
      }
      return next;
    });
  }, [excelColumns]);

  // Checkbox toggle handler
  const handleExcelColumnChange = (key: string) => {
    setCheckedColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Group toggles
  const handleGroupToggle = (group: "sons" | "children") => {
    setCheckedColumns(prev => {
      const next = { ...prev };
      const groupCols = excelColumns.filter(col =>
        group === "sons" ? col.key.startsWith("son") : col.key.startsWith("child")
      );
      const allChecked = groupCols.every(col => prev[col.key]);
      for (const col of groupCols) {
        next[col.key] = !allChecked;
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setCheckedColumns(Object.fromEntries(excelColumns.map(col => [col.key, true])));
  };

  const handleDeselectAll = () => {
    setCheckedColumns(Object.fromEntries(excelColumns.map(col => [col.key, false])));
  };

  // For UI
  const sonCols = excelColumns.filter(col => col.key.startsWith('son'));
  const childCols = excelColumns.filter(col => col.key.startsWith('child'));
  const isSonsChecked = sonCols.length > 0 && sonCols.every(col => checkedColumns[col.key]);
  const isChildrenChecked = childCols.length > 0 && childCols.every(col => checkedColumns[col.key]);

  // For export
  const selectedCols = excelColumns.filter(col => checkedColumns[col.key]);

  // Excel export handler (RTL, mapped to user headers)
  const handleExportExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('قائمة الأسر', {views: [{rightToLeft: true}] });
      // Styles
      const titleStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } },
        font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 16 },
        alignment: { horizontal: 'center', vertical: 'middle' }
      };
      const headerStyle: Partial<ExcelJS.Style> = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } },
        font: { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 },
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { top: { style: 'thin' as ExcelJS.BorderStyle }, bottom: { style: 'thin' as ExcelJS.BorderStyle }, left: { style: 'thin' as ExcelJS.BorderStyle }, right: { style: 'thin' as ExcelJS.BorderStyle } }
      };
      // For style alignment, use correct ExcelJS alignment type
      const dataStyle: Partial<ExcelJS.Style> = {
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
        border: { top: { style: 'thin' as ExcelJS.BorderStyle }, bottom: { style: 'thin' as ExcelJS.BorderStyle }, left: { style: 'thin' as ExcelJS.BorderStyle }, right: { style: 'thin' as ExcelJS.BorderStyle } }
      };
      // RTL: reverse columns for visual order
      // Add title row above header row, merge all cells, and center
      // Create a title row with the same number of cells as the header row
      const titleCells = Array(selectedCols.length).fill('');
      titleCells[0] = 'قائمة الأسر (تصدير)';
      const titleRow = sheet.addRow(titleCells);
      titleRow.height = 30;
      // Merge all cells in the title row (A1 to last column)
      const lastColLetter = sheet.getColumn(selectedCols.length).letter;
      sheet.mergeCells(`A1:${lastColLetter}1`);
      titleRow.getCell(1).style = titleStyle;
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      // Header row
      const headerRow = sheet.addRow(selectedCols.map(c => c.label));
      headerRow.height = 25;
      headerRow.eachCell(cell => { cell.style = headerStyle; });
      // Data rows
      (Array.isArray(filteredFamilies) ? filteredFamilies : []).forEach(family => {
        const members: any[] = Array.isArray(family?.members) ? family.members : [];
        // Debug: log members, sons, and children to console
        console.log('Exporting family:', {
          id: family.id,
          husbandName: family.husbandName,
          members,
          sons: members.filter((m: any) => !isChild(m.birthDate)).map((s: any) => ({ fullName: s.fullName, birthDate: s.birthDate })),
          children: members.filter((m: any) => isChild(m.birthDate)).map((c: any) => ({ fullName: c.fullName, birthDate: c.birthDate })),
        });
        // Use isChild for children, !isChild for sons (age-based only)
        const children: any[] = Array.isArray(members) ? members.filter((member: any) => isChild(member.birthDate)) : [];
        const sons: any[] = Array.isArray(members) ? members.filter((member: any) => !isChild(member.birthDate)) : [];
        const sonsData: (any|null)[] = Array.isArray(sons) ? Array.from({length: maxSons}).map((_, i) => sons[i] || null) : [];
        const childrenData: (any|null)[] = Array.isArray(children) ? Array.from({length: maxChildren}).map((_, i) => children[i] || null) : [];
        const disabledMembers: any[] = Array.isArray(members) ? members.filter((m: any) => m.isDisabled) : [];
        const disabilityTypes = Array.isArray(disabledMembers) ? disabledMembers.map((m: any) => m.disabilityType || '').filter(Boolean).join(', ') : '';
        const rowData = Array.isArray(selectedCols) ? selectedCols.map(col => {
          // Dynamic sons/children export
          // Sons: sonNameX, sonIDX, sonBirthDateX
          const sonNameMatch = typeof col.key === 'string' ? col.key.match(/^sonName(\d+)$/) : null;
          const sonIDMatch = typeof col.key === 'string' ? col.key.match(/^sonID(\d+)$/) : null;
          const sonBirthDateMatch = typeof col.key === 'string' ? col.key.match(/^sonBirthDate(\d+)$/) : null;
          if (sonNameMatch) {
            const idx = parseInt(sonNameMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? sons[idx].fullName || '' : '';
          }
          if (sonIDMatch) {
            const idx = parseInt(sonIDMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? sons[idx].memberID || '' : '';
          }
          if (sonBirthDateMatch) {
            const idx = parseInt(sonBirthDateMatch[1], 10) - 1;
            return Array.isArray(sons) && sons[idx] ? sons[idx].birthDate || '' : '';
          }
          // Children: childNameX, childIDX, childBirthDateX
          const childNameMatch = typeof col.key === 'string' ? col.key.match(/^childName(\d+)$/) : null;
          const childIDMatch = typeof col.key === 'string' ? col.key.match(/^childID(\d+)$/) : null;
          const childBirthDateMatch = typeof col.key === 'string' ? col.key.match(/^childBirthDate(\d+)$/) : null;
          if (childNameMatch) {
            const idx = parseInt(childNameMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? children[idx].fullName || '' : '';
          }
          if (childIDMatch) {
            const idx = parseInt(childIDMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? children[idx].memberID || '' : '';
          }
          if (childBirthDateMatch) {
            const idx = parseInt(childBirthDateMatch[1], 10) - 1;
            return Array.isArray(children) && children[idx] ? children[idx].birthDate || '' : '';
          }
          // Static columns
          switch (col.key) {
            case 'husbandName': return family.husbandName || '';
            case 'husbandID': return family.husbandID || '';
            case 'husbandJob': return family.husbandJob || '';
            case 'husbandBirthDate': return family.husbandBirthDate || '';
            case 'husbandAge': return family.husbandBirthDate ? getAge(family.husbandBirthDate) : '';
            case 'wifeName': return family.wifeName || '';
            case 'wifeID': return family.wifeID || '';
            case 'wifeJob': return family.wifeJob || '';
            case 'wifeBirthDate': return family.wifeBirthDate || '';
            case 'wifeAge': return family.wifeBirthDate ? getAge(family.wifeBirthDate) : '';
            case 'primaryPhone': return family.primaryPhone || '';
            case 'secondaryPhone': return family.secondaryPhone || '';
            case 'originalResidence': return family.originalResidence || '';
            case 'currentHousing': return getHousingStatus(family);
            case 'displacedLocation': return family.displacedLocation || '';
            case 'warDamageDescription': return getDamageDescriptionInArabic(family.warDamageDescription) || '';
            case 'branch': return getBranchInArabic(family.branch) || '';
            case 'totalMembers': return family.totalMembers || '';
            case 'hasDisabledMembers': return Array.isArray(disabledMembers) && disabledMembers.length > 0 ? 'نعم' : 'لا';
            case 'disabilityTypes': return disabilityTypes;
            case 'hasChildrenUnderTwo': return Array.isArray(children) && children.length > 0 ? 'نعم' : 'لا';
            case 'hasChildrenAboveTwo': return Array.isArray(sons) && sons.length > 0 ? 'نعم' : 'لا';
            case 'wifePregnant': return family.wifePregnant ? 'نعم' : 'لا';
            case 'numMales': return family.numMales || '';
            case 'numFemales': return family.numFemales || '';
            case 'socialStatus': return family.socialStatus ? getSocialStatusInArabic(family.socialStatus) : '';
            case 'abroadLocation': return family.abroadLocation || '';
            case 'adminNotes': return family.adminNotes || '';
            default: return '';
          }
        }) : [];
        // Log the rowData, sons, and children before adding to Excel
        console.log('Excel rowData:', {
          familyId: family.id,
          husbandName: family.husbandName,
          rowData,
          sons,
          children,
        });
        const row = sheet.addRow(rowData);
        row.height = 20;
        row.eachCell(cell => { cell.style = dataStyle; });
      });
      // Set column widths
      sheet.columns.forEach((col, i) => { col.width = 20; });
      // Download
      const fileName = `families_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      toast({ title: 'تم التصدير بنجاح', description: `تم حفظ ملف Excel باسم: ${fileName}`, variant: 'default' });
    } catch (error) {
      toast({ title: 'خطأ في التصدير', description: 'حدث خطأ أثناء تصدير البيانات إلى Excel', variant: 'destructive' });
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredFamilies.length / pageSize);
  const paginatedFamilies = filteredFamilies.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleViewFamily = (family: any) => {
    setSelectedFamily(family);
    setIsDialogOpen(true);
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

  const totalFamilies = families?.length || 0;
  const displacedFamilies = families?.filter((family: any) => family.isDisplaced) || [];
  const damagedFamilies = families?.filter((family: any) => family.warDamage2024) || [];
  const abroadFamilies = families?.filter((family: any) => family.isAbroad) || [];

  return (
    <PageWrapper>
      <div className="space-y-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">إدارة الأسر</h1>
            <p className="text-muted-foreground">عرض وإدارة بيانات جميع الأسر المسجلة</p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
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
                  <div className="p-3 bg-red-100 rounded-lg">
                    <MapPin className="h-6 w-6 text-accent" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">أسر نازحة</p>
                    <p className="text-2xl font-bold text-foreground">{displacedFamilies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Users className="h-6 w-6 text-warning" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">أسر متضررة</p>
                    <p className="text-2xl font-bold text-foreground">{damagedFamilies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-secondary" />
                  </div>
                  <div className="mr-4">
                    <p className="text-sm text-muted-foreground">مغتربون</p>
                    <p className="text-2xl font-bold text-foreground">{abroadFamilies.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>البحث والتصفية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-row-reverse items-start justify-between gap-4 mb-8" dir="rtl">
                {/* Filters */}
                <div className="flex flex-row-reverse gap-4">
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">الفرع</label>
                    <Select value={branchFilter} onValueChange={setBranchFilter} dir="rtl">
                      <SelectTrigger className="w-32 text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل الفروع</SelectItem>
                        {branchOptions.map((branch) => (
                          <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">نازح</label>
                    <Select value={displacedFilter} onValueChange={setDisplacedFilter} dir="rtl">
                      <SelectTrigger className="w-28 text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="yes">نازح</SelectItem>
                        <SelectItem value="no">غير نازح</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">متضرر</label>
                    <Select value={damagedFilter} onValueChange={setDamagedFilter} dir="rtl">
                      <SelectTrigger className="w-28 text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="yes">متضرر</SelectItem>
                        <SelectItem value="no">غير متضرر</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col items-center">
                    <label className="mb-1 text-sm text-foreground text-center w-full">مغترب</label>
                    <Select value={abroadFilter} onValueChange={setAbroadFilter} dir="rtl">
                      <SelectTrigger className="w-28 text-right" dir="rtl">
                        <SelectValue className="text-right" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="yes">مغترب</SelectItem>
                        <SelectItem value="no">غير مغترب</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Search Field */}
                <div className="flex flex-col items-center">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="البحث بالاسم، رقم الهوية، أو الموقع..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 text-right"
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Families Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة الأسر ({filteredFamilies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredFamilies.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-background">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رب الأسرة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">رقم الهوية</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">أفراد الأسرة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الموقع</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الحالة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">تاريخ التسجيل</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {paginatedFamilies.map((family: any) => (
                        <tr key={family.id} className="hover:bg-muted">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-foreground">{family.husbandName}</div>
                              {family.primaryPhone && (
                                <div className="text-sm text-muted-foreground flex items-center">
                                  <Phone className="h-3 w-3 ml-1" />
                                  {family.primaryPhone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {family.husbandID}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-foreground">{family.totalMembers || 0}</div>
                            <div className="text-xs text-muted-foreground">
                              {family.numMales || 0} ذكور، {family.numFemales || 0} إناث
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {family.currentHousing || 'غير محدد'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              {family.isDisplaced && (
                                <Badge variant="destructive" className="text-xs">نازح</Badge>
                              )}
                              {family.warDamage2024 && (
                                <Badge variant="outline" className="text-xs">متضرر</Badge>
                              )}
                              {family.isAbroad && (
                                <Badge className="bg-primary/10 text-primary text-xs">مغترب</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {formatDate(family.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex space-x-2 space-x-reverse">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewFamily(family)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/families/${family.id}/edit`)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Link href={`/admin/families/${family.id}/summary`} target="_blank">
                                <Button variant="outline" size="sm">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (window.confirm("هل أنت متأكد أنك تريد حذف هذه الأسرة؟ سيتم حذف جميع الأفراد والبيانات المرتبطة بها.")) {
                                    deleteFamilyMutation.mutate(family.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Pagination Controls */}
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      السابق
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
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
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'لم يتم العثور على أسر تطابق البحث' : 'لا توجد أسر مسجلة'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Family Details Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-center w-full">تفاصيل الأسرة - {familyDetails?.husbandName || ''}</DialogTitle>
              </DialogHeader>
              {familyDetailsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">جاري تحميل التفاصيل...</div>
                </div>
              ) : familyDetailsError ? (
                <div className="flex flex-col items-center justify-center h-32 text-red-600">
                  <div>حدث خطأ أثناء تحميل بيانات الأسرة.</div>
                  <div className="text-xs text-muted-foreground mt-2">{familyDetailsError.message || 'يرجى المحاولة مرة أخرى لاحقاً.'}</div>
                </div>
              ) : !familyDetails ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <div>لا توجد بيانات متاحة لهذه الأسرة.</div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Family Info */}
                  <div className="bg-background rounded-lg p-4 border mb-2">
                    <div className="flex flex-wrap gap-4 items-center mb-2">
                      <Badge className="bg-blue-100 text-blue-800">رقم الأسرة: {familyDetails.id}</Badge>
                      {familyDetails.isDisplaced && <Badge variant="destructive">نازح</Badge>}
                      {familyDetails.warDamage2024 && <Badge variant="outline">متضرر</Badge>}
                      {familyDetails.isAbroad && <Badge className="bg-blue-100 text-blue-800">مغترب</Badge>}
                      {familyDetails.branch && <Badge className="bg-green-100 text-green-800">{familyDetails.branch}</Badge>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">العنوان الأصلي:</span>
                        <span className="mr-2">{familyDetails.originalResidence || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">مكان السكن الحالي:</span>
                        <span className="mr-2">{familyDetails.currentHousing || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">أقرب معلم:</span>
                        <span className="mr-2">{familyDetails.landmarkNear || 'غير محدد'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">ملاحظات الإدارة:</span>
                        <span className="mr-2">{familyDetails.adminNotes || 'لا يوجد'}</span>
                      </div>
                    </div>
                          </div>
                  {/* Husband & Wife Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg p-4 border">
                      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">رب الأسرة <Badge className="bg-blue-200 text-blue-900">{familyDetails.husbandName}</Badge></h4>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium text-muted-foreground">رقم الهوية:</span> <span className="mr-2">{familyDetails.husbandID}</span></div>
                        <div><span className="font-medium text-muted-foreground">تاريخ الميلاد:</span> <span className="mr-2">{familyDetails.husbandBirthDate || 'غير محدد'}{familyDetails.husbandBirthDate && <> (<span className="text-green-700">{calculateDetailedAge(familyDetails.husbandBirthDate)}</span>)</>}</span></div>
                        <div><span className="font-medium text-muted-foreground">المهنة:</span> <span className="mr-2">{familyDetails.husbandJob || 'غير محدد'}</span></div>
                        <div><span className="font-medium text-muted-foreground">الجوال:</span> <span className="mr-2">{familyDetails.primaryPhone || 'غير محدد'}</span></div>
                        <div><span className="font-medium text-muted-foreground">الجوال الإضافي:</span> <span className="mr-2">{familyDetails.secondaryPhone || 'غير محدد'}</span></div>
                          </div>
                    </div>
                    {familyDetails.wifeName && (
                      <div className="bg-white rounded-lg p-4 border">
                        <h4 className="font-semibold text-pink-900 mb-3 flex items-center gap-2">الزوجة <Badge className="bg-pink-200 text-pink-900">{familyDetails.wifeName}</Badge></h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium text-muted-foreground">رقم الهوية:</span> <span className="mr-2">{familyDetails.wifeID || 'غير محدد'}</span></div>
                          <div><span className="font-medium text-muted-foreground">تاريخ الميلاد:</span> <span className="mr-2">{familyDetails.wifeBirthDate || 'غير محدد'}{familyDetails.wifeBirthDate && <> (<span className="text-green-700">{calculateDetailedAge(familyDetails.wifeBirthDate)}</span>)</>}</span></div>
                          <div><span className="font-medium text-muted-foreground">المهنة:</span> <span className="mr-2">{familyDetails.wifeJob || 'غير محدد'}</span></div>
                          <div><span className="font-medium text-muted-foreground">حامل:</span> <span className="mr-2">{familyDetails.wifePregnant ? <Badge className="bg-yellow-200 text-yellow-900">نعم</Badge> : 'لا'}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Members */}
                  {familyDetails.members && familyDetails.members.length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">أفراد الأسرة</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-background">
                            <tr>
                              <th className="px-3 py-2 text-right">الاسم</th>
                              <th className="px-3 py-2 text-right">الجنس</th>
                              <th className="px-3 py-2 text-right">القرابة</th>
                              <th className="px-3 py-2 text-right">تاريخ الميلاد</th>
                            </tr>
                          </thead>
                          <tbody>
                            {familyDetails.members.map((member: any) => (
                              <tr key={member.id} className="border-b">
                                <td className="px-3 py-2">{member.fullName}</td>
                                <td className="px-3 py-2">{getGenderInArabic(member.gender)}</td>
                                <td className="px-3 py-2">{getRelationshipInArabic(member.relationship)}</td>
                                <td className="px-3 py-2">{member.birthDate || 'غير محدد'}{member.birthDate && <> (<span className="text-green-700">{calculateDetailedAge(member.birthDate)}</span>)</>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">لا يوجد أفراد مسجلين لهذه الأسرة.</div>
                  )}
                  {/* Recent Requests */}
                  {familyDetails.requests && familyDetails.requests.length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">الطلبات الأخيرة</h4>
                      <div className="space-y-2">
                        {familyDetails.requests.slice(0, 3).map((request: any) => (
                          <div key={request.id} className="flex items-center justify-between p-3 bg-background rounded border">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{getRequestTypeInArabic(request.type)}</span>
                              <span className="text-muted-foreground text-xs">{formatDate(request.createdAt)}</span>
                            </div>
                            <Badge className={
                              request.status === 'approved' ? 'bg-green-600 text-white' :
                              request.status === 'rejected' ? 'bg-red-600 text-white' :
                              'bg-yellow-400 text-black'
                            }>
                              {getRequestStatusInArabic(request.status)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">لا توجد طلبات حديثة لهذه الأسرة.</div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          {/* Export Controls Above Table */}
          {/* Replace the export controls area with a Card-based, modern, visually appealing selection UI */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <FileSpreadsheet className="h-5 w-5" />
                تصدير الأسر إلى Excel
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">حدد الأعمدة التي ترغب في تصديرها، ثم اضغط على زر التصدير.</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-2 justify-end">
                <Button type="button" variant="outline" onClick={handleSelectAll}>
                  تحديد الكل
                </Button>
                <Button type="button" variant="outline" onClick={handleDeselectAll}>
                  إلغاء تحديد الكل
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4" dir="rtl">
                {/* Sons group checkbox */}
                {sonCols.length > 0 && (
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${isSonsChecked ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                    style={{ order: 1 }}>
                    <input type="checkbox" checked={isSonsChecked} onChange={() => handleGroupToggle('sons')} className="accent-green-600 w-4 h-4" />
                    <span className="text-md">الأبناء</span>
                  </label>
                )}
                {/* Children group checkbox */}
                {childCols.length > 0 && (
                  <label className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${isChildrenChecked ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                    style={{ order: 2 }}>
                    <input type="checkbox" checked={isChildrenChecked} onChange={() => handleGroupToggle('children')} className="accent-green-600 w-4 h-4" />
                    <span className="text-md">الأطفال</span>
                  </label>
                )}
                {/* Render the rest of the columns except sons/children */}
                {excelColumns.filter(col => !col.key.startsWith('son') && !col.key.startsWith('child')).map((col, idx) => (
                  <label
                    key={col.key}
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all select-none shadow-sm ${checkedColumns[col.key] ?? true ? 'bg-green-50 border-green-500 text-green-800 font-bold ring-2 ring-green-200' : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'}`}
                    style={{ order: idx + 3 }}
                  >
                    <input
                      type="checkbox"
                      checked={checkedColumns[col.key] ?? true}
                      onChange={() => handleExcelColumnChange(col.key)}
                      className="accent-green-600 w-4 h-4"
                    />
                    <span className="text-md">{col.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleExportExcel} className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 px-8 py-2 text-lg rounded-lg shadow">
                  <FileSpreadsheet className="h-5 w-5 ml-2" />
                  تصدير إلى Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          
              </div>
    </PageWrapper>
  );
}
