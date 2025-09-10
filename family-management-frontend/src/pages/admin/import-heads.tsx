import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Header } from "@/components/layout/header";

export default function ImportHeads() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('excel', file);
      
      const res = await apiRequest("POST", "/api/admin/import-heads", formData, {
        headers: {
          // Don't set Content-Type, let the browser set it for FormData
        }
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      toast({
        title: "تم الاستيراد",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الاستيراد",
        description: error.message,
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

    importMutation.mutate(selectedFile);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        husbandName: "محمد أحمد علي",
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
              {importMutation.isPending ? "جاري الاستيراد..." : "استيراد البيانات"}
            </Button>
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

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-600">الأخطاء:</h4>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {importResults.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                  {importResults.errorCount > 20 && (
                    <p className="text-sm text-muted-foreground">
                      تم عرض أول 20 خطأ فقط...
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}