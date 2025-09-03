import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const requestSchema = z.object({
  type: z.enum(["financial", "medical", "damage"], { required_error: "نوع الطلب مطلوب" }),
  description: z.string().min(10, "الوصف يجب أن يكون 10 أحرف على الأقل"),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestFormProps {
  initialData?: Partial<RequestFormData>;
  onSubmit: (data: RequestFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

export default function RequestForm({ 
  initialData, 
  onSubmit, 
  onCancel,
  isLoading = false,
  isEdit = false 
}: RequestFormProps) {
  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: "financial",
      description: "",
      ...initialData,
    },
  });

  const handleSubmit = (data: RequestFormData) => {
    onSubmit(data);
  };

  const getRequestTypeDescription = (type: string) => {
    switch (type) {
      case "financial":
        return "طلب مساعدة مالية للأسرة (معونة شهرية، مساعدة طارئة، إلخ)";
      case "medical":
        return "طلب مساعدة طبية (علاج، أدوية، عمليات جراحية، إلخ)";
      case "damage":
        return "تقرير أضرار للممتلكات أو المنزل";
      default:
        return "";
    }
  };

  const selectedType = form.watch("type");

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="type">نوع الطلب *</Label>
        <Select
          value={form.watch("type")}
          onValueChange={(value: "financial" | "medical" | "damage") => form.setValue("type", value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="financial">مساعدة مالية</SelectItem>
            <SelectItem value="medical">مساعدة طبية</SelectItem>
            <SelectItem value="damage">تقرير أضرار</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.type && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.type.message}
          </p>
        )}
        
        {selectedType && (
          <p className="text-sm text-muted-foreground mt-2">
            {getRequestTypeDescription(selectedType)}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="description">وصف الطلب *</Label>
        <Textarea
          id="description"
          rows={6}
          placeholder={
            selectedType === "financial" 
              ? "يرجى وصف حالتكم المالية والمساعدة المطلوبة بالتفصيل..."
              : selectedType === "medical"
              ? "يرجى وصف الحالة الطبية والعلاج المطلوب بالتفصيل..."
              : selectedType === "damage"
              ? "يرجى وصف الأضرار التي لحقت بالممتلكات أو المنزل بالتفصيل..."
              : "يرجى وصف طلبكم بالتفصيل..."
          }
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive mt-1">
            {form.formState.errors.description.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          الحد الأدنى: 10 أحرف | الحالي: {form.watch("description").length} حرف
        </p>
      </div>

      {/* Guidelines based on request type */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">إرشادات مهمة:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {selectedType === "financial" && (
            <>
              <li>• وضح عدد أفراد الأسرة ومصادر الدخل الحالية</li>
              <li>• اذكر المبلغ المطلوب إن أمكن</li>
              <li>• وضح سبب الحاجة للمساعدة المالية</li>
            </>
          )}
          {selectedType === "medical" && (
            <>
              <li>• وضح اسم المريض وعمره</li>
              <li>• اذكر التشخيص الطبي إن وجد</li>
              <li>• وضح تكلفة العلاج المطلوب إن أمكن</li>
            </>
          )}
          {selectedType === "damage" && (
            <>
              <li>• وضح تاريخ حدوث الضرر</li>
              <li>• اذكر سبب الضرر (قصف، انهيار، إلخ)</li>
              <li>• وصف حجم الضرر ومدى تأثيره على الأسرة</li>
            </>
          )}
          <li>• سيتم مراجعة طلبكم والرد عليه خلال 3-5 أيام عمل</li>
          <li>• يمكنكم متابعة حالة الطلب من صفحة "الطلبات"</li>
        </ul>
      </div>

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
          {isLoading ? "جاري التقديم..." : isEdit ? "تحديث الطلب" : "تقديم الطلب"}
        </Button>
      </div>
    </form>
  );
}
