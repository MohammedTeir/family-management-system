import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { calculateAge, getGenderInArabic, getRelationshipInArabic, calculateDetailedAge } from "@/lib/utils";
import MemberForm from "@/components/forms/member-form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { PageWrapper } from "@/components/layout/page-wrapper";

const memberSchema = z.object({
  fullName: z.string().min(1, "الاسم مطلوب"),
  birthDate: z.string().min(1, "تاريخ الميلاد مطلوب"),
  gender: z.enum(["male", "female"], { required_error: "نوع الجنس مطلوب" }),
  relationship: z.string().min(1, "القرابة مطلوبة"),
  isDisabled: z.boolean().default(false),
  disabilityType: z.string().optional(),
});

type MemberFormData = z.infer<typeof memberSchema>;

export default function FamilyMembers() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [deleteMember, setDeleteMember] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: family, isLoading: familyLoading } = useQuery({
    queryKey: ["/api/family"],
  });

  const members = family?.members || [];
  
  const totalMembers = members.length;
  const maleCount = members.filter((m: any) => m.gender === 'male').length;
  const femaleCount = members.filter((m: any) => m.gender === 'female').length;

  const storedTotalMembers = family?.totalMembers || 0;
  const storedNumMales = family?.numMales || 0;
  const storedNumFemales = family?.numFemales || 0;

  const form = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      fullName: "",
      birthDate: "",
      gender: "male",
      relationship: "",
      isDisabled: false,
      disabilityType: "",
    },
  });

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingMember(null);
      form.reset({
        fullName: "",
        birthDate: "",
        gender: "male",
        relationship: "",
        isDisabled: false,
        disabilityType: "",
      });
    }
  };

  const createMemberMutation = useMutation({
    mutationFn: async (data: MemberFormData) => {
      const response = await fetchApi("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create member");
      }

      return response.json();
    },
    onSuccess: (newMember) => {
      // Update the cache manually instead of invalidating
      queryClient.setQueryData(["/api/family"], (oldData: any) => {
        if (oldData && oldData.members) {
          return {
            ...oldData,
            members: [...oldData.members, newMember]
          };
        }
        return oldData;
      });
      
      toast({
        title: "تم الإضافة بنجاح",
        description: "تم إضافة الفرد إلى الأسرة",
        variant: "default",
      });
      setIsDialogOpen(false);
      setEditingMember(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الإضافة",
        description: error.message || "حدث خطأ أثناء إضافة الفرد",
        variant: "destructive",
      });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      console.log('Updating member with ID:', id, 'Data:', data);
      
      const response = await fetchApi(`/api/members/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      console.log('Update response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Update error data:', errorData);
        throw new Error(errorData.message || 'Failed to update member');
      }
      
      return response.json();
    },
    onSuccess: (updatedMember) => {
      // Update the cache manually instead of invalidating
      queryClient.setQueryData(["/api/family"], (oldData: any) => {
        if (oldData && oldData.members) {
          return {
            ...oldData,
            members: oldData.members.map((member: any) => 
              member.id === updatedMember.id ? updatedMember : member
            )
          };
        }
        return oldData;
      });
      
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث بيانات الفرد",
        variant: "default",
      });
      setIsDialogOpen(false);
      setEditingMember(null);
    },
    onError: (error: any) => {
      console.error('Update mutation error:', error);
      toast({
        title: "خطأ في التحديث",
        description: error.message || "حدث خطأ أثناء تحديث البيانات",
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      console.log('Attempting to delete member with ID:', memberId);
      console.log('Member ID type in mutation:', typeof memberId);
      
      const response = await fetchApi(`/api/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Delete response status:', response.status);
      console.log('Delete response URL:', response.url);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Delete error data:', errorData);
        throw new Error(errorData.message || 'Failed to delete member');
      }
      
      // Don't try to parse JSON for 204 No Content responses
      if (response.status === 204) {
        return memberId; // Return the deleted member ID
      }
      
      return response.json();
    },
    onSuccess: (deletedMemberId) => {
      // Update the cache manually instead of invalidating
      queryClient.setQueryData(["/api/family"], (oldData: any) => {
        if (oldData && oldData.members) {
          return {
            ...oldData,
            members: oldData.members.filter((member: any) => member.id !== deletedMemberId)
          };
        }
        return oldData;
      });
      
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف الفرد من الأسرة",
        variant: "default",
      });
      setIsDeleteDialogOpen(false);
      setDeleteMember(null);
    },
    onError: (error: any) => {
      console.error('Delete mutation error:', error);
      toast({
        title: "خطأ في الحذف",
        description: error.message || "حدث خطأ أثناء حذف الفرد",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MemberFormData) => {
    console.log('Form submitted with data:', data);
    
    if (editingMember) {
      console.log('Updating existing member:', editingMember.id);
      updateMemberMutation.mutate({ id: editingMember.id, data });
    } else {
      console.log('Creating new member');
      createMemberMutation.mutate(data);
    }
  };

  const handleEdit = (member: any) => {
    console.log('Editing member:', member);
    setEditingMember(member);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingMember(null);
    form.reset({
      fullName: "",
      birthDate: "",
      gender: "male",
      relationship: "",
      isDisabled: false,
      disabilityType: "",
    });
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (member: any) => {
    console.log('Delete clicked for member:', member);
    console.log('Member ID:', member.id);
    console.log('Member ID type:', typeof member.id);
    console.log('Member ID Number:', Number(member.id));
    console.log('Member ID String:', String(member.id));
    console.log('Full member object:', JSON.stringify(member, null, 2));
    setDeleteMember(member);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteMember) {
      console.log('Confirming delete for member:', deleteMember);
      console.log('Delete member ID:', deleteMember.id);
      console.log('Delete member ID type:', typeof deleteMember.id);
      
      // Ensure the ID is a number
      const memberId = Number(deleteMember.id);
      console.log('Converted member ID:', memberId);
      
      if (isNaN(memberId)) {
        toast({
          title: "خطأ في المعرف",
          description: "معرف الفرد غير صحيح",
          variant: "destructive",
        });
        return;
      }
      
      deleteMemberMutation.mutate(memberId);
    }
  };

  // Calculate children count (under 2 years old)
  const childrenCount = members.filter((member: any) => {
    const age = calculateAge(member.birthDate);
    return age < 2;
  }).length;

  // Filter children for display (under 2 years old)
  const children = members.filter((member: any) => {
    const age = calculateAge(member.birthDate);
    return age < 2;
  });

  const totalPages = Math.ceil(members.length / pageSize);
  const paginatedMembers = members.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  if (familyLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">أفراد الأسرة</h1>
            <p className="text-muted-foreground">إدارة أفراد الأسرة وبياناتهم</p>
          </div>
          
          <Button onClick={handleAdd} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            إضافة فرد جديد
          </Button>
        </div>

    
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">إجمالي الأفراد (محسوب)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {totalMembers}
                  </p>
                  <p className="text-xs text-muted-foreground">محفوظ: {storedTotalMembers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-secondary" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">عدد الذكور (محسوب)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {maleCount}
                  </p>
                  <p className="text-xs text-muted-foreground">محفوظ: {storedNumMales}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">عدد الإناث (محسوب)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {femaleCount}
                  </p>
                  <p className="text-xs text-muted-foreground">محفوظ: {storedNumFemales}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Users className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm text-muted-foreground">عدد الأطفال</p>
                  <p className="text-2xl font-bold text-foreground">
                    {childrenCount}
                  </p>
                  <p className="text-xs text-muted-foreground">أقل من 2 سنة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة أفراد الأسرة ({members.length} فرد)</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-background">
                      <th className="border border-gray-300 px-4 py-2 text-right font-medium text-muted-foreground">الاسم الكامل</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-medium text-muted-foreground">رقم الهوية</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-medium text-muted-foreground">تاريخ الميلاد</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-medium text-muted-foreground">العمر</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-medium text-muted-foreground">الجنس</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-medium text-muted-foreground">القرابة</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-medium text-muted-foreground">إعاقة</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-medium text-muted-foreground">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMembers.map((member: any) => (
                      <tr key={member.id}>
                        <td className="border border-gray-300 px-4 py-2">{member.fullName}</td>
                        <td className="border border-gray-300 px-4 py-2">{member.memberID || 'غير محدد'}</td>
                        <td className="border border-gray-300 px-4 py-2">{member.birthDate}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Badge variant="outline">{calculateDetailedAge(member.birthDate)}</Badge>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">{getGenderInArabic(member.gender)}</td>
                        <td className="border border-gray-300 px-4 py-2">{getRelationshipInArabic(member.relationship)}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {member.isDisabled ? (
                            <Badge variant="destructive">نعم</Badge>
                          ) : (
                            <Badge variant="secondary">لا</Badge>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <div className="flex space-x-2 space-x-reverse">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(member)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(member)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination Controls */}
                <div className="flex justify-center items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    السابق
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد أفراد مسجلين في الأسرة</p>
                <Button onClick={handleAdd} className="mt-4">
                  إضافة فرد جديد
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-full">
            <DialogHeader className="px-4 sm:px-6">
              <DialogTitle className="text-lg sm:text-xl font-bold text-center">
                {editingMember ? "تعديل بيانات الفرد" : "إضافة فرد جديد"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="px-4 sm:px-6 py-4">
              <MemberForm
                initialData={editingMember}
                onSubmit={onSubmit}
                onCancel={() => {
                  setIsDialogOpen(false);
                  setEditingMember(null);
                }}
                isLoading={createMemberMutation.isPending || updateMemberMutation.isPending}
                isEdit={!!editingMember}
                  />
                </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="w-[95vw] max-w-md mx-auto sm:w-full">
            <AlertDialogHeader className="px-4 sm:px-6">
              <AlertDialogTitle className="text-lg sm:text-xl font-bold text-center">
                تأكيد الحذف
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right text-sm sm:text-base">
                هل أنت متأكد من حذف الفرد "{deleteMember?.fullName}"؟ 
                <br />
                لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row justify-center gap-2 px-4 sm:px-6 pb-4 sm:pb-6">
              <AlertDialogCancel className="w-full sm:w-auto">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMemberMutation.isPending}
              >
                {deleteMemberMutation.isPending ? "جاري الحذف..." : "حذف"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
