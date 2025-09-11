import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

export function FamiliesSkeleton() {
  return (
    <div className="space-y-6 max-w-full min-w-0">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Statistics cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="mr-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and filters skeleton */}
      <Card className="mb-8">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search field skeleton */}
            <div className="flex justify-center">
              <div className="relative w-full max-w-md">
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            </div>
            {/* Filter dropdowns skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <Skeleton className="h-4 w-16 mb-1" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Families table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-w-full">
            <div className="w-full min-w-full">
              {/* Table header */}
              <div className="grid grid-cols-6 gap-4 py-3 border-b">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              
              {/* Table rows */}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 py-4 border-b hover:bg-muted">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                  <div className="text-center space-y-1">
                    <Skeleton className="h-4 w-8 mx-auto" />
                    <Skeleton className="h-3 w-20 mx-auto" />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Skeleton className="h-5 w-12 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination skeleton */}
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export controls skeleton */}
      <Card className="mb-6 max-w-full">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-80 mt-2" />
        </CardHeader>
        <CardContent className="max-w-full overflow-hidden">
          <div className="flex gap-2 mb-2 justify-end flex-wrap">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-12 w-40 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}