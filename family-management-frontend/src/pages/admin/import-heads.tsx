import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle, Users, FileText, Hash } from "lucide-react";
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
      <Header title="استيراد رؤساء العائلات" />
      
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              استيراد البيانات من Excel
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
            <div className="flex justify-between items-center p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">تحميل نموذج Excel</h3>
                <p className="text-sm text-muted-foreground">
                  نموذج يحتوي على جميع الأعمدة المطلوبة والاختيارية
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                تحميل النموذج
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
              {importMutation.isPending ? "جاري الاستيراد... (قد يستغرق عدة دقائق للملفات الكبيرة)" : "استيراد البيانات"}
            </Button>

            {/* Loading message for large imports */}
            {importMutation.isPending && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  <strong>يتم معالجة الملف...</strong>
                  <br />
                  الملفات الكبيرة قد تستغرق عدة دقائق. يرجى الانتظار وعدم إغلاق الصفحة.
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {importResults.successCount}
                  </div>
                  <div className="text-sm text-green-800">تم الاستيراد بنجاح</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {importResults.errorCount}
                  </div>
                  <div className="text-sm text-red-800">فشل في الاستيراد</div>
                </div>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (() => {
                const errorCategories = categorizeErrors(importResults.errors);
                const totalErrors = importResults.errors.length;
                
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        تفاصيل الأخطاء ({totalErrors})
                      </h4>
                      {importResults.errorCount > 20 && (
                        <Badge variant="outline" className="text-xs">
                          عرض أول 20 خطأ
                        </Badge>
                      )}
                    </div>
                    
                    <Tabs value={activeErrorTab} onValueChange={setActiveErrorTab}>
                      <TabsList className="grid w-full grid-cols-5 mb-4">
                        <TabsTrigger value="all" className="text-xs">
                          جميع الأخطاء
                          <Badge variant="secondary" className="ml-1 text-xs">
                            {totalErrors}
                          </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="missing" className="text-xs" disabled={errorCategories.missingRequired.length === 0}>
                          <FileText className="h-3 w-3 mr-1" />
                          حقول ناقصة
                          {errorCategories.missingRequired.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              {errorCategories.missingRequired.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="duplicate" className="text-xs" disabled={errorCategories.duplicateIds.length === 0}>
                          <Users className="h-3 w-3 mr-1" />
                          هويات مكررة
                          {errorCategories.duplicateIds.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              {errorCategories.duplicateIds.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="format" className="text-xs" disabled={errorCategories.invalidFormat.length === 0}>
                          <Hash className="h-3 w-3 mr-1" />
                          تنسيق خاطئ
                          {errorCategories.invalidFormat.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-xs">
                              {errorCategories.invalidFormat.length}
                            </Badge>
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="processing" className="text-xs" disabled={errorCategories.processingErrors.length === 0}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          أخطاء أخرى
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