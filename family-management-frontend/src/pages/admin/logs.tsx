import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Activity } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { PageWrapper } from "@/components/layout/page-wrapper";

const PAGE_SIZE = 20;

export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["/api/admin/logs", { page, search, type: typeFilter }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("pageSize", String(PAGE_SIZE));
      if (search) params.append("search", search);
      if (typeFilter !== "all") params.append("type", typeFilter);
      const res = await fetchApi(`/api/admin/logs?${params.toString()}`);
      if (!res.ok) throw new Error("فشل في تحميل السجلات");
      return res.json();
    },
    keepPreviousData: true,
  });

  const { settings } = useSettings();

  useEffect(() => {
    if (settings.siteTitle) {
      document.title = settings.siteTitle;
    }
    if (settings.language) {
      document.documentElement.lang = settings.language;
      document.body.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [settings.siteTitle, settings.language]);

  // Extract unique log types for filter dropdown
  const logTypes = Array.from(
    new Set(logs?.map((log: any) => log.type).filter(Boolean))
  );

  return (
    <PageWrapper>
      <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Activity className="inline-block ml-2" />
                سجل النشاطات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                <Input
                  placeholder="بحث في الرسائل أو المستخدم..."
                  value={search}
                  onChange={e => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  className="max-w-xs"
                />
                <Select
                  value={typeFilter}
                  onValueChange={(value) => {
                    setPage(1);
                    setTypeFilter(value);
                  }}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="كل الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأنواع</SelectItem>
                    {logTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">جاري تحميل السجلات...</div>
              ) : logs && logs.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full bg-card">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">النوع</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">الرسالة</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">المستخدم</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {logs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-muted">
                          <td className="px-4 py-2 text-sm text-foreground">{log.id}</td>
                          <td className="px-4 py-2">
                            <Badge variant="secondary">{log.type}</Badge>
                          </td>
                          <td className="px-4 py-2 text-sm text-foreground">{log.message}</td>
                          <td className="px-4 py-2 text-sm text-foreground">
                            {log.user
                              ? `${log.user.username} (${log.user.role === "root" ? "مشرف رئيسي" : log.user.role === "admin" ? "مشرف" : "مستخدم"})`
                              : "—"}
                          </td>
                          <td className="px-4 py-2 text-sm text-muted-foreground">{formatDate(log.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">لا توجد سجلات.</div>
              )}
              {/* Pagination */}
              <div className="flex justify-center items-center gap-4 mt-6">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  السابق
                </Button>
                <span className="text-foreground">صفحة {page}</span>
                <Button
                  variant="outline"
                  disabled={!logs || logs.length < PAGE_SIZE}
                  onClick={() => setPage(p => p + 1)}
                >
                  التالي
                </Button>
              </div>
            </CardContent>
          </Card>
              </div>
    </PageWrapper>
  );
} 