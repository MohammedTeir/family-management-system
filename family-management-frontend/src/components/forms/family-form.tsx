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
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
      {/* Husband Information */}
      <Card>
        <CardHeader>
          <CardTitle>بيانات رب الأسرة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="husbandName">الاسم الرباعي *</Label>
              <Input
                id="husbandName"
                disabled={!isEditable}
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
                disabled={!isEditable}
                {...form.register("husbandID")}
              />
              {form.formState.errors.husbandID && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.husbandID.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="husbandBirthDate">تاريخ الميلاد *</Label>
              <Input
                id="husbandBirthDate"
                type="date"
                disabled={!isEditable}
                {...form.register("husbandBirthDate")}
              />
              {form.formState.errors.husbandBirthDate && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.husbandBirthDate.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="husbandJob">المهنة *</Label>
              <Input
                id="husbandJob"
                disabled={!isEditable}
                {...form.register("husbandJob")}
              />
              {form.formState.errors.husbandJob && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.husbandJob.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="primaryPhone">رقم الجوال الأساسي *</Label>
              <Input
                id="primaryPhone"
                disabled={!isEditable}
                {...form.register("primaryPhone")}
              />
              {form.formState.errors.primaryPhone && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.primaryPhone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="secondaryPhone">رقم الجوال البديل</Label>
              <Input
                id="secondaryPhone"
                disabled={!isEditable}
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
                disabled={!isEditable}
                {...form.register("wifeName")}
              />
            </div>

            <div>
              <Label htmlFor="wifeID">رقم الهوية</Label>
              <Input
                id="wifeID"
                disabled={!isEditable}
                {...form.register("wifeID")}
              />
            </div>

            <div>
              <Label htmlFor="wifeBirthDate">تاريخ الميلاد</Label>
              <Input
                id="wifeBirthDate"
                type="date"
                disabled={!isEditable}
                {...form.register("wifeBirthDate")}
              />
            </div>

            <div>
              <Label htmlFor="wifeJob">المهنة</Label>
              <Input
                id="wifeJob"
                disabled={!isEditable}
                {...form.register("wifeJob")}
              />
            </div>

            <div>
              <Label htmlFor="wifePregnant">حالة الحمل</Label>
              <Input
                id="wifePregnant"
                disabled={!isEditable}
                placeholder="حامل - الشهر السادس"
                {...form.register("wifePregnant")}
              />
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
              <Label htmlFor="originalResidence">السكن الأصلي</Label>
              <Input
                id="originalResidence"
                disabled={!isEditable}
                {...form.register("originalResidence")}
              />
            </div>

            <div>
              <Label htmlFor="currentHousingStatus">السكن الحالي</Label>
              <Input
                id="currentHousingStatus"
                disabled={!isEditable}
                {...form.register("currentHousingStatus")}
              />
            </div>

            <div>
              <Label htmlFor="branch">الفرع/الموقع</Label>
              <Input
                id="branch"
                disabled={!isEditable}
                {...form.register("branch")}
              />
            </div>

            <div>
              <Label htmlFor="landmarkNear">أقرب معلم</Label>
              <Input
                id="landmarkNear"
                disabled={!isEditable}
                {...form.register("landmarkNear")}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="isDisplaced"
                disabled={!isEditable}
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
                  disabled={!isEditable}
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
              <Label htmlFor="isAbroad">مغترب بالخارج</Label>
            </div>

            <div>
              <Label htmlFor="warDamage2024">أضرار 2024</Label>
              <Textarea
                id="warDamage2024"
                disabled={!isEditable}
                {...form.register("warDamage2024")}
              />
            </div>

            <div>
              <Label htmlFor="socialStatus">الحالة الاجتماعية</Label>
              <Select
                disabled={!isEditable}
                value={form.watch("socialStatus") || ""}
                onValueChange={(value) => form.setValue("socialStatus", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="married">متزوج</SelectItem>
                  <SelectItem value="divorced">مطلق</SelectItem>
                  <SelectItem value="widowed">أرمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isEditable && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      )}
    </form>
  );
}
