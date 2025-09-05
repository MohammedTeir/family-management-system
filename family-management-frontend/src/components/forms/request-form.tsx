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
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-5 lg:space-y-6">
      <div>
        <Label htmlFor="type" className="text-sm sm:text-base font-medium">نوع الطلب *</Label>
        <Select
          value={form.watch("type")}
          onValueChange={(value: "financial" | "medical" | "damage") => form.setValue("type", value)}
        >
          <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="financial" className="text-sm sm:text-base">مساعدة مالية</SelectItem>
            <SelectItem value="medical" className="text-sm sm:text-base">مساعدة طبية</SelectItem>
            <SelectItem value="damage" className="text-sm sm:text-base">تقرير أضرار</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.type && (
          <p className="text-xs sm:text-sm text-destructive mt-1">
            {form.formState.errors.type.message}
          </p>
        )}
        
        {selectedType && (
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
            {getRequestTypeDescription(selectedType)}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="description" className="text-sm sm:text-base font-medium">وصف الطلب *</Label>
        <Textarea
          id="description"
          rows={4}
          className="min-h-24 sm:min-h-32 lg:min-h-40 text-sm sm:text-base mt-1 resize-y"
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
          <p className="text-xs sm:text-sm text-destructive mt-1">
            {form.formState.errors.description.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          الحد الأدنى: 10 أحرف | الحالي: {form.watch("description").length} حرف
        </p>
      </div>

      {/* Guidelines based on request type */}
      <div className="bg-blue-50 p-3 sm:p-4 lg:p-5 rounded-lg border border-blue-200">
        <h4 className="font-medium text-sm sm:text-base text-blue-900 mb-2 sm:mb-3">إرشادات مهمة:</h4>
        <ul className="text-xs sm:text-sm text-blue-800 space-y-1 sm:space-y-1.5">
          {selectedType === "financial" && (
            <>
              <li className="leading-relaxed">• وضح عدد أفراد الأسرة ومصادر الدخل الحالية</li>
              <li className="leading-relaxed">• اذكر المبلغ المطلوب إن أمكن</li>
              <li className="leading-relaxed">• وضح سبب الحاجة للمساعدة المالية</li>
            </>
          )}
          {selectedType === "medical" && (
            <>
              <li className="leading-relaxed">• وضح اسم المريض وعمره</li>
              <li className="leading-relaxed">• اذكر التشخيص الطبي إن وجد</li>
              <li className="leading-relaxed">• وضح تكلفة العلاج المطلوب إن أمكن</li>
            </>
          )}
          {selectedType === "damage" && (
            <>
              <li className="leading-relaxed">• وضح تاريخ حدوث الضرر</li>
              <li className="leading-relaxed">• اذكر سبب الضرر (قصف، انهيار، إلخ)</li>
              <li className="leading-relaxed">• وصف حجم الضرر ومدى تأثيره على الأسرة</li>
            </>
          )}
          <li className="leading-relaxed">• سيتم مراجعة طلبكم والرد عليه خلال 3-5 أيام عمل</li>
          <li className="leading-relaxed">• يمكنكم متابعة حالة الطلب من صفحة "الطلبات"</li>
        </ul>
      </div>

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
          {isLoading ? "جاري التقديم..." : isEdit ? "تحديث الطلب" : "تقديم الطلب"}
        </Button>
      </div>
    </form>
  );
}
