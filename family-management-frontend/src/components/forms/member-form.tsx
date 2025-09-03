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
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="fullName">الاسم الكامل *</Label>
        <Input
          id="fullName"
          placeholder="محمد فتح محمود أبو طير"
          {...form.register("fullName")}
        />
        {form.formState.errors.fullName && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.fullName.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="memberID">رقم الهوية</Label>
        <Input
          id="memberID"
          placeholder="رقم الهوية (اختياري)"
          {...form.register("memberID")}
        />
        {form.formState.errors.memberID && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.memberID.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="birthDate">تاريخ الميلاد *</Label>
        <Input
          id="birthDate"
          type="date"
          {...form.register("birthDate")}
        />
        {form.formState.errors.birthDate && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.birthDate.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="gender">النوع *</Label>
        <Select
          value={form.watch("gender")}
          onValueChange={(value: "male" | "female") => form.setValue("gender", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">ذكر</SelectItem>
            <SelectItem value="female">أنثى</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.gender && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.gender.message}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="relationship">القرابة *</Label>
        <Select
          value={form.watch("relationship")}
          onValueChange={(value) => form.setValue("relationship", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر القرابة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="son">ابن</SelectItem>
            <SelectItem value="daughter">ابنة</SelectItem>
            <SelectItem value="mother">أم</SelectItem>
            <SelectItem value="father">أب</SelectItem>
            <SelectItem value="brother">أخ</SelectItem>
            <SelectItem value="sister">أخت</SelectItem>
            <SelectItem value="grandfather">جد</SelectItem>
            <SelectItem value="grandmother">جدة</SelectItem>
            <SelectItem value="uncle">عم</SelectItem>
            <SelectItem value="aunt">عمة</SelectItem>
            <SelectItem value="other">أخرى</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.relationship && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.relationship.message}
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2 space-x-reverse">
        <Switch
          id="isDisabled"
          checked={form.watch("isDisabled")}
          onCheckedChange={(checked) => form.setValue("isDisabled", checked)}
        />
        <Label htmlFor="isDisabled">يعاني من إعاقة</Label>
      </div>

      {form.watch("isDisabled") && (
        <div>
          <Label htmlFor="disabilityType">نوع الإعاقة</Label>
          <Input
            id="disabilityType"
            placeholder="اذكر نوع الإعاقة"
            {...form.register("disabilityType")}
          />
        </div>
      )}

      <div className="flex justify-end space-x-2 space-x-reverse pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "جاري الحفظ..." : isEdit ? "تحديث" : "إضافة"}
        </Button>
      </div>
    </form>
  );
}
