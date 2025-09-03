import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Edit2, Plus, Trash2, ArrowLeft, Users } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRelationshipInArabic, getGenderInArabic, calculateDetailedAge } from "@/lib/utils";
import { PageWrapper } from "@/components/layout/page-wrapper";

const BRANCHES = [
  { value: "abouda_abunasr", label: "عائلة ابوعودة + ابو نصر" },
  { value: "married_daughters_displaced", label: "بنات العائلة متزوجات خارج العائلة, نازحين عند عائلة ابو طير" },
  { value: "alnogra", label: "النقرة" },
  { value: "abushalbia_abumatar", label: "ابو شلبية + ابو مطر" },
  { value: "custom", label: "أخرى (حدد)" },
];
const SOCIAL_STATUSES = [
  { value: "married", label: "متزوج" },
  { value: "divorced", label: "مطلق" },
  { value: "widowed", label: "أرمل" },
  { value: "custom", label: "أخرى (حدد)" },
];
const DAMAGE_DESCRIPTIONS = [
  { value: "total_destruction_uninhabitable", label: "هدم كلي غير قابل للسكن" },
  { value: "partial_destruction_habitable", label: "هدم جزئي قابل للسكن" },
  { value: "minor_damage", label: "أضرار بسيطة" },
  { value: "custom", label: "أخرى (حدد)" },
];
const RELATIONSHIPS = [
  { value: "son", label: "ابن" },
  { value: "daughter", label: "ابنة" },
  { value: "mother", label: "أم" },
  { value: "father", label: "أب" },
  { value: "brother", label: "أخ" },
  { value: "sister", label: "أخت" },
  { value: "grandfather", label: "جد" },
  { value: "grandmother", label: "جدة" },
  { value: "uncle", label: "عم" },
  { value: "aunt", label: "عمة" },
  { value: "other", label: "أخرى (حدد)" },
];

export default function AdminFamilyEdit({ params }: { params: { id: string } }) {
  const id = params?.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState("family");
  const [editingMember, setEditingMember] = useState<any>(null);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  // Custom fields for family
  const [customBranch, setCustomBranch] = useState("");
  const [customSocialStatus, setCustomSocialStatus] = useState("");
  const [customDamageDescription, setCustomDamageDescription] = useState("");
  // Custom fields for member
  const [customRelationship, setCustomRelationship] = useState("");
  const [showCustomRelationship, setShowCustomRelationship] = useState(false);
  const [showDisabilityType, setShowDisabilityType] = useState(false);
  const [customDisabilityType, setCustomDisabilityType] = useState("");

  // Fetch family details by ID
  const { data: family, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/families", id],
    queryFn: async () => {
      const res = await fetchApi(`/api/admin/families/${id}`);
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
    enabled: !!id,
  });

  // Set custom fields from loaded data
  useEffect(() => {
    if (family) {
      if (family.branch && !BRANCHES.some(b => b.value === family.branch)) {
        setCustomBranch(family.branch);
      }
      if (family.socialStatus && !SOCIAL_STATUSES.some(s => s.value === family.socialStatus)) {
        setCustomSocialStatus(family.socialStatus);
      }
      if (family.warDamageDescription && !DAMAGE_DESCRIPTIONS.some(d => d.value === family.warDamageDescription)) {
        setCustomDamageDescription(family.warDamageDescription);
      }
    }
  }, [family]);

  // Update family mutation
  const updateFamilyMutation = useMutation({
    mutationFn: async (data: any) => {
      // Replace custom fields if needed
      if (data.branch === "custom") data.branch = customBranch;
      if (data.socialStatus === "custom") data.socialStatus = customSocialStatus;
      if (data.warDamageDescription === "custom") data.warDamageDescription = customDamageDescription;
      const res = await fetchApi(`/api/admin/families/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const contentType = res.headers.get("content-type");
      if (!res.ok) {
        let errorMsg = "فشل في تحديث بيانات الأسرة";
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await res.json();
            errorMsg = errorData.message || errorMsg;
          } catch {}
        }
        throw new Error(errorMsg);
      }
      if (contentType && contentType.includes("application/json")) {
        return res.json();
      }
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تم التحديث بنجاح", description: "تم حفظ بيانات الأسرة" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
    },
  });

  // Member mutations
  const createMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.relationship === "other") data.relationship = customRelationship;
      if (data.isDisabled && data.disabilityType === "custom") data.disabilityType = customDisabilityType;
      const res = await fetchApi(`/api/admin/families/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("فشل في إضافة الفرد");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تمت إضافة الفرد", description: "تمت إضافة الفرد بنجاح" });
      setIsMemberDialogOpen(false);
      setEditingMember(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الإضافة", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, data }: { memberId: number; data: any }) => {
      if (data.relationship === "other") data.relationship = customRelationship;
      if (data.isDisabled && data.disabilityType === "custom") data.disabilityType = customDisabilityType;
      const res = await fetchApi(`/api/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("فشل في تحديث بيانات الفرد");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تم التحديث", description: "تم تحديث بيانات الفرد" });
      setIsMemberDialogOpen(false);
      setEditingMember(null);
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const res = await fetchApi(`/api/members/${memberId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في حذف الفرد");
      // Only parse JSON if there is content
      if (res.status !== 204) return res.json();
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/families", id] });
      toast({ title: "تم الحذف", description: "تم حذف الفرد بنجاح" });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
    },
  });

  // Handle custom relationship and disability type for member form
  useEffect(() => {
    if (editingMember) {
      setShowCustomRelationship(!RELATIONSHIPS.some(r => r.value === editingMember.relationship));
      setCustomRelationship(editingMember.relationship && !RELATIONSHIPS.some(r => r.value === editingMember.relationship) ? editingMember.relationship : "");
      setShowDisabilityType(editingMember.isDisabled);
      setCustomDisabilityType(editingMember.disabilityType || "");
    } else {
      setShowCustomRelationship(false);
      setCustomRelationship("");
      setShowDisabilityType(false);
      setCustomDisabilityType("");
    }
  }, [editingMember]);

  // Family form state
  const [familyForm, setFamilyForm] = useState<any>(null);

  // When family data loads or changes, update the form state
  useEffect(() => {
    if (family) setFamilyForm({ ...family });
  }, [family]);

  // Handle family form changes
  function handleFamilyChange(e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string; type?: string; checked?: boolean } }) {
    const { name, value, type, checked } = e.target;
    setFamilyForm((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked
        : ["totalMembers", "numMales", "numFemales"].includes(name)
          ? value === "" ? "" : Number(value)
          : value,
    }));
    if (name === "branch" && value === "custom") setCustomBranch("");
    if (name === "socialStatus" && value === "custom") setCustomSocialStatus("");
    if (name === "warDamageDescription" && value === "custom") setCustomDamageDescription("");
  }

  // Handle family form submit
  function handleFamilySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateFamilyMutation.mutate({
      ...familyForm,
      totalMembers: Number(familyForm.totalMembers),
      numMales: Number(familyForm.numMales),
      numFemales: Number(familyForm.numFemales),
      branch: familyForm.branch === "custom" ? customBranch : familyForm.branch,
      socialStatus: familyForm.socialStatus === "custom" ? customSocialStatus : familyForm.socialStatus,
      warDamageDescription: familyForm.warDamageDescription === "custom" ? customDamageDescription : familyForm.warDamageDescription,
    });
  }

  if (isLoading || !familyForm) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">جاري تحميل بيانات الأسرة...</div>
        </div>
      </PageWrapper>
    );
  }

  if (!family) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">لا توجد بيانات متاحة لهذه الأسرة.</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="space-y-6" dir="rtl">
          {/* Top right button for families page */}
          <div className="flex flex-row-reverse justify-end mb-4 w-full">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/families")}
              className="flex flex-row-reverse items-center"
            >
              <ArrowLeft className="h-5 w-5 ml-2" /> عودة لقائمة الأسر
            </Button>
          </div>
          {/* Tabs and title bar */}
          <div className="mb-6 flex flex-row-reverse items-center justify-between w-full">
            <div className="flex flex-row-reverse items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground ml-4">
                تعديل بيانات الأسرة <Badge className="bg-blue-100 text-blue-800">#{family.id}</Badge>
              </h1>
            </div>
            <Tabs value={tab} onValueChange={setTab} className="mb-0">
              <TabsList className="flex flex-row-reverse gap-2">
                <TabsTrigger value="family">بيانات الأسرة</TabsTrigger>
                <TabsTrigger value="members">أفراد الأسرة</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Tabs value={tab} onValueChange={setTab} className="mb-8">
            <TabsContent value="family">
              <Card className="mb-8 border-blue-200 shadow-md">
                <CardHeader className="flex flex-row-reverse items-center gap-4">
                  <CardTitle className="flex items-center gap-2 text-blue-900">تعديل بيانات الأسرة <Badge className="bg-blue-200 text-blue-900">#{family.id}</Badge></CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFamilySubmit} className="space-y-8">
                    {/* Husband Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col items-end">
                        <Label htmlFor="husbandName" className="text-right w-full mb-1">الاسم الرباعي *</Label>
                        <Input id="husbandName" name="husbandName" value={familyForm.husbandName || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="husbandID" className="text-right w-full mb-1">رقم الهوية *</Label>
                        <Input id="husbandID" name="husbandID" value={familyForm.husbandID || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="husbandBirthDate" className="text-right w-full mb-1">تاريخ الميلاد *</Label>
                        <Input id="husbandBirthDate" name="husbandBirthDate" type="date" value={familyForm.husbandBirthDate || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="husbandJob" className="text-right w-full mb-1">المهنة *</Label>
                        <Input id="husbandJob" name="husbandJob" value={familyForm.husbandJob || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="primaryPhone" className="text-right w-full mb-1">رقم الجوال الأساسي *</Label>
                        <Input id="primaryPhone" name="primaryPhone" value={familyForm.primaryPhone || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="secondaryPhone" className="text-right w-full mb-1">رقم الجوال البديل</Label>
                        <Input id="secondaryPhone" name="secondaryPhone" value={familyForm.secondaryPhone || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                      </div>
                    </div>
                    {/* Wife Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col items-end">
                        <Label htmlFor="wifeName" className="text-right w-full mb-1">اسم الزوجة</Label>
                        <Input id="wifeName" name="wifeName" value={familyForm.wifeName || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="wifeID" className="text-right w-full mb-1">رقم هوية الزوجة</Label>
                        <Input id="wifeID" name="wifeID" value={familyForm.wifeID || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="wifeBirthDate" className="text-right w-full mb-1">تاريخ ميلاد الزوجة</Label>
                        <Input id="wifeBirthDate" name="wifeBirthDate" type="date" value={familyForm.wifeBirthDate || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="wifeJob" className="text-right w-full mb-1">مهنة الزوجة</Label>
                        <Input id="wifeJob" name="wifeJob" value={familyForm.wifeJob || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="wifePregnant" className="text-right w-full mb-1">حامل؟</Label>
                        <div className="mt-1"><Switch id="wifePregnant" name="wifePregnant" checked={!!familyForm.wifePregnant} onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, wifePregnant: checked }))} /></div>
                      </div>
                    </div>
                    {/* Family Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col items-end">
                        <Label htmlFor="originalResidence" className="text-right w-full mb-1">السكن الأصلي *</Label>
                        <Input id="originalResidence" name="originalResidence" value={familyForm.originalResidence || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="currentHousing" className="text-right w-full mb-1">السكن الحالي *</Label>
                        <Input id="currentHousing" name="currentHousing" value={familyForm.currentHousing || ""} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="landmarkNear" className="text-right w-full mb-1">أقرب معلم</Label>
                        <Input id="landmarkNear" name="landmarkNear" value={familyForm.landmarkNear || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="branch" className="text-right w-full mb-1">الفرع</Label>
                        <div className="mt-1 w-full">
                          <Select value={BRANCHES.some(b => b.value === familyForm.branch) ? familyForm.branch : "custom"} onValueChange={val => handleFamilyChange({ target: { name: "branch", value: val } })}>
                            <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                            <SelectContent>
                              {BRANCHES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {(familyForm.branch === "custom" || !BRANCHES.some(b => b.value === familyForm.branch)) && (
                          <Input className="mt-2 text-right" placeholder="أدخل الفرع" value={customBranch || familyForm.branch} onChange={e => setCustomBranch(e.target.value)} />
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="socialStatus" className="text-right w-full mb-1">الحالة الاجتماعية</Label>
                        <div className="mt-1 w-full">
                          <Select value={SOCIAL_STATUSES.some(s => s.value === familyForm.socialStatus) ? familyForm.socialStatus : "custom"} onValueChange={val => handleFamilyChange({ target: { name: "socialStatus", value: val } })}>
                            <SelectTrigger><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                            <SelectContent>
                              {SOCIAL_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {(familyForm.socialStatus === "custom" || !SOCIAL_STATUSES.some(s => s.value === familyForm.socialStatus)) && (
                          <Input className="mt-2 text-right" placeholder="أدخل الحالة الاجتماعية" value={customSocialStatus || familyForm.socialStatus} onChange={e => setCustomSocialStatus(e.target.value)} />
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="warDamageDescription" className="text-right w-full mb-1">وصف الضرر</Label>
                        <div className="mt-1 w-full">
                          <Select value={DAMAGE_DESCRIPTIONS.some(d => d.value === familyForm.warDamageDescription) ? familyForm.warDamageDescription : "custom"} onValueChange={val => handleFamilyChange({ target: { name: "warDamageDescription", value: val } })}>
                            <SelectTrigger><SelectValue placeholder="اختر وصف الضرر" /></SelectTrigger>
                            <SelectContent>
                              {DAMAGE_DESCRIPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {(familyForm.warDamageDescription === "custom" || !DAMAGE_DESCRIPTIONS.some(d => d.value === familyForm.warDamageDescription)) && (
                          <Input className="mt-2 text-right" placeholder="أدخل وصف الضرر" value={customDamageDescription || familyForm.warDamageDescription} onChange={e => setCustomDamageDescription(e.target.value)} />
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="isDisplaced" className="text-right w-full mb-1">نازح؟</Label>
                        <div className="mt-1"><Switch id="isDisplaced" name="isDisplaced" checked={!!familyForm.isDisplaced} onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, isDisplaced: checked }))} /></div>
                      </div>
                      {familyForm.isDisplaced && (
                        <div className="flex flex-col items-end">
                          <Label htmlFor="displacedLocation" className="text-right w-full mb-1">مكان النزوح</Label>
                          <Input id="displacedLocation" name="displacedLocation" value={familyForm.displacedLocation || ""} onChange={handleFamilyChange} className="text-right mt-1" />
                        </div>
                      )}
                      <div className="flex flex-col items-end">
                        <Label htmlFor="isAbroad" className="text-right w-full mb-1">مغترب؟</Label>
                        <div className="mt-1"><Switch id="isAbroad" name="isAbroad" checked={!!familyForm.isAbroad} onCheckedChange={(checked: boolean) => setFamilyForm((f: any) => ({ ...f, isAbroad: checked }))} /></div>
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="totalMembers" className="text-right w-full mb-1">عدد الأفراد *</Label>
                        <Input id="totalMembers" name="totalMembers" type="number" value={familyForm.totalMembers || 0} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="numMales" className="text-right w-full mb-1">عدد الذكور *</Label>
                        <Input id="numMales" name="numMales" type="number" value={familyForm.numMales || 0} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                      <div className="flex flex-col items-end">
                        <Label htmlFor="numFemales" className="text-right w-full mb-1">عدد الإناث *</Label>
                        <Input id="numFemales" name="numFemales" type="number" value={familyForm.numFemales || 0} onChange={handleFamilyChange} required className="text-right mt-1" />
                      </div>
                    </div>
                    <div className="flex justify-end mt-8">
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={updateFamilyMutation.isPending}>
                        {updateFamilyMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="members">
              <Card className="border-green-200 shadow-md">
                <CardHeader className="flex flex-row-reverse items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-900"><Users className="h-5 w-5 ml-1 text-green-600" /> أفراد الأسرة</CardTitle>
                  <Button onClick={() => { setEditingMember(null); setIsMemberDialogOpen(true); }} className="bg-green-600 hover:bg-green-700 text-white"><Plus className="h-4 w-4 ml-2" /> إضافة فرد</Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-background">
                        <tr>
                          <th className="px-3 py-2">الاسم</th>
                          <th className="px-3 py-2">الجنس</th>
                          <th className="px-3 py-2">القرابة</th>
                          <th className="px-3 py-2">تاريخ الميلاد</th>
                          <th className="px-3 py-2">العمر</th>
                          <th className="px-3 py-2">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {family.members && family.members.length > 0 ? family.members.map((member: any) => (
                          <tr key={member.id} className="border-b hover:bg-background">
                            <td className="px-3 py-2 font-medium">{member.fullName}</td>
                            <td className="px-3 py-2"><Badge className={member.gender === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}>{getGenderInArabic(member.gender)}</Badge></td>
                            <td className="px-3 py-2"><Badge className="bg-muted text-foreground">{getRelationshipInArabic(member.relationship)}</Badge></td>
                            <td className="px-3 py-2">{member.birthDate || 'غير محدد'}</td>
                            <td className="px-3 py-2">{member.birthDate ? <Badge className="bg-green-100 text-green-800">{calculateDetailedAge(member.birthDate)}</Badge> : '-'}</td>
                            <td className="px-3 py-2 flex gap-2 justify-end">
                              <Button size="sm" variant="outline" onClick={() => { setEditingMember(member); setIsMemberDialogOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteMemberMutation.mutate(member.id)}><Trash2 className="h-4 w-4" /></Button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={6} className="text-center text-muted-foreground py-4">لا يوجد أفراد مسجلين لهذه الأسرة.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {/* Member Dialog */}
                  {isMemberDialogOpen && (
                    <MemberFormModal
                      initialData={editingMember}
                      onSubmit={editingMember ? (data: any) => updateMemberMutation.mutate({ memberId: editingMember.id, data }) : createMemberMutation.mutate}
                      isLoading={createMemberMutation.isPending || updateMemberMutation.isPending}
                      isEdit={!!editingMember}
                      onCancel={() => { setIsMemberDialogOpen(false); setEditingMember(null); }}
                      customRelationship={customRelationship}
                      setCustomRelationship={setCustomRelationship}
                      showCustomRelationship={showCustomRelationship}
                      setShowCustomRelationship={setShowCustomRelationship}
                      showDisabilityType={showDisabilityType}
                      setShowDisabilityType={setShowDisabilityType}
                      customDisabilityType={customDisabilityType}
                      setCustomDisabilityType={setCustomDisabilityType}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
              </div>
    </PageWrapper>
  );
}

// MemberFormModal is a custom modal for member add/edit, using the same logic as dashboard/member-form
interface MemberFormModalProps {
  initialData: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  isEdit: boolean;
  customRelationship: string;
  setCustomRelationship: (val: string) => void;
  showCustomRelationship: boolean;
  setShowCustomRelationship: (val: boolean) => void;
  showDisabilityType: boolean;
  setShowDisabilityType: (val: boolean) => void;
  customDisabilityType: string;
  setCustomDisabilityType: (val: string) => void;
}
function MemberFormModal({ initialData, onSubmit, onCancel, isLoading, isEdit, customRelationship, setCustomRelationship, showCustomRelationship, setShowCustomRelationship, showDisabilityType, setShowDisabilityType, customDisabilityType, setCustomDisabilityType }: MemberFormModalProps) {
  const [form, setForm] = useState({
    fullName: initialData?.fullName || "",
    memberID: initialData?.memberID || "",
    birthDate: initialData?.birthDate || "",
    gender: initialData?.gender || "male",
    relationship: RELATIONSHIPS.some(r => r.value === initialData?.relationship) ? initialData?.relationship : (initialData?.relationship ? "other" : "son"),
    isDisabled: initialData?.isDisabled || false,
    disabilityType: initialData?.disabilityType || "",
  });

  useEffect(() => {
    setShowCustomRelationship(form.relationship === "other");
  }, [form.relationship, setShowCustomRelationship]);

  useEffect(() => {
    setShowDisabilityType(form.isDisabled);
  }, [form.isDisabled, setShowDisabilityType]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (name === "relationship" && value === "other") setCustomRelationship("");
    if (name === "isDisabled" && !checked) setCustomDisabilityType("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit({
      ...form,
      relationship: form.relationship === "other" ? customRelationship : form.relationship,
      disabilityType: showDisabilityType ? customDisabilityType : "",
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg" dir="rtl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="fullName">الاسم الكامل *</Label>
              <Input id="fullName" name="fullName" value={form.fullName} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="memberID">رقم الهوية</Label>
              <Input id="memberID" name="memberID" value={form.memberID} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="birthDate">تاريخ الميلاد *</Label>
              <Input id="birthDate" name="birthDate" type="date" value={form.birthDate} onChange={handleChange} required />
            </div>
            <div>
              <Label htmlFor="gender">الجنس *</Label>
              <Select value={form.gender} onValueChange={val => setForm(f => ({ ...f, gender: val }))}>
                <SelectTrigger><SelectValue placeholder="اختر الجنس" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">ذكر</SelectItem>
                  <SelectItem value="female">أنثى</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="relationship">القرابة *</Label>
              <Select value={form.relationship} onValueChange={val => setForm(f => ({ ...f, relationship: val }))}>
                <SelectTrigger><SelectValue placeholder="اختر القرابة" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {showCustomRelationship && (
                <Input className="mt-2" placeholder="أدخل القرابة" value={customRelationship} onChange={e => setCustomRelationship(e.target.value)} />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch id="isDisabled" name="isDisabled" checked={form.isDisabled} onCheckedChange={checked => setForm(f => ({ ...f, isDisabled: checked }))} />
              <Label htmlFor="isDisabled">يعاني من إعاقة</Label>
            </div>
            {showDisabilityType && (
              <div>
                <Label htmlFor="disabilityType">نوع الإعاقة</Label>
                <Input id="disabilityType" name="disabilityType" value={customDisabilityType} onChange={e => setCustomDisabilityType(e.target.value)} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>إلغاء</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={isLoading}>
              {isLoading ? "جاري الحفظ..." : isEdit ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
 