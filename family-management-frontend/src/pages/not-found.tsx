import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-3 sm:p-4 lg:p-6">
      <div className="text-center max-w-md mx-auto">
        <Card className="w-full shadow-lg">
          <CardContent className="p-6 sm:p-8 lg:p-10">
            <div className="mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-red-500" />
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">
                404
              </h1>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground mb-4 sm:mb-6">
                الصفحة غير موجودة
              </h2>
            </div>

            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
              عذراً، الصفحة التي تبحث عنها غير متوفرة أو ليس لديك صلاحية للوصول إليها.
            </p>

            <Link href="/">
              <Button className="w-full sm:w-auto px-6 py-2 sm:px-8 sm:py-3 text-sm sm:text-base">
                <Home className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                العودة للصفحة الرئيسية
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
