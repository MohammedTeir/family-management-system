import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const memberSchema = z.object({
  fullName: z.string().min(1, "الاسم مطلوب"),
  memberID: z.string().optional(), // Add memberID as optional
  birthDate: z.string().min(1, "تاريخ الميلاد مطلوب"),
  gender: z.enum(["male", "female"], { required_error: "النوع مطلوب" }),
  relationship: z.string().min(1, "القرابة مطلوبة"),
  isDisabled: z.boolean().default(false),
  disabilityType: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberFormProps {
  initialData?: Partial<MemberFormData>;
  onSubmit: (data: MemberFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export default function MemberForm({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading = false,
  isEdit = false 
}: MemberFormProps) {
  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: "",
      birthDate: "",
      gender: "male",
      relationship: "",
      isDisabled: false,
      disabilityType: "",
      ...initialData,
    },
  });

  const handleSubmit = (data: MemberFormData) => {
    onSubmit(data);
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 sm:space-y-4 lg:space-y-5">
      <div>
        <Label htmlFor="fullName" className="text-sm sm:text-base font-medium">الاسم الكامل *</Label>
        <Input
          id="fullName"
          placeholder="محمد فتح محمود أبو طير"
          className="h-10 sm:h-11 text-sm sm:text-base mt-1"
          {...form.register("fullName")}
        />
        {form.formState.errors.fullName && (
          <p className="text-xs sm:text-sm text-destructive mt-1">
            {form.formState.errors.fullName.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="memberID" className="text-sm sm:text-base font-medium">رقم الهوية</Label>
        <Input
          id="memberID"
          placeholder="رقم الهوية (اختياري)"
          className="h-10 sm:h-11 text-sm sm:text-base mt-1"
          {...form.register("memberID")}
        />
        {form.formState.errors.memberID && (
          <p className="text-xs sm:text-sm text-destructive mt-1">
            {form.formState.errors.memberID.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="birthDate" className="text-sm sm:text-base font-medium">تاريخ الميلاد *</Label>
        <Input
          id="birthDate"
          type="date"
          className="h-10 sm:h-11 text-sm sm:text-base mt-1"
          {...form.register("birthDate")}
        />
        {form.formState.errors.birthDate && (
          <p className="text-xs sm:text-sm text-destructive mt-1">
            {form.formState.errors.birthDate.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="gender" className="text-sm sm:text-base font-medium">النوع *</Label>
        <Select
          value={form.watch("gender")}
          onValueChange={(value: "male" | "female") => form.setValue("gender", value)}
        >
          <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male" className="text-sm sm:text-base">ذكر</SelectItem>
            <SelectItem value="female" className="text-sm sm:text-base">أنثى</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.gender && (
          <p className="text-xs sm:text-sm text-destructive mt-1">
            {form.formState.errors.gender.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="relationship" className="text-sm sm:text-base font-medium">القرابة *</Label>
        <Select
          value={form.watch("relationship")}
          onValueChange={(value) => form.setValue("relationship", value)}
        >
          <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
            <SelectValue placeholder="اختر القرابة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="son" className="text-sm sm:text-base">ابن</SelectItem>
            <SelectItem value="daughter" className="text-sm sm:text-base">ابنة</SelectItem>
            <SelectItem value="mother" className="text-sm sm:text-base">أم</SelectItem>
            <SelectItem value="father" className="text-sm sm:text-base">أب</SelectItem>
            <SelectItem value="brother" className="text-sm sm:text-base">أخ</SelectItem>
            <SelectItem value="sister" className="text-sm sm:text-base">أخت</SelectItem>
            <SelectItem value="grandfather" className="text-sm sm:text-base">جد</SelectItem>
            <SelectItem value="grandmother" className="text-sm sm:text-base">جدة</SelectItem>
            <SelectItem value="uncle" className="text-sm sm:text-base">عم</SelectItem>
            <SelectItem value="aunt" className="text-sm sm:text-base">عمة</SelectItem>
            <SelectItem value="other" className="text-sm sm:text-base">أخرى</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.relationship && (
          <p className="text-xs sm:text-sm text-destructive mt-1">
            {form.formState.errors.relationship.message}
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2 space-x-reverse py-1">
        <Switch
          id="isDisabled"
          checked={form.watch("isDisabled")}
          onCheckedChange={(checked) => form.setValue("isDisabled", checked)}
        />
        <Label htmlFor="isDisabled" className="text-sm sm:text-base font-medium">يعاني من إعاقة</Label>
      </div>

      {form.watch("isDisabled") && (
        <div>
          <Label htmlFor="disabilityType" className="text-sm sm:text-base font-medium">نوع الإعاقة</Label>
          <Input
            id="disabilityType"
            placeholder="اذكر نوع الإعاقة"
            className="h-10 sm:h-11 text-sm sm:text-base mt-1"
            {...form.register("disabilityType")}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 sm:space-x-reverse pt-4 sm:pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base order-2 sm:order-1"
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base order-1 sm:order-2"
        >
          {isLoading ? "جاري الحفظ..." : isEdit ? "تحديث" : "إضافة"}
        </Button>
      </div>
    </form>
  );
}
