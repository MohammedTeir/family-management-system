import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useToast } from '../../hooks/use-toast';
import { fetchApi } from '@/lib/api';
import { CalendarIcon, PlusIcon, UsersIcon, BellIcon, CheckCircleIcon, XCircleIcon, ClockIcon, DollarSignIcon, MapPinIcon, CalendarDaysIcon, UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useSettings } from "@/hooks/use-settings";

interface SupportVoucher {
  id: number;
  title: string;
  description: string;
  supportType: string;
  createdBy: number;
  createdAt: string;
  location: string | null;
  isActive: boolean;
  creator: {
    username: string;
  };
  recipients: VoucherRecipient[];
}

interface VoucherRecipient {
  id: number;
  voucherId: number;
  familyId: number;
  status: 'pending' | 'received' | 'paid' | 'not_attended';
  notified: boolean;
  notifiedAt: string | null;
  updatedBy: number | null;
  updatedAt: string;
  notes: string | null;
  family: {
    husbandName: string;
    primaryPhone: string;
    totalMembers: number;
  };
}

const supportTypes = [
  { value: 'food_basket', label: 'سلة غذائية', color: 'bg-orange-500', icon: '🍎' },
  { value: 'cash_support', label: 'دعم نقدي', color: 'bg-green-500', icon: '💰' },
  { value: 'school_kit', label: 'مستلزمات مدرسية', color: 'bg-blue-500', icon: '📚' },
  { value: 'medical', label: 'دعم طبي', color: 'bg-red-500', icon: '🏥' },
  { value: 'clothing', label: 'ملابس', color: 'bg-purple-500', icon: '👕' },
  { value: 'other', label: 'أخرى', color: 'bg-background0', icon: '📦' }
];

const statusLabels = {
  pending: { label: 'في الانتظار', icon: ClockIcon, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  received: { label: 'تم الاستلام', icon: CheckCircleIcon, color: 'bg-green-100 text-green-800 border-green-200' },
  paid: { label: 'تم الدفع', icon: DollarSignIcon, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  not_attended: { label: 'لم يحضر', icon: XCircleIcon, color: 'bg-red-100 text-red-800 border-red-200' }
};

export default function SupportVouchers() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRecipientsDialogOpen, setIsRecipientsDialogOpen] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<SupportVoucher | null>(null);
  const [selectedFamilies, setSelectedFamilies] = useState<number[]>([]);
  
  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [displacedFilter, setDisplacedFilter] = useState('all');
  const [abroadFilter, setAbroadFilter] = useState('all');
  const [damagedFilter, setDamagedFilter] = useState('all');
  const [socialStatusFilter, setSocialStatusFilter] = useState('all');
  const [membersFilter, setMembersFilter] = useState('all');
  const [pregnantFilter, setPregnantFilter] = useState('all');
  const [childrenFilter, setChildrenFilter] = useState('all');
  const [childrenMinCount, setChildrenMinCount] = useState('');
  const [childrenMaxCount, setChildrenMaxCount] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    supportType: '',
    location: ''
  });

  // Fetch support vouchers
  const { data: vouchers, isLoading } = useQuery({
    queryKey: ['support-vouchers'],
    queryFn: async () => {
      const response = await fetchApi('/api/support-vouchers');
      if (!response.ok) throw new Error('Failed to fetch vouchers');
      return response.json();
    }
  });

  // Fetch families for recipient selection
  const { data: families } = useQuery({
    queryKey: ['admin-families'],
    queryFn: async () => {
      const response = await fetchApi('/api/admin/families');
      if (!response.ok) throw new Error('Failed to fetch families');
      return response.json();
    }
  });

  // Fetch all users to get role information
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetchApi('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Helper function to calculate age
  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // Create a combined list of families and users without families
  const allRecipients = React.useMemo(() => {
    if (!families || !users) return [];
    
    console.log('Debug - Families:', families);
    console.log('Debug - Users:', users);
    
    const familiesWithUsers = families.map((family: any) => {
      const user = users.find((u: any) => u.id === family.userId);
      
      // Calculate children count (under 2 years old)
      const children = family.members?.filter((member: any) => {
        if (!member.birthDate) return false;
        const age = calculateAge(member.birthDate);
        return age < 2;
      }) || [];
      
      const recipient = {
        id: family.id,
        type: 'family',
        name: family.husbandName,
        username: user?.username || '',
        phone: family.primaryPhone,
        members: family.totalMembers,
        role: user?.role || 'unknown',
        userId: family.userId,
        // Add identity IDs for search functionality
        husbandID: family.husbandID,
        wifeID: family.wifeID,
        // Add additional family data for filtering
        branch: family.branch,
        isDisplaced: family.isDisplaced,
        displacedLocation: family.displacedLocation,
        isAbroad: family.isAbroad,
        warDamage2024: family.warDamage2024,
        socialStatus: family.socialStatus,
        numMales: family.numMales,
        numFemales: family.numFemales,
        // Add pregnant and children data
        wifePregnant: family.wifePregnant,
        childrenCount: children.length,
        hasChildren: children.length > 0
      };
      
      // Debug log for admin users with numeric usernames
      if (user?.role === 'admin' && /^\d+$/.test(user.username)) {
        console.log('Debug - Found admin with numeric username:', {
          username: user.username,
          role: user.role,
          socialStatus: family.socialStatus,
          recipient
        });
      }
      
      return recipient;
    });

    // Add users who don't have families (admins, etc.)
    const usersWithoutFamilies = users
      .filter((user: any) => !families.some((f: any) => f.userId === user.id))
      .map((user: any) => {
        // Check if this admin user has a family (they might be a head with admin role)
        const userFamily = families.find((f: any) => f.userId === user.id);
        
        const recipient = {
        id: `user-${user.id}`,
        type: 'user',
        name: user.username,
          username: user.username,
        phone: user.phone || 'غير محدد',
          members: userFamily ? userFamily.totalMembers : 0,
          role: user.role,
          userId: user.id,
          // Add identity IDs for search functionality (if user has family)
          husbandID: userFamily?.husbandID || null,
          wifeID: userFamily?.wifeID || null,
          // Use family data if available, otherwise use defaults
          branch: userFamily?.branch || null,
          isDisplaced: userFamily?.isDisplaced || false,
          displacedLocation: userFamily?.displacedLocation || null,
          isAbroad: userFamily?.isAbroad || false,
          warDamage2024: userFamily?.warDamage2024 || false,
          socialStatus: userFamily?.socialStatus || null,
          numMales: userFamily?.numMales || 0,
          numFemales: userFamily?.numFemales || 0,
          // Add pregnant and children data from family if available
          wifePregnant: userFamily?.wifePregnant || false,
          childrenCount: userFamily ? userFamily.members?.filter((member: any) => {
            if (!member.birthDate) return false;
            const age = calculateAge(member.birthDate);
            return age < 2;
          }).length || 0 : 0,
          hasChildren: userFamily ? (userFamily.members?.filter((member: any) => {
            if (!member.birthDate) return false;
            const age = calculateAge(member.birthDate);
            return age < 2;
          }).length || 0) > 0 : false
        };
        
        // Debug log for admin users with numeric usernames
        if (user.role === 'admin' && /^\d+$/.test(user.username)) {
          console.log('Debug - Found admin with numeric username (no family):', {
            username: user.username,
        role: user.role,
            socialStatus: userFamily?.socialStatus,
            recipient
          });
        }
        
        return recipient;
      });

    const allRecipients = [...familiesWithUsers, ...usersWithoutFamilies];
    console.log('Debug - All recipients:', allRecipients);
    
    // Debug: Check for admin users with numeric usernames in allRecipients
    const adminNumericUsers = allRecipients.filter((r: any) => r.role === 'admin' && /^\d+$/.test(r.username));
    console.log('Debug - Admin users with numeric usernames in allRecipients:', adminNumericUsers);
    
    return allRecipients;
  }, [families, users]);

  // Filter recipients based on all filters
  const filteredRecipients = allRecipients.filter((recipient: any) => {
    const matchesSearch = recipient.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         recipient.phone.includes(searchFilter) ||
                         (recipient.husbandID && recipient.husbandID.includes(searchFilter)) ||
                         (recipient.wifeID && recipient.wifeID.includes(searchFilter));
    
    // Role filter - treat admin as "head" only if username is all numbers (like identity number)
    const matchesRole = roleFilter === 'all' || 
                       (roleFilter === 'head' && (
                         recipient.role === 'head' || 
                         (recipient.role === 'admin' && /^\d+$/.test(recipient.username))
                       )) ||
                       (roleFilter === 'root' && recipient.role === 'root');
    
    // Branch filter
    const matchesBranch = branchFilter === 'all' || recipient.branch === branchFilter;
    
    // Displaced filter
    const matchesDisplaced = displacedFilter === 'all' || 
                            (displacedFilter === 'yes' ? recipient.isDisplaced : !recipient.isDisplaced);
    
    // Abroad filter
    const matchesAbroad = abroadFilter === 'all' || 
                         (abroadFilter === 'yes' ? recipient.isAbroad : !recipient.isAbroad);
    
    // War damage filter
    const matchesDamaged = damagedFilter === 'all' || 
                          (damagedFilter === 'yes' ? recipient.warDamage2024 : !recipient.warDamage2024);
    
    // Social status filter
    const matchesSocialStatus = socialStatusFilter === 'all' || recipient.socialStatus === socialStatusFilter;
    
    // Members count filter
    const matchesMembers = membersFilter === 'all' || 
                          (membersFilter === 'small' && recipient.members <= 3) ||
                          (membersFilter === 'medium' && recipient.members > 3 && recipient.members <= 6) ||
                          (membersFilter === 'large' && recipient.members > 6);

    // Pregnant filter
    const matchesPregnant = pregnantFilter === 'all' || 
                           (pregnantFilter === 'yes' ? recipient.wifePregnant : !recipient.wifePregnant);

    // Children filter
    const matchesChildren = childrenFilter === 'all' || 
                           (childrenFilter === 'yes' ? recipient.hasChildren : !recipient.hasChildren) ||
                           (childrenFilter === 'many' && recipient.childrenCount >= 3) ||
                           (childrenFilter === 'few' && recipient.childrenCount > 0 && recipient.childrenCount < 3) ||
                           (childrenFilter === 'custom' && 
                            (childrenMinCount === '' || recipient.childrenCount >= parseInt(childrenMinCount)) &&
                            (childrenMaxCount === '' || recipient.childrenCount <= parseInt(childrenMaxCount)));

    const allMatches = matchesSearch && matchesRole && matchesBranch && matchesDisplaced && 
           matchesAbroad && matchesDamaged && matchesSocialStatus && matchesMembers &&
           matchesPregnant && matchesChildren;
    
    // Debug log for admin users with numeric usernames during filtering
    if (recipient.role === 'admin' && /^\d+$/.test(recipient.username)) {
      console.log('Debug - Filtering admin with numeric username:', {
        username: recipient.username,
        role: recipient.role,
        socialStatus: recipient.socialStatus,
        roleFilter,
        socialStatusFilter,
        matchesRole,
        matchesSocialStatus,
        allMatches,
        recipient,
        type: recipient.type,
        id: recipient.id
      });
    }
    
    return allMatches;
  });

  // Debug: Check filtered recipients for admin users with numeric usernames
  const filteredAdminNumericUsers = filteredRecipients.filter((r: any) => r.role === 'admin' && /^\d+$/.test(r.username));
  console.log('Debug - Admin users with numeric usernames in filteredRecipients:', filteredAdminNumericUsers);
  console.log('Debug - Total filtered recipients:', filteredRecipients.length);
  
  // Debug: Check if the specific user is in the filtered results
  const specificUser = filteredRecipients.find((r: any) => r.username === '410302772');
  console.log('Debug - Specific user 410302772 in filteredRecipients:', specificUser);

  // Select all filtered recipients
  const handleSelectAll = () => {
    const filteredIds = filteredRecipients.map((recipient: any) => recipient.id);
    setSelectedFamilies(filteredIds);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedFamilies([]);
  };

  // Create voucher mutation
  const createVoucherMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetchApi('/api/support-vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create voucher');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-vouchers'] });
      setIsCreateDialogOpen(false);
      setFormData({ title: '', description: '', supportType: '', location: '' });
      toast({ title: 'تم إنشاء الكوبونة بنجاح', description: 'تم إضافة كوبونة الدعم الجديد' });
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  });

  // Add recipients mutation
  const addRecipientsMutation = useMutation({
    mutationFn: async ({ voucherId, familyIds }: { voucherId: number; familyIds: number[] }) => {
      const response = await fetchApi(`/api/support-vouchers/${voucherId}/recipients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyIds })
      });
      if (!response.ok) throw new Error('Failed to add recipients');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-vouchers'] });
      setIsRecipientsDialogOpen(false);
      setSelectedFamilies([]);
      toast({ title: 'تم إضافة المستفيدين بنجاح', description: 'تم إضافة العائلات المحددة إلى الكوبونة' });
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  });

  // Update recipient status mutation
  const updateRecipientStatusMutation = useMutation({
    mutationFn: async ({ recipientId, status }: { recipientId: number; status: string }) => {
      const response = await fetchApi(`/api/voucher-recipients/${recipientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-vouchers'] });
      toast({ title: 'تم تحديث الحالة بنجاح', description: 'تم تحديث حالة المستفيد' });
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async ({ voucherId, recipientIds }: { voucherId: number; recipientIds?: number[] }) => {
      const response = await fetchApi(`/api/support-vouchers/${voucherId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientIds })
      });
      if (!response.ok) throw new Error('Failed to send notification');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-vouchers'] });
      toast({ title: 'تم إرسال الإشعار بنجاح', description: 'تم إرسال الإشعارات إلى المستفيدين' });
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  });

  // Toggle voucher active status mutation
  const toggleVoucherStatusMutation = useMutation({
    mutationFn: async ({ voucherId, isActive }: { voucherId: number; isActive: boolean }) => {
      const response = await fetchApi(`/api/support-vouchers/${voucherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      if (!response.ok) throw new Error('Failed to update voucher status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-vouchers'] });
      toast({ 
        title: 'تم تحديث حالة الكوبونة بنجاح', 
        description: 'تم تحديث حالة الكوبونة' 
      });
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  });

  const handleCreateVoucher = () => {
    createVoucherMutation.mutate(formData);
  };

  const handleAddRecipients = () => {
    if (selectedVoucher && selectedFamilies.length > 0) {
      addRecipientsMutation.mutate({
        voucherId: selectedVoucher.id,
        familyIds: selectedFamilies
      });
    }
  };

  const handleUpdateStatus = (recipientId: number, status: string) => {
    updateRecipientStatusMutation.mutate({ recipientId, status });
  };

  const handleSendNotification = (voucherId: number, recipientIds?: number[]) => {
    sendNotificationMutation.mutate({ voucherId, recipientIds });
  };

  const getStats = (voucher: SupportVoucher) => {
    const total = voucher.recipients.length;
    const received = voucher.recipients.filter(r => r.status === 'received').length;
    const paid = voucher.recipients.filter(r => r.status === 'paid').length;
    const pending = voucher.recipients.filter(r => r.status === 'pending').length;
    const notAttended = voucher.recipients.filter(r => r.status === 'not_attended').length;
    const notified = voucher.recipients.filter(r => r.notified).length;

    return { total, received, paid, pending, notAttended, notified };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <div className="text-lg text-muted-foreground">جاري تحميل الكوبونات...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-foreground">
                الكوبونات
              </h1>
              <p className="text-muted-foreground text-lg">إدارة كوبونات الدعم والمستفيدين</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>إجمالي الكوبونات: {vouchers?.length || 0}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Button
                variant="outline"
                className="border-border text-foreground hover:bg-muted"
                onClick={() => setLocation('/admin')}
              >
                العودة إلى لوحة التحكم
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                    <PlusIcon className="ml-2 h-5 w-5" />
                    إنشاء كوبونة جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-foreground">إنشاء كوبونة دعم جديد</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                      أدخل تفاصيل كوبونة الدعم الجديد
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title" className="text-foreground font-medium">عنوان الكوبونة</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="مثال: كوبونة رمضان الغذائي"
                        className="border-border focus:border-primary focus:ring-primary"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description" className="text-foreground font-medium">الوصف</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="تفاصيل إضافية عن الكوبونة"
                        className="border-border focus:border-primary focus:ring-primary"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supportType" className="text-foreground font-medium">نوع الدعم</Label>
                      <Select value={formData.supportType} onValueChange={(value) => setFormData({ ...formData, supportType: value })}>
                        <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                          <SelectValue placeholder="اختر نوع الدعم" />
                        </SelectTrigger>
                        <SelectContent>
                          {supportTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <span>{type.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="location" className="text-foreground font-medium">الموقع (اختياري)</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="موقع التوزيع"
                        className="border-border focus:border-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="border-border text-foreground hover:bg-muted">
                      إلغاء
                    </Button>
                    <Button 
                      onClick={handleCreateVoucher} 
                      disabled={createVoucherMutation.isPending}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {createVoucherMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء الكوبونة'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Vouchers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vouchers?.map((voucher) => (
            <div
              key={voucher.id}
              className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => setLocation(`/admin/support-vouchers/${voucher.id}`)}
            >
              <CardHeader className="bg-gradient-to-r from-muted to-primary/5 border-b border-border">
                <CardTitle className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <span className={`text-3xl ${supportTypes.find(t => t.value === voucher.supportType)?.color}`}>
                    {supportTypes.find(t => t.value === voucher.supportType)?.icon}
                  </span>
                  {voucher.title}
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2 text-base">
                  {voucher.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>{supportTypes.find(t => t.value === voucher.supportType)?.label}</span>
                  </div>
                  {voucher.location && (
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4" />
                      <span>{voucher.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span>{voucher.creator.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDaysIcon className="h-4 w-4" />
                    <span>{format(new Date(voucher.createdAt), 'dd/MM/yyyy', { locale: ar })}</span>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{voucher.recipients.length}</div>
                    <div className="text-xs text-muted-foreground">المستفيدين</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">
                      {voucher.recipients.filter(r => r.status === 'received').length}
                    </div>
                    <div className="text-xs text-muted-foreground">تم الاستلام</div>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="mt-4 flex justify-center">
                  <Badge variant={voucher.isActive ? "default" : "secondary"} className="text-sm">
                    {voucher.isActive ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>
              </CardContent>
            </div>
          ))}
        </div>

        {/* Add Recipients Dialog */}
        <Dialog open={isRecipientsDialogOpen} onOpenChange={setIsRecipientsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground">إضافة مستفيدين إلى الكوبونة</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                اختر العائلات التي ستستفيد من هذه الكوبونة
              </DialogDescription>
            </DialogHeader>
            
            {/* Filters */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search" className="text-foreground font-medium">البحث</Label>
                  <Input
                    id="search"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="البحث بالاسم أو الهاتف أو رقم الهوية..."
                    className="border-border focus:border-primary focus:ring-primary"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-foreground font-medium">نوع المستخدم</Label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستخدمين</SelectItem>
                      <SelectItem value="head">رب الأسرة</SelectItem>
                      <SelectItem value="root">مشرف رئيسي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="branch" className="text-foreground font-medium">الفرع</Label>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفروع</SelectItem>
                      <SelectItem value="gaza">غزة</SelectItem>
                      <SelectItem value="north">شمال غزة</SelectItem>
                      <SelectItem value="central">الوسطى</SelectItem>
                      <SelectItem value="khan_yunis">خان يونس</SelectItem>
                      <SelectItem value="rafah">رفح</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="displaced" className="text-foreground font-medium">حالة النزوح</Label>
                  <Select value={displacedFilter} onValueChange={setDisplacedFilter}>
                    <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع العائلات</SelectItem>
                      <SelectItem value="yes">نازحين</SelectItem>
                      <SelectItem value="no">غير نازحين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="abroad" className="text-foreground font-medium">الاغتراب</Label>
                  <Select value={abroadFilter} onValueChange={setAbroadFilter}>
                    <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع العائلات</SelectItem>
                      <SelectItem value="yes">مغتربين بالخارج</SelectItem>
                      <SelectItem value="no">مقيمين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="damaged" className="text-foreground font-medium">أضرار الحرب</Label>
                  <Select value={damagedFilter} onValueChange={setDamagedFilter}>
                    <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع العائلات</SelectItem>
                      <SelectItem value="yes">متضررين</SelectItem>
                      <SelectItem value="no">غير متضررين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="socialStatus" className="text-foreground font-medium">الحالة الاجتماعية</Label>
                  <Select value={socialStatusFilter} onValueChange={setSocialStatusFilter}>
                    <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="married">متزوج</SelectItem>
                      <SelectItem value="divorced">مطلق</SelectItem>
                      <SelectItem value="widowed">أرمل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="members" className="text-foreground font-medium">عدد الأفراد</Label>
                  <Select value={membersFilter} onValueChange={setMembersFilter}>
                    <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأحجام</SelectItem>
                      <SelectItem value="small">صغيرة (1-3)</SelectItem>
                      <SelectItem value="medium">متوسطة (4-6)</SelectItem>
                      <SelectItem value="large">كبيرة (7+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="pregnant" className="text-foreground font-medium">أم في الحمل</Label>
                  <Select value={pregnantFilter} onValueChange={setPregnantFilter}>
                    <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="yes">نعم</SelectItem>
                      <SelectItem value="no">لا</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="children" className="text-foreground font-medium">عدد الأطفال</Label>
                  <Select value={childrenFilter} onValueChange={setChildrenFilter}>
                    <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الحالات</SelectItem>
                      <SelectItem value="yes">نعم</SelectItem>
                      <SelectItem value="no">لا</SelectItem>
                      <SelectItem value="many">كثير (3+)</SelectItem>
                      <SelectItem value="few">قليل (1-2)</SelectItem>
                      <SelectItem value="custom">مخصص</SelectItem>
                    </SelectContent>
                  </Select>
                  {childrenFilter === 'custom' && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="childrenMin" className="text-xs text-muted-foreground">الحد الأدنى</Label>
                        <Input
                          id="childrenMin"
                          type="number"
                          min="0"
                          value={childrenMinCount}
                          onChange={(e) => setChildrenMinCount(e.target.value)}
                          placeholder="0"
                          className="text-xs border-border focus:border-primary focus:ring-primary"
                        />
                      </div>
                      <div>
                        <Label htmlFor="childrenMax" className="text-xs text-muted-foreground">الحد الأقصى</Label>
                        <Input
                          id="childrenMax"
                          type="number"
                          min="0"
                          value={childrenMaxCount}
                          onChange={(e) => setChildrenMaxCount(e.target.value)}
                          placeholder="10"
                          className="text-xs border-border focus:border-primary focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Select All / Deselect All */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="border-primary text-primary hover:bg-primary/10 hover:border-primary/30 hover:text-primary/80 transition-all duration-200"
                >
                  تحديد الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDeselectAll}
                  className="border-border text-foreground hover:bg-background hover:border-border hover:text-foreground transition-all duration-200"
                >
                  إلغاء التحديد
                </Button>
                <div className="flex-1 text-right text-sm text-muted-foreground flex items-center justify-end">
                  تم تحديد {selectedFamilies.length} من {filteredRecipients.length}
                </div>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto bg-background rounded-xl p-4">
              <div className="grid gap-3">
                {filteredRecipients.map((recipient: any) => {
                  const isSelected = selectedFamilies.includes(recipient.id);
                  
                  return (
                    <div key={recipient.id} className={`flex items-center space-x-3 space-x-reverse bg-background p-4 rounded-lg border transition-all duration-200 ${
                      isSelected 
                        ? 'border-primary bg-primary/10 shadow-md' 
                        : 'border-border hover:border-primary hover:bg-primary/10 hover:shadow-sm'
                    }`}>
                      <input
                        type="checkbox"
                        id={`recipient-${recipient.id}`}
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFamilies([...selectedFamilies, recipient.id]);
                          } else {
                            setSelectedFamilies(selectedFamilies.filter(id => id !== recipient.id));
                          }
                        }}
                        className="w-5 h-5 text-primary border-border rounded focus:ring-primary focus:ring-2"
                      />
                      <label htmlFor={`recipient-${recipient.id}`} className="text-sm text-foreground cursor-pointer flex-1 hover:text-primary transition-colors">
                        <div className="font-medium">{recipient.name}</div>
                        <div className="text-muted-foreground flex items-center gap-2">
                          <span>{recipient.phone}</span>
                          {recipient.type === 'family' && (
                            <>
                              <span>•</span>
                              <span>{recipient.members} عضو</span>
                            </>
                          )}
                          <span>•</span>
                          <Badge variant="outline" className={`text-xs ${
                            recipient.role === 'head' || 
                            (recipient.role === 'admin' && /^\d+$/.test(recipient.username))
                              ? 'border-green-200 text-green-700 bg-green-50' 
                              : recipient.role === 'root' 
                              ? 'border-blue-200 text-blue-700 bg-blue-50'
                              : 'border-border text-muted-foreground bg-background'
                          }`}>
                            {recipient.role === 'head' || 
                             (recipient.role === 'admin' && /^\d+$/.test(recipient.username)) 
                             ? 'رب الأسرة' : 
                             recipient.role === 'root' ? 'مشرف رئيسي' : 
                             recipient.role === 'admin' ? 'مشرف' : 'غير محدد'}
                          </Badge>
                          {recipient.type === 'family' && recipient.wifePregnant && (
                            <Badge variant="outline" className="text-xs border-pink-200 text-pink-700 bg-pink-50">
                              حامل
                            </Badge>
                          )}
                          {recipient.type === 'family' && recipient.hasChildren && (
                            <Badge variant="outline" className="text-xs border-yellow-200 text-yellow-700 bg-yellow-50">
                              {recipient.childrenCount} طفل
                            </Badge>
                          )}
                          {recipient.type === 'user' && (
                            <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-orange-50">
                              بدون أسرة
                            </Badge>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
              
              {filteredRecipients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد عائلات أو مستخدمين تطابق معايير البحث
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRecipientsDialogOpen(false)} className="border-border text-foreground hover:bg-background">
                إلغاء
              </Button>
              <Button 
                onClick={handleAddRecipients} 
                disabled={addRecipientsMutation.isPending || selectedFamilies.length === 0}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                {addRecipientsMutation.isPending ? 'جاري الإضافة...' : `إضافة ${selectedFamilies.length} مستفيد`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}