import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Users, FileText, Hash, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Header } from "@/components/layout/header";

export default function ImportHeads() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [activeErrorTab, setActiveErrorTab] = useState("all");

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('excel', file);
      
      // Create AbortController with 10 minute timeout for large imports
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 minutes
      
      try {
        const res = await apiRequest("POST", "/api/admin/import-heads", formData, {
          headers: {
            // Don't set Content-Type, let the browser set it for FormData
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return await res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Import timeout - the file is too large or the process is taking too long');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      setImportResults(data);
      
      // Show appropriate toast based on results
      if (data.errorCount === 0) {
        toast({
          title: "تم الاستيراد بنجاح",
          description: `تم استيراد ${data.successCount} عائلة بنجاح`,
        });
      } else if (data.successCount === 0) {
        toast({
          title: "فشل الاستيراد",
          description: `فشل في استيراد جميع الصفوف (${data.errorCount} خطأ)`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "استيراد جزئي",
          description: data.message,
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      let errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes('404')) {
        errorMessage = "الخدمة غير متوفرة. تأكد من تشغيل الخادم";
      } else if (error.message.includes('403')) {
        errorMessage = "غير مصرح لك بهذه العملية";
      } else if (error.message.includes('500')) {
        errorMessage = "خطأ في الخادم. يرجى المحاولة لاحقاً";
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "خطأ في الاتصال. تحقق من الإنترنت";
      }

      toast({
        title: "خطأ في الاستيراد",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        toast({
          title: "نوع الملف غير صحيح",
          description: "يرجى اختيار ملف Excel (.xlsx أو .xls)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: "لا يوجد ملف",
        description: "يرجى اختيار ملف Excel أولاً",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "حجم الملف كبير",
        description: "يجب أن يكون حجم الملف أقل من 10 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    // Clear previous results
    setImportResults(null);
    
    importMutation.mutate(selectedFile);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        husbandName: "محمد أحمد ابو طير",
        husbandID: "123456789",
        husbandBirthDate: "1980-01-15",
        husbandJob: "مهندس",
        primaryPhone: "0599123456",
        secondaryPhone: "0567789123",
        originalResidence: "غزة - الشجاعية",
        currentHousing: "رفح - البرازيل",
        isDisplaced: "نعم",
        displacedLocation: "رفح",
        isAbroad: "لا",
        warDamage2024: "نعم",
        warDamageDescription: "تدمير كامل للمنزل",
        branch: "غزة",
        landmarkNear: "بجانب مسجد الشهداء",
        totalMembers: "5",
        numMales: "3",
        numFemales: "2",
        socialStatus: "متزوج",
        adminNotes: "ملاحظات إضافية"
      }
    ];

    const csvContent = Object.keys(templateData[0]).join(',') + '\n' + 
                      templateData.map(row => Object.values(row).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template-heads-import.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Categorize errors based on their content
  const categorizeErrors = (errors: string[]) => {
    const categories = {
      missingRequired: [] as string[],
      duplicateIds: [] as string[],
      invalidFormat: [] as string[],
      processingErrors: [] as string[]
    };

    errors.forEach(error => {
      if (error.includes('اسم رب الأسرة ورقم الهوية مطلوبان')) {
        categories.missingRequired.push(error);
      } else if (error.includes('مسجل مسبقاً')) {
        categories.duplicateIds.push(error);
      } else if (error.includes('يجب أن يكون 9 أرقام')) {
        categories.invalidFormat.push(error);
      } else {
        categories.processingErrors.push(error);
      }
    });

    return categories;
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Upload className="h-5 w-5 sm:h-6 sm:w-6" />
              استيراد رؤساء العائلات من Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>تعليمات الاستيراد:</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>الحقول المطلوبة: اسم رب الأسرة (husbandName) ورقم الهوية (husbandID)</li>
                    <li>رقم الهوية يجب أن يكون 9 أرقام</li>
                    <li>يتم استخدام رقم الهوية كاسم مستخدم وكلمة مرور افتراضية</li>
                    <li>الحقول الاختيارية: تاريخ الميلاد، المهنة، أرقام الهواتف، عنوان السكن، إلخ</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>

            {/* Template Download */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base">تحميل نموذج Excel</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  نموذج يحتوي على جميع الأعمدة المطلوبة والاختيارية
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate} className="w-full sm:w-auto">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                <span className="text-sm">تحميل النموذج</span>
              </Button>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <Label htmlFor="excel-file">اختر ملف Excel</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  تم اختيار الملف: {selectedFile.name}
                </div>
              )}
            </div>

            {/* Import Button */}
            <Button 
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الاستيراد...
                </div>
              ) : (
                "استيراد البيانات"
              )}
            </Button>

            {/* Enhanced Loading message for large imports */}
            {importMutation.isPending && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <div className="text-center">
                    <p className="font-medium text-blue-800 text-lg">جاري معالجة الملف...</p>
                    <p className="text-sm text-blue-700 mt-1">
                      يتم استيراد البيانات من ملف: <span className="font-medium">{selectedFile?.name}</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-3 bg-blue-100 p-2 rounded">
                      ⏱️ العمليات الكبيرة قد تستغرق من 5-15 دقيقة حسب حجم الملف
                      <br />
                      🚫 يرجى عدم إغلاق الصفحة أو إعادة تحديثها أثناء المعالجة
                      <br />
                      ⚡ يتم إنشاء حسابات وعائلات جديدة في النظام
                    </p>
                  </div>
                </div>
                
                {/* Progress hint */}
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                    <span>المعالجة جارية... يرجى الانتظار</span>
                    <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-150"></div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Results */}
        {importResults && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResults.errorCount === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                نتائج الاستيراد
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="text-center p-4 sm:p-6 bg-green-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    {importResults.successCount}
                  </div>
                  <div className="text-xs sm:text-sm text-green-800">تم الاستيراد بنجاح</div>
                </div>
                <div className="text-center p-4 sm:p-6 bg-red-50 rounded-lg">
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {importResults.errorCount}
                  </div>
                  <div className="text-xs sm:text-sm text-red-800">فشل في الاستيراد</div>
                </div>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (() => {
                const errorCategories = categorizeErrors(importResults.errors);
                const totalErrors = importResults.errors.length;
                
                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-semibold text-red-600 flex items-center gap-2 text-sm sm:text-base">
                        <AlertTriangle className="h-4 w-4" />
                        تفاصيل الأخطاء ({totalErrors})
                      </h4>
                      {importResults.errorCount > 20 && (
                        <Badge variant="outline" className="text-xs self-start sm:self-auto">
                          عرض أول 20 خطأ
                        </Badge>
                      )}
                    </div>
                    
                    <Tabs value={activeErrorTab} onValueChange={setActiveErrorTab}>
                      <TabsList className="flex flex-wrap w-full gap-1 mb-4 h-auto p-1">
                        <TabsTrigger value="all" className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 flex-shrink-0">
                          <span className="hidden sm:inline">جميع الأخطاء</span>
                          <span className="sm:hidden">الكل</span>
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {totalErrors}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="missing" className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 flex-shrink-0" disabled={errorCategories.missingRequired.length === 0}>
                          <FileText className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">حقول ناقصة</span>
                          <span className="sm:hidden">ناقص</span>
                          {errorCategories.missingRequired.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              {errorCategories.missingRequired.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="duplicate" className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 flex-shrink-0" disabled={errorCategories.duplicateIds.length === 0}>
                          <Users className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">هويات مكررة</span>
                          <span className="sm:hidden">مكرر</span>
                          {errorCategories.duplicateIds.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              {errorCategories.duplicateIds.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="format" className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 flex-shrink-0" disabled={errorCategories.invalidFormat.length === 0}>
                          <Hash className="h-3 w-3 mr-1" />
                          <span className="hidden lg:inline">تنسيق خاطئ</span>
                          <span className="lg:hidden">تنسيق</span>
                          {errorCategories.invalidFormat.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              {errorCategories.invalidFormat.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="processing" className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 flex-shrink-0" disabled={errorCategories.processingErrors.length === 0}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          <span className="hidden lg:inline">أخطاء أخرى</span>
                          <span className="lg:hidden">أخرى</span>
                          {errorCategories.processingErrors.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              {errorCategories.processingErrors.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="all">
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {importResults.errors.map((error: string, index: number) => (
                            <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-500">
                              {error}
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="missing">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground mb-2">
                            📋 الصفوف التي تفتقر للحقول المطلوبة (اسم رب الأسرة أو رقم الهوية)
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {errorCategories.missingRequired.map((error: string, index: number) => (
                              <div key={index} className="text-sm text-orange-600 bg-orange-50 p-2 rounded border-l-4 border-orange-500">
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="duplicate">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground mb-2">
                            👥 أرقام هوية موجودة مسبقاً في النظام
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {errorCategories.duplicateIds.map((error: string, index: number) => (
                              <div key={index} className="text-sm text-blue-600 bg-blue-50 p-2 rounded border-l-4 border-blue-500">
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="format">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground mb-2">
                            #️⃣ أرقام هوية بتنسيق خاطئ (يجب أن تكون 9 أرقام فقط)
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {errorCategories.invalidFormat.map((error: string, index: number) => (
                              <div key={index} className="text-sm text-purple-600 bg-purple-50 p-2 rounded border-l-4 border-purple-500">
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="processing">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground mb-2">
                            ⚠️ أخطاء في معالجة البيانات أو أخطاء عامة
                          </div>
                          <div className="max-h-60 overflow-y-auto space-y-1">
                            {errorCategories.processingErrors.map((error: string, index: number) => (
                              <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-red-500">
                                {error}
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}