import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Statistics cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center">
                <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-lg" />
                <div className="mr-3 md:mr-4 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions and stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent requests table skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter skeleton */}
            <div className="space-y-3 md:space-y-0 md:flex md:flex-wrap gap-2">
              <Skeleton className="h-10 w-full md:w-60" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            
            {/* Table skeleton */}
            <div className="overflow-x-auto">
              <div className="w-full">
                {/* Table header */}
                <div className="grid grid-cols-5 gap-4 py-3 border-b">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16 hidden md:block" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                
                {/* Table rows */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 py-4 border-b">
                    <Skeleton className="h-4 w-12" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16 md:hidden" />
                    </div>
                    <Skeleton className="h-4 w-20 hidden md:block" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <div className="flex gap-1">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-center">
          <Skeleton className="h-10 w-10 md:h-12 md:w-12 rounded-lg" />
          <div className="mr-3 md:mr-4 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b">
      <td className="px-3 md:px-6 py-4">
        <Skeleton className="h-4 w-12" />
      </td>
      <td className="px-3 md:px-6 py-4">
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16 md:hidden" />
        </div>
      </td>
      <td className="px-3 md:px-6 py-4 hidden md:table-cell">
        <Skeleton className="h-4 w-20" />
      </td>
      <td className="px-3 md:px-6 py-4">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>
      <td className="px-3 md:px-6 py-4">
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </td>
    </tr>
  );
}