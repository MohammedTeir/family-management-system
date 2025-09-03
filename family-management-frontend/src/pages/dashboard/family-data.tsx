import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Users } from "lucide-react";
import { Link } from "wouter";
import { getSocialStatusInArabic } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { isChild, calculateDetailedAge } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/hooks/use-settings";
import { PageWrapper } from "@/components/layout/page-wrapper";

const familySchema = z.object({
  husbandName: z.string().min(1, "الاسم مطلوب"),
  husbandID: z.string().regex(/^\d{9}$/, "رقم الهوية يجب أن يكون 9 أرقام"),
  husbandBirthDate: z.string().min(1, "تاريخ الميلاد مطلوب"),
  husbandJob: z.string().min(1, "المهنة مطلوبة"),
  primaryPhone: z.string().min(1, "رقم الجوال مطلوب"),
  secondaryPhone: z.string().optional(),
  wifeName: z.string().optional(),
  wifeID: z.string().optional(),
  wifeBirthDate: z.string().optional(),
  wifeJob: z.string().optional(),
  wifePregnant: z.boolean().default(false),
  originalResidence: z.string().min(1, "السكن الأصلي مطلوب"),
  currentHousing: z.string().min(1, "السكن الحالي مطلوب"),
  isDisplaced: z.boolean().default(false),
  displacedLocation: z.string().optional(),
  isAbroad: z.boolean().default(false),
  warDamage2024: z.boolean().default(false),
  warDamageDescription: z.string().optional(),
  branch: z.string().optional(),
  landmarkNear: z.string().optional(),
  socialStatus: z.string().optional(),
  totalMembers: z.coerce.number().min(1, "عدد الأفراد مطلوب"),
  numMales: z.coerce.number().min(0, "عدد الذكور مطلوب"),
  numFemales: z.coerce.number().min(0, "عدد الإناث مطلوب"),
});

type FamilyFormData = z.infer<typeof familySchema>;

export default function FamilyData() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [customSocialStatus, setCustomSocialStatus] = useState("");
  const [customDamageDescription, setCustomDamageDescription] = useState("");
  const [customBranch, setCustomBranch] = useState("");
  const { data: family, isLoading } = useQuery({
    queryKey: ["/api/family"],
  });
  const [, navigate] = useLocation();
  const { settings } = useSettings();

  const form = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      husbandName: "",
      husbandID: "",
      husbandBirthDate: "",
      husbandJob: "",
      primaryPhone: "",
      secondaryPhone: "",
      wifeName: "",
      wifeID: "",
      wifeBirthDate: "",
      wifeJob: "",
      wifePregnant: false,
      originalResidence: "",
      currentHousing: "",
      isDisplaced: false,
      displacedLocation: "",
      isAbroad: false,
      warDamage2024: false,
      warDamageDescription: "",
      branch: "",
      landmarkNear: "",
      socialStatus: "",
      totalMembers: 0,
      numMales: 0,
      numFemales: 0,
    },
  });

  useEffect(() => {
    if (family) {
      form.reset({
        ...family,
        husbandBirthDate: family.husbandBirthDate ? formatDateForInput(family.husbandBirthDate) : "",
        wifeBirthDate: family.wifeBirthDate ? formatDateForInput(family.wifeBirthDate) : "",
      });
    }
  }, [family, form]);

  useEffect(() => {
    if (family?.warDamageDescription && 
        !["total_destruction_uninhabitable", "partial_destruction_habitable", "minor_damage"].includes(family.warDamageDescription)) {
      setCustomDamageDescription(family.warDamageDescription);
      form.setValue("warDamageDescription", "custom");
    }
  }, [family, form]);

  useEffect(() => {
    if (family?.socialStatus && 
        !["married", "divorced", "widowed"].includes(family.socialStatus)) {
      setCustomSocialStatus(family.socialStatus);
      form.setValue("socialStatus", "custom");
    }
  }, [family, form]);

  useEffect(() => {
    if (family?.branch && 
        !["abouda_abunasr", "married_daughters_displaced", "alnogra", "abushalbia_abumatar"].includes(family.branch)) {
      setCustomBranch(family.branch);
      form.setValue("branch", "custom");
    }
  }, [family, form]);

  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings.siteTitle, settings.language]);

  const updateFamilyMutation = useMutation({
    mutationFn: async (data: FamilyFormData) => {
      const res = await apiRequest("PUT", `/api/family/${family.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setIsEditing(false);
      toast({
        title: "تم التحديث بنجاح",
        description: "تم حفظ بيانات الأسرة",
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

  const createFamilyMutation = useMutation({
    mutationFn: async (data: FamilyFormData) => {
      const res = await apiRequest("POST", "/api/family", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setIsEditing(false);
      toast({
        title: "تم الإنشاء بنجاح",
        description: "تم إنشاء بيانات الأسرة",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في الإنشاء",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FamilyFormData) => {
    if (data.socialStatus === "custom") {
      data.socialStatus = customSocialStatus;
    }
    
    if (data.warDamageDescription === "custom") {
      data.warDamageDescription = customDamageDescription;
    }
    
    if (data.branch === "custom") {
      data.branch = customBranch;
    }
    
    if (family) {
      updateFamilyMutation.mutate(data);
    } else {
      createFamilyMutation.mutate(data);
    }
  };

  // Helper function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "dd/MM/yyyy", { locale: ar });
    } catch {
      return dateString;
    }
  };

  // Helper function to format date for input
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd");
    } catch {
      return dateString;
    }
  };

  // Filter children (under 2 years old)
  const children = family?.members.filter((member: any) => isChild(member.birthDate)) || [];

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">بيانات الأسرة</h1>
          <p className="text-muted-foreground">إدارة وتحديث بيانات الأسرة الشخصية</p>
        </div>
        <Link href="/dashboard/members">
          <Button variant="outline" className="mb-4">
            <Users className="h-5 w-5 ml-3" />
            <span>عرض أفراد الأسرة</span>
          </Button>
        </Link>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Husband Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>بيانات رب الأسرة</CardTitle>
              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                >
                  تعديل
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="husbandName">الاسم الرباعي *</Label>
                  <Input
                    id="husbandName"
                    disabled={!isEditing}
                    {...form.register("husbandName")}
                  />
                  {form.formState.errors.husbandName && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.husbandName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="husbandID">رقم الهوية *</Label>
                  <Input
                    id="husbandID"
                    disabled={!isEditing}
                    {...form.register("husbandID")}
                  />
                  {form.formState.errors.husbandID && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.husbandID.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="husbandBirthDate">تاريخ الميلاد</Label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                  <Input
                    id="husbandBirthDate"
                    type="date"
                    disabled={!isEditing}
                    {...form.register("husbandBirthDate")}
                  />
                    {form.watch("husbandBirthDate") && (
                      <Badge variant="outline">
                        {calculateDetailedAge(form.watch("husbandBirthDate"))}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="husbandJob">المهنة *</Label>
                  <Input
                    id="husbandJob"
                    disabled={!isEditing}
                    {...form.register("husbandJob")}
                  />
                </div>

                <div>
                  <Label htmlFor="primaryPhone">رقم الجوال الأساسي *</Label>
                  <Input
                    id="primaryPhone"
                    disabled={!isEditing}
                    {...form.register("primaryPhone")}
                  />
                </div>

                <div>
                  <Label htmlFor="secondaryPhone">رقم الجوال البديل</Label>
                  <Input
                    id="secondaryPhone"
                    disabled={!isEditing}
                    {...form.register("secondaryPhone")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wife Information */}
          <Card>
            <CardHeader>
              <CardTitle>بيانات الزوجة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="wifeName">الاسم الرباعي</Label>
                  <Input
                    id="wifeName"
                    disabled={!isEditing}
                    {...form.register("wifeName")}
                  />
                </div>

                <div>
                  <Label htmlFor="wifeID">رقم الهوية</Label>
                  <Input
                    id="wifeID"
                    disabled={!isEditing}
                    {...form.register("wifeID")}
                  />
                </div>

                <div>
                  <Label htmlFor="wifeBirthDate">تاريخ الميلاد</Label>
                  <div className="flex items-center space-x-2 space-x-reverse">
                  <Input
                    id="wifeBirthDate"
                    type="date"
                    disabled={!isEditing}
                    {...form.register("wifeBirthDate")}
                  />
                    {form.watch("wifeBirthDate") && (
                      <Badge variant="outline">
                        {calculateDetailedAge(form.watch("wifeBirthDate"))}
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="wifeJob">المهنة</Label>
                  <Input
                    id="wifeJob"
                    disabled={!isEditing}
                    {...form.register("wifeJob")}
                  />
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="wifePregnant"
                    disabled={!isEditing}
                    checked={form.watch("wifePregnant")}
                    onCheckedChange={(checked) => form.setValue("wifePregnant", checked)}
                  />
                  <Label htmlFor="wifePregnant">حامل</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Family Members */}
          <Card>
            <CardHeader>
              <CardTitle>عدد أفراد الأسرة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="totalMembers">إجمالي الأفراد *</Label>
                  <Input
                    id="totalMembers"
                    type="number"
                    min={1}
                    disabled={!isEditing}
                    {...form.register("totalMembers")}
                  />
                  {form.formState.errors.totalMembers && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.totalMembers.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="numMales">عدد الذكور *</Label>
                  <Input
                    id="numMales"
                    type="number"
                    min={0}
                    disabled={!isEditing}
                    {...form.register("numMales")}
                  />
                  {form.formState.errors.numMales && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.numMales.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="numFemales">عدد الإناث *</Label>
                  <Input
                    id="numFemales"
                    type="number"
                    min={0}
                    disabled={!isEditing}
                    {...form.register("numFemales")}
                  />
                  {form.formState.errors.numFemales && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.numFemales.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Housing Information */}
          <Card>
            <CardHeader>
              <CardTitle>بيانات السكن</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="originalResidence">السكن الأصلي *</Label>
                  <Input
                    id="originalResidence"
                    disabled={!isEditing}
                    {...form.register("originalResidence")}
                  />
                  {form.formState.errors.originalResidence && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.originalResidence.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="currentHousing">السكن الحالي *</Label>
                  <Input
                    id="currentHousing"
                    disabled={!isEditing}
                    {...form.register("currentHousing")}
                  />
                  {form.formState.errors.currentHousing && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.currentHousing.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="branch">الفرع</Label>
                  <Select
                    disabled={!isEditing}
                    value={form.watch("branch") || ""}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        form.setValue("branch", "custom");
                      } else {
                        form.setValue("branch", value);
                        setCustomBranch("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفرع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="abouda_abunasr">عائلة ابوعودة + ابو نصر</SelectItem>
                      <SelectItem value="married_daughters_displaced">بنات العائلة متزوجات خارج العائلة, نازحين عند عائلة ابو طير</SelectItem>
                      <SelectItem value="alnogra">النقرة</SelectItem>
                      <SelectItem value="abushalbia_abumatar">ابو شلبية + ابو مطر</SelectItem>
                      <SelectItem value="custom">تخصيص</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.watch("branch") === "custom" && (
                    <Input
                      className="mt-2"
                      placeholder="أدخل اسم الفرع"
                      value={customBranch}
                      disabled={!isEditing}
                      onChange={e => {
                        setCustomBranch(e.target.value);
                      }}
                    />
                  )}
                </div>
                <div>
                  <Label htmlFor="landmarkNear">أقرب معلم</Label>
                  <Input
                    id="landmarkNear"
                    disabled={!isEditing}
                    {...form.register("landmarkNear")}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="isDisplaced"
                    disabled={!isEditing}
                    checked={form.watch("isDisplaced")}
                    onCheckedChange={(checked) => form.setValue("isDisplaced", checked)}
                  />
                  <Label htmlFor="isDisplaced">أسرة نازحة</Label>
                </div>
                {form.watch("isDisplaced") && (
                  <div>
                    <Label htmlFor="displacedLocation">موقع النزوح</Label>
                    <Input
                      id="displacedLocation"
                      disabled={!isEditing}
                      {...form.register("displacedLocation")}
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="isAbroad"
                    disabled={!isEditing}
                    checked={form.watch("isAbroad")}
                    onCheckedChange={(checked) => form.setValue("isAbroad", checked)}
                  />
                  <Label htmlFor="isAbroad">مغترب بالخارج</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Switch
                    id="warDamage2024"
                    disabled={!isEditing}
                    checked={form.watch("warDamage2024")}
                    onCheckedChange={(checked) => form.setValue("warDamage2024", checked)}
                  />
                  <Label htmlFor="warDamage2024">أضرار 2024</Label>
                </div>
                {form.watch("warDamage2024") && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="warDamageDescription">نوع الأضرار</Label>
                      <Select
                        disabled={!isEditing}
                        value={form.watch("warDamageDescription") || ""}
                        onValueChange={(value) => {
                          if (value === "custom") {
                            form.setValue("warDamageDescription", "custom");
                          } else {
                            form.setValue("warDamageDescription", value);
                            setCustomDamageDescription("");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع الأضرار" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="total_destruction_uninhabitable">هدم كلي غير قابل للسكن</SelectItem>
                          <SelectItem value="partial_destruction_habitable">هدم جزئي قابل للسكن</SelectItem>
                          <SelectItem value="minor_damage">اضرار بسيطة</SelectItem>
                          <SelectItem value="custom">تخصيص</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {form.watch("warDamageDescription") === "custom" && (
                      <div>
                        <Label htmlFor="customDamageDescription">تفاصيل الأضرار المخصصة</Label>
                        <Textarea
                          id="customDamageDescription"
                          placeholder="وصف تفصيلي للأضرار التي لحقت بالأسرة..."
                          value={customDamageDescription}
                          disabled={!isEditing}
                          onChange={(e) => {
                            setCustomDamageDescription(e.target.value);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <Label htmlFor="socialStatus">الحالة الاجتماعية</Label>
                  <Select
                    disabled={!isEditing}
                    value={form.watch("socialStatus") || ""}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        form.setValue("socialStatus", "custom");
                      } else {
                        form.setValue("socialStatus", value);
                        setCustomSocialStatus("");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="married">متزوج</SelectItem>
                      <SelectItem value="divorced">مطلق</SelectItem>
                      <SelectItem value="widowed">أرمل</SelectItem>
                      <SelectItem value="custom">تخصيص</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.watch("socialStatus") === "custom" && (
                    <Input
                      className="mt-2"
                      placeholder="أدخل الحالة الاجتماعية"
                      value={customSocialStatus}
                      disabled={!isEditing}
                      onChange={e => {
                        setCustomSocialStatus(e.target.value);
                      }}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {isEditing && (
            <div className="flex justify-end space-x-4 space-x-reverse">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isLoading || updateFamilyMutation.isPending || createFamilyMutation.isPending}
              >
                {isLoading ? "جاري التحميل..." : (updateFamilyMutation.isPending || createFamilyMutation.isPending) ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
