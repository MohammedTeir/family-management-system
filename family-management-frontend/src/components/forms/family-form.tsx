import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  wifePregnant: z.string().optional(),
  originalResidence: z.string().optional(),
  currentHousingStatus: z.string().optional(),
  isDisplaced: z.boolean().default(false),
  displacedLocation: z.string().optional(),
  isAbroad: z.boolean().default(false),
  warDamage2024: z.string().optional(),
  branch: z.string().optional(),
  landmarkNear: z.string().optional(),
  socialStatus: z.string().optional(),
});

type FamilyFormData = z.infer<typeof familySchema>;

interface FamilyFormProps {
  initialData?: Partial<FamilyFormData>;
  onSubmit: (data: FamilyFormData) => void;
  isLoading?: boolean;
  isEditable?: boolean;
}

export default function FamilyForm({ 
  initialData, 
  onSubmit, 
  isLoading = false,
  isEditable = true 
}: FamilyFormProps) {
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
      wifePregnant: "",
      originalResidence: "",
      currentHousingStatus: "",
      isDisplaced: false,
      displacedLocation: "",
      isAbroad: false,
      warDamage2024: "",
      branch: "",
      landmarkNear: "",
      socialStatus: "",
      ...initialData,
    },
  });

  const handleSubmit = (data: FamilyFormData) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Husband Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">بيانات رب الأسرة</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="husbandName" className="text-sm sm:text-base font-medium">الاسم الرباعي *</Label>
              <Input
                id="husbandName"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("husbandName")}
              />
              {form.formState.errors.husbandName && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.husbandName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="husbandID" className="text-sm sm:text-base font-medium">رقم الهوية *</Label>
              <Input
                id="husbandID"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("husbandID")}
              />
              {form.formState.errors.husbandID && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.husbandID.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="husbandBirthDate" className="text-sm sm:text-base font-medium">تاريخ الميلاد *</Label>
              <Input
                id="husbandBirthDate"
                type="date"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("husbandBirthDate")}
              />
              {form.formState.errors.husbandBirthDate && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.husbandBirthDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="husbandJob" className="text-sm sm:text-base font-medium">المهنة *</Label>
              <Input
                id="husbandJob"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("husbandJob")}
              />
              {form.formState.errors.husbandJob && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.husbandJob.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="primaryPhone" className="text-sm sm:text-base font-medium">رقم الجوال الأساسي *</Label>
              <Input
                id="primaryPhone"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("primaryPhone")}
              />
              {form.formState.errors.primaryPhone && (
                <p className="text-xs sm:text-sm text-destructive mt-1">
                  {form.formState.errors.primaryPhone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="secondaryPhone" className="text-sm sm:text-base font-medium">رقم الجوال البديل</Label>
              <Input
                id="secondaryPhone"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("secondaryPhone")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wife Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">بيانات الزوجة</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="wifeName" className="text-sm sm:text-base font-medium">الاسم الرباعي</Label>
              <Input
                id="wifeName"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("wifeName")}
              />
            </div>

            <div>
              <Label htmlFor="wifeID" className="text-sm sm:text-base font-medium">رقم الهوية</Label>
              <Input
                id="wifeID"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("wifeID")}
              />
            </div>

            <div>
              <Label htmlFor="wifeBirthDate" className="text-sm sm:text-base font-medium">تاريخ الميلاد</Label>
              <Input
                id="wifeBirthDate"
                type="date"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("wifeBirthDate")}
              />
            </div>

            <div>
              <Label htmlFor="wifeJob" className="text-sm sm:text-base font-medium">المهنة</Label>
              <Input
                id="wifeJob"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("wifeJob")}
              />
            </div>

            <div>
              <Label htmlFor="wifePregnant" className="text-sm sm:text-base font-medium">حالة الحمل</Label>
              <Input
                id="wifePregnant"
                disabled={!isEditable}
                placeholder="حامل - الشهر السادس"
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("wifePregnant")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Housing Information */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-lg sm:text-xl">بيانات السكن</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Label htmlFor="originalResidence" className="text-sm sm:text-base font-medium">السكن الأصلي</Label>
              <Input
                id="originalResidence"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("originalResidence")}
              />
            </div>

            <div>
              <Label htmlFor="currentHousingStatus" className="text-sm sm:text-base font-medium">السكن الحالي</Label>
              <Input
                id="currentHousingStatus"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("currentHousingStatus")}
              />
            </div>

            <div>
              <Label htmlFor="branch" className="text-sm sm:text-base font-medium">الفرع/الموقع</Label>
              <Input
                id="branch"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("branch")}
              />
            </div>

            <div>
              <Label htmlFor="landmarkNear" className="text-sm sm:text-base font-medium">أقرب معلم</Label>
              <Input
                id="landmarkNear"
                disabled={!isEditable}
                className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                {...form.register("landmarkNear")}
              />
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="isDisplaced"
                disabled={!isEditable}
                checked={form.watch("isDisplaced")}
                onCheckedChange={(checked) => form.setValue("isDisplaced", checked)}
              />
              <Label htmlFor="isDisplaced" className="text-sm sm:text-base font-medium">أسرة نازحة</Label>
            </div>

            {form.watch("isDisplaced") && (
              <div>
                <Label htmlFor="displacedLocation" className="text-sm sm:text-base font-medium">موقع النزوح</Label>
                <Input
                  id="displacedLocation"
                  disabled={!isEditable}
                  className="h-10 sm:h-11 text-sm sm:text-base mt-1"
                  {...form.register("displacedLocation")}
                />
              </div>
            )}

            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="isAbroad"
                disabled={!isEditable}
                checked={form.watch("isAbroad")}
                onCheckedChange={(checked) => form.setValue("isAbroad", checked)}
              />
              <Label htmlFor="isAbroad" className="text-sm sm:text-base font-medium">مغترب بالخارج</Label>
            </div>

            <div>
              <Label htmlFor="warDamage2024" className="text-sm sm:text-base font-medium">أضرار 2024</Label>
              <Textarea
                id="warDamage2024"
                disabled={!isEditable}
                className="min-h-20 sm:min-h-24 text-sm sm:text-base mt-1"
                {...form.register("warDamage2024")}
              />
            </div>

            <div>
              <Label htmlFor="socialStatus" className="text-sm sm:text-base font-medium">الحالة الاجتماعية</Label>
              <Select
                disabled={!isEditable}
                value={form.watch("socialStatus") || ""}
                onValueChange={(value) => form.setValue("socialStatus", value)}
              >
                <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="married" className="text-sm sm:text-base">متزوج</SelectItem>
                  <SelectItem value="divorced" className="text-sm sm:text-base">مطلق</SelectItem>
                  <SelectItem value="widowed" className="text-sm sm:text-base">أرمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isEditable && (
        <div className="flex justify-end pt-2 sm:pt-4">
          <Button 
            type="submit" 
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-2 sm:px-8 sm:py-3 text-sm sm:text-base"
          >
            {isLoading ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      )}
    </form>
  );
}
