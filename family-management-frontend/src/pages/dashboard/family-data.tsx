import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Users, Plus, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { getSocialStatusInArabic } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { isChild, calculateDetailedAge } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSettingsContext } from "@/App";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Header } from "@/components/layout/header";

const familySchema = z.object({
  husbandName: z.string({ required_error: "الاسم مطلوب", invalid_type_error: "الاسم يجب أن يكون نص" }).min(1, "الاسم مطلوب"),
  husbandID: z.string({ required_error: "رقم الهوية مطلوب", invalid_type_error: "رقم الهوية يجب أن يكون نص" }).regex(/^\d{9}$/, "رقم الهوية يجب أن يكون 9 أرقام"),
  husbandBirthDate: z.string({ required_error: "تاريخ الميلاد مطلوب", invalid_type_error: "تاريخ الميلاد يجب أن يكون نص" }).min(1, "تاريخ الميلاد مطلوب"),
  husbandJob: z.string({ required_error: "المهنة مطلوبة", invalid_type_error: "المهنة يجب أن تكون نص" }).min(1, "المهنة مطلوبة"),
  primaryPhone: z.string({ required_error: "رقم الجوال مطلوب", invalid_type_error: "رقم الجوال يجب أن يكون نص" }).min(1, "رقم الجوال مطلوب"),
  secondaryPhone: z.string({ invalid_type_error: "رقم الجوال البديل يجب أن يكون نص" }).nullable().optional(),
  originalResidence: z.string({ required_error: "السكن الأصلي مطلوب", invalid_type_error: "السكن الأصلي يجب أن يكون نص" }).min(1, "السكن الأصلي مطلوب"),
  currentHousing: z.string({ required_error: "السكن الحالي مطلوب", invalid_type_error: "السكن الحالي يجب أن يكون نص" }).min(1, "السكن الحالي مطلوب"),
  isDisplaced: z.boolean({ invalid_type_error: "حقل النزوح يجب أن يكون صحيح أو خطأ" }).default(false),
  displacedLocation: z.string({ invalid_type_error: "موقع النزوح يجب أن يكون نص" }).nullable().optional(),
  isAbroad: z.boolean({ invalid_type_error: "حقل الاغتراب يجب أن يكون صحيح أو خطأ" }).default(false),
  warDamage2024: z.boolean({ invalid_type_error: "حقل أضرار 2024 يجب أن يكون صحيح أو خطأ" }).default(false),
  warDamageDescription: z.string({ invalid_type_error: "وصف الأضرار يجب أن يكون نص" }).nullable().optional(),
  branch: z.string({ invalid_type_error: "الفرع يجب أن يكون نص" }).nullable().optional(),
  landmarkNear: z.string({ invalid_type_error: "أقرب معلم يجب أن يكون نص" }).nullable().optional(),
  socialStatus: z.string({ invalid_type_error: "الحالة الاجتماعية يجب أن تكون نص" }).nullable().optional(),
  totalMembers: z.coerce.number({ required_error: "عدد الأفراد مطلوب", invalid_type_error: "عدد الأفراد يجب أن يكون رقم" }).min(1, "عدد الأفراد مطلوب"),
  numMales: z.coerce.number({ required_error: "عدد الذكور مطلوب", invalid_type_error: "عدد الذكور يجب أن يكون رقم" }).min(0, "عدد الذكور مطلوب"),
  numFemales: z.coerce.number({ required_error: "عدد الإناث مطلوب", invalid_type_error: "عدد الإناث يجب أن يكون رقم" }).min(0, "عدد الإناث مطلوب"),
});

const wifeSchema = z.object({
  wifeName: z.string({ required_error: "اسم الزوجة مطلوب", invalid_type_error: "اسم الزوجة يجب أن يكون نص" }).min(1, "اسم الزوجة مطلوب"),
  wifeID: z.string({ invalid_type_error: "رقم هوية الزوجة يجب أن يكون نص" }).nullable().optional(),
  wifeBirthDate: z.string({ invalid_type_error: "تاريخ ميلاد الزوجة يجب أن يكون نص" }).nullable().optional(),
  wifeJob: z.string({ invalid_type_error: "مهنة الزوجة يجب أن تكون نص" }).nullable().optional(),
  wifePregnant: z.boolean({ invalid_type_error: "حقل الحمل يجب أن يكون صحيح أو خطأ" }).default(false),
});

type FamilyFormData = z.infer<typeof familySchema>;
type WifeFormData = z.infer<typeof wifeSchema>;

export default function FamilyData() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingWife, setIsAddingWife] = useState(false);
  const [editingWifeId, setEditingWifeId] = useState<number | null>(null);
  const [deleteWifeId, setDeleteWifeId] = useState<number | null>(null);
  const [customSocialStatus, setCustomSocialStatus] = useState("");
  const [customDamageDescription, setCustomDamageDescription] = useState("");
  const [customBranch, setCustomBranch] = useState("");
  
  const { data: family, isLoading } = useQuery({
    queryKey: ["/api/family"],
  });
  const [, navigate] = useLocation();
  const { settings } = useSettingsContext();

  const form = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      husbandName: "",
      husbandID: "",
      husbandBirthDate: "",
      husbandJob: "",
      primaryPhone: "",
      secondaryPhone: "",
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

  // Track current form values to ensure UI updates (must be after form declaration)
  const currentBranch = form.watch("branch");
  const currentSocialStatus = form.watch("socialStatus");
  const currentWarDamageDescription = form.watch("warDamageDescription");

  const wifeForm = useForm<WifeFormData>({
    resolver: zodResolver(wifeSchema),
    defaultValues: {
      wifeName: "",
      wifeID: "",
      wifeBirthDate: "",
      wifeJob: "",
      wifePregnant: false,
    },
  });

  useEffect(() => {
    if (family) {
      // Check for custom values before resetting form
      const isCustomSocialStatus = family.socialStatus && 
        !["married", "polygamous", "divorced", "widowed"].includes(family.socialStatus);
      const isCustomBranch = family.branch && 
        !["abouda_abunasr", "married_daughters_displaced", "alnogra", "abushalbia_abumatar"].includes(family.branch);
      const isCustomDamage = family.warDamageDescription && 
        !["total_destruction_uninhabitable", "partial_destruction_habitable", "minor_damage"].includes(family.warDamageDescription);

      // Set custom state values
      if (isCustomSocialStatus) {
        setCustomSocialStatus(family.socialStatus);
      } else {
        setCustomSocialStatus(""); // Clear if not custom
      }
      if (isCustomBranch) {
        setCustomBranch(family.branch);
      } else {
        setCustomBranch(""); // Clear if not custom
      }
      if (isCustomDamage) {
        setCustomDamageDescription(family.warDamageDescription);
      } else {
        setCustomDamageDescription(""); // Clear if not custom
      }

      // Reset form with proper values
      const formData = {
        ...family,
        husbandBirthDate: family.husbandBirthDate ? formatDateForInput(family.husbandBirthDate) : "",
        socialStatus: isCustomSocialStatus ? "custom" : family.socialStatus || "",
        branch: isCustomBranch ? "custom" : family.branch || "",
        warDamageDescription: isCustomDamage ? "custom" : family.warDamageDescription || "",
      };
      
      form.reset(formData);
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
      return res.data;
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
      return res.data;
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

  const createWifeMutation = useMutation({
    mutationFn: async (data: WifeFormData) => {
      const res = await apiRequest("POST", "/api/wives", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setIsAddingWife(false);
      wifeForm.reset();
      toast({
        title: "تم الإضافة بنجاح",
        description: "تم إضافة الزوجة بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في الإضافة",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateWifeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WifeFormData> }) => {
      const res = await apiRequest("PUT", `/api/wives/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      setEditingWifeId(null);
      setIsAddingWife(false);
      wifeForm.reset();
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات الزوجة",
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

  const deleteWifeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/wives/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/family"] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف الزوجة بنجاح",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FamilyFormData) => {
    // Handle custom values
    if (data.socialStatus === "custom") {
      data.socialStatus = customSocialStatus;
    }
    
    if (data.warDamageDescription === "custom") {
      data.warDamageDescription = customDamageDescription;
    }
    
    if (data.branch === "custom") {
      data.branch = customBranch;
    }
    
    // Safeguard: Ensure we don't send empty values for existing family
    if (family) {
      // If form values are empty but family has values, preserve the existing values
      const safeData = {
        ...data,
        socialStatus: data.socialStatus || family.socialStatus || "",
        branch: data.branch || family.branch || "",
        warDamageDescription: data.warDamageDescription || family.warDamageDescription || "",
      };
      
      updateFamilyMutation.mutate(safeData);
    } else {
      createFamilyMutation.mutate(data);
    }
  };

  const onSubmitWife = (data: WifeFormData) => {
    if (editingWifeId) {
      updateWifeMutation.mutate({ id: editingWifeId, data });
    } else {
      createWifeMutation.mutate(data);
    }
  };

  const handleEditWife = (wife: any) => {
    setEditingWifeId(wife.id);
    setIsAddingWife(true);
    wifeForm.reset({
      wifeName: wife.wifeName || "",
      wifeID: wife.wifeID || "",
      wifeBirthDate: wife.wifeBirthDate ? formatDateForInput(wife.wifeBirthDate) : "",
      wifeJob: wife.wifeJob || "",
      wifePregnant: wife.wifePregnant || false,
    });
  };

  const handleDeleteWife = (id: number) => {
    setDeleteWifeId(id);
  };

  const confirmDeleteWife = () => {
    if (deleteWifeId) {
      deleteWifeMutation.mutate(deleteWifeId);
      setDeleteWifeId(null);
    }
  };

  const handleCancelWife = () => {
    setIsAddingWife(false);
    setEditingWifeId(null);
    wifeForm.reset();
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">بيانات الأسرة</h1>
          <p className="text-sm sm:text-base text-muted-foreground">إدارة وتحديث بيانات الأسرة الشخصية</p>
        </div>
        <Link href="/dashboard/members">
          <Button variant="outline" className="mb-4 w-full sm:w-auto">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 ml-2 sm:ml-3" />
            <span className="text-sm sm:text-base">عرض أفراد الأسرة</span>
          </Button>
        </Link>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          {/* Husband Information */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl">بيانات رب الأسرة</CardTitle>
              {!isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="w-full sm:w-auto text-sm sm:text-base"
                >
                  تعديل
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                    disabled={true}
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
        </form>

        {/* Wives Information */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg sm:text-xl">
                {(() => {
                  const socialStatus = form.watch("socialStatus");
                  if (socialStatus === "polygamous") return "بيانات الزوجات";
                  if (socialStatus === "married") return "بيانات الزوجة";
                  return "بيانات الزوجة"; // default
                })()}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingWife(true)}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                <Plus className="h-4 w-4 ml-2" />
                إضافة زوجة
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              {family?.wives && family.wives.length > 0 ? (
                <div className="space-y-4">
                  {family.wives.map((wife: any, index: number) => (
                    <div key={wife.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{wife.wifeName}</h4>
                          {wife.wifeID && (
                            <p className="text-sm text-muted-foreground">رقم الهوية: {wife.wifeID}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditWife(wife)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteWife(wife.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                        {wife.wifeBirthDate && (
                          <div>
                            <span className="text-muted-foreground">تاريخ الميلاد: </span>
                            <span>{formatDateForDisplay(wife.wifeBirthDate)}</span>
                            <Badge variant="outline" className="ml-2">
                              {calculateDetailedAge(wife.wifeBirthDate)}
                            </Badge>
                          </div>
                        )}
                        {wife.wifeJob && (
                          <div>
                            <span className="text-muted-foreground">المهنة: </span>
                            <span>{wife.wifeJob}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-4 mt-2">
                        {wife.wifePregnant && (
                          <Badge variant="secondary">حامل</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  لا توجد زوجة مسجلة
                </div>
              )}

              {/* Add/Edit Wife Form */}
              {isAddingWife && (
                <div className="border-t pt-6">
                  <h4 className="text-lg font-semibold mb-4">
                    {editingWifeId ? "تعديل بيانات الزوجة" : "إضافة زوجة جديدة"}
                  </h4>
                  <form onSubmit={wifeForm.handleSubmit(onSubmitWife)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="wifeName">الاسم الرباعي *</Label>
                        <Input
                          id="wifeName"
                          {...wifeForm.register("wifeName")}
                        />
                        {wifeForm.formState.errors.wifeName && (
                          <p className="text-sm text-destructive mt-1">
                            {wifeForm.formState.errors.wifeName.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="wifeID">رقم الهوية</Label>
                        <Input
                          id="wifeID"
                          {...wifeForm.register("wifeID")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="wifeBirthDate">تاريخ الميلاد</Label>
                        <Input
                          id="wifeBirthDate"
                          type="date"
                          {...wifeForm.register("wifeBirthDate")}
                        />
                      </div>

                      <div>
                        <Label htmlFor="wifeJob">المهنة</Label>
                        <Input
                          id="wifeJob"
                          {...wifeForm.register("wifeJob")}
                        />
                      </div>


                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Switch
                          id="wifePregnant"
                          checked={wifeForm.watch("wifePregnant")}
                          onCheckedChange={(checked) => wifeForm.setValue("wifePregnant", checked)}
                        />
                        <Label htmlFor="wifePregnant">حامل</Label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelWife}
                      >
                        إلغاء
                      </Button>
                      <Button
                        type="submit"
                        disabled={createWifeMutation.isPending || updateWifeMutation.isPending}
                      >
                        {createWifeMutation.isPending || updateWifeMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </CardContent>
          </Card>


        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8">
          {/* Family Members */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">عدد أفراد الأسرة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
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
              <CardTitle className="text-lg sm:text-xl">بيانات السكن</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                    value={currentBranch || ""}
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
                      <SelectItem value="custom">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  {currentBranch === "custom" && (
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
                        value={currentWarDamageDescription || ""}
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
                          <SelectItem value="custom">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {currentWarDamageDescription === "custom" && (
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
                    value={currentSocialStatus || ""}
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
                      <SelectItem value="polygamous">متعدد الزوجات</SelectItem>
                      <SelectItem value="divorced">مطلق</SelectItem>
                      <SelectItem value="widowed">أرملة</SelectItem>
                      <SelectItem value="custom">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  {currentSocialStatus === "custom" && (
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
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="w-full sm:w-auto order-2 sm:order-1 text-sm sm:text-base"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isLoading || updateFamilyMutation.isPending || createFamilyMutation.isPending}
                className="w-full sm:w-auto order-1 sm:order-2 text-sm sm:text-base"
              >
                {isLoading ? "جاري التحميل..." : (updateFamilyMutation.isPending || createFamilyMutation.isPending) ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteWifeId !== null} onOpenChange={(open) => !open && setDeleteWifeId(null)}>
        <AlertDialogContent className="w-[90vw] max-w-md mx-auto">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-lg sm:text-xl text-center">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base text-center">
              هل أنت متأكد من حذف هذه الزوجة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <AlertDialogCancel 
              onClick={() => setDeleteWifeId(null)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteWife}
              disabled={deleteWifeMutation.isPending}
              className="w-full sm:w-auto order-1 sm:order-2 bg-destructive hover:bg-destructive/90"
            >
              {deleteWifeMutation.isPending ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
