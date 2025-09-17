import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Users } from "lucide-react";

export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center p-3 sm:p-4 lg:p-6">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Mobile Hero Section Skeleton */}
        <div className="flex lg:hidden flex-col justify-center items-center text-center p-4 sm:p-6 mb-4">
          <div className="mb-6">
            <div className="mb-4 mx-auto flex items-center justify-center">
              <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full" />
            </div>
            <Skeleton className="h-8 w-64 mx-auto mb-2 sm:mb-4" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
        </div>
        
        {/* Desktop Hero Section Skeleton */}
        <div className="hidden lg:flex flex-col justify-center items-center text-center p-8">
          <div className="mb-8">
            <div className="mb-6 mx-auto flex items-center justify-center">
              <Skeleton className="h-20 w-20 lg:h-24 lg:w-24 rounded-full" />
            </div>
            <Skeleton className="h-10 w-80 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto mb-8" />
          </div>
          
          <div className="grid grid-cols-1 gap-6 max-w-md">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center p-4 bg-card border rounded-lg shadow-sm">
                <Skeleton className="h-8 w-8 rounded-md ml-4 flex-shrink-0" />
                <div className="text-right flex-1">
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Auth Forms Skeleton */}
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center p-4 sm:p-6">
              <Skeleton className="h-7 w-24 mx-auto mb-2" />
              <Skeleton className="h-4 w-32 mx-auto" />
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="w-full">
                <Skeleton className="h-10 w-full mb-6 rounded-md" />
                
                <div className="space-y-4 sm:space-y-5">
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-10 sm:h-11 w-full" />
                  </div>
                  
                  <div>
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-10 sm:h-11 w-full" />
                  </div>
                  
                  <div>
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-10 sm:h-11 w-full" />
                  </div>

                  <Skeleton className="h-10 sm:h-11 w-full mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}