import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useToast } from '../../hooks/use-toast';
import { 
  ArrowLeftIcon, 
  BellIcon, 
  UsersIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  DollarSignIcon,
  MapPinIcon,
  CalendarDaysIcon,
  UserIcon,
  PlusIcon,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { fetchApi } from "@/lib/api";

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

export default function VoucherDetails() {
  const [location, setLocation] = useLocation();
  const [isAddRecipientsDialogOpen, setIsAddRecipientsDialogOpen] = useState(false);
  const [selectedFamilies, setSelectedFamilies] = useState<number[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
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
  
  // Add new state variables for recipients table filtering
  const [recipientSearchTerm, setRecipientSearchTerm] = useState('');
  const [recipientStatusFilter, setRecipientStatusFilter] = useState('all');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get voucher ID from URL
  const voucherId = parseInt(location.split('/').pop() || '0');

  // Fetch voucher details
  const { data: voucher, isLoading } = useQuery({
    queryKey: ['support-voucher', voucherId],
    queryFn: async () => {
      const response = await fetchApi(`/api/support-vouchers/${voucherId}`);
      if (!response.ok) throw new Error('Failed to fetch voucher');
      return response.json();
    },
    enabled: voucherId > 0
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

    // Only include users who are household heads (with identity numbers as usernames)
    // Exclude root/admin users without identity numbers
    const usersWithoutFamilies = users
      .filter((user: any) => {
        // Don't include users who already have families
        if (families.some((f: any) => f.userId === user.id)) return false;
        
        // Only include users with numeric usernames (identity numbers) or head role
        return user.role === 'head' || (user.role === 'admin' && /^\d+$/.test(user.username));
      })
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
    
    return allRecipients;
  }, [families, users]);

  // Filter recipients based on all filters
  const filteredRecipients = allRecipients.filter((recipient: any) => {
    const matchesSearch = recipient.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         recipient.phone.includes(searchFilter) ||
                         (recipient.husbandID && recipient.husbandID.includes(searchFilter)) ||
                         (recipient.wifeID && recipient.wifeID.includes(searchFilter));
    
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

    const allMatches = matchesSearch && matchesBranch && matchesDisplaced && 
           matchesAbroad && matchesDamaged && matchesSocialStatus && matchesMembers &&
           matchesPregnant && matchesChildren;
    
    // Debug log for admin users with numeric usernames during filtering
    if (recipient.role === 'admin' && /^\d+$/.test(recipient.username)) {
      console.log('Debug - Filtering admin with numeric username:', {
        username: recipient.username,
        role: recipient.role,
        socialStatus: recipient.socialStatus,
        socialStatusFilter,
        matchesSocialStatus,
        allMatches,
        recipient
      });
    }
    
    return allMatches;
  });

  // Filter recipients based on search and status
  const filteredRecipientsForTable = React.useMemo(() => {
    if (!voucher?.recipients) return [];
    
    return voucher.recipients.filter((recipient) => {
      // Search filter
      const matchesSearch = recipientSearchTerm === '' || 
        recipient.family.husbandName.toLowerCase().includes(recipientSearchTerm.toLowerCase()) ||
        recipient.family.primaryPhone.includes(recipientSearchTerm) ||
        recipient.family.totalMembers.toString().includes(recipientSearchTerm);
      
      // Status filter
      const matchesStatus = recipientStatusFilter === 'all' || recipient.status === recipientStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [voucher?.recipients, recipientSearchTerm, recipientStatusFilter]);

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
      queryClient.invalidateQueries({ queryKey: ['support-voucher', voucherId] });
      setIsAddRecipientsDialogOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ['support-voucher', voucherId] });
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
      queryClient.invalidateQueries({ queryKey: ['support-voucher', voucherId] });
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
      queryClient.invalidateQueries({ queryKey: ['support-voucher', voucherId] });
      queryClient.invalidateQueries({ queryKey: ['support-vouchers'] });
      toast({ 
        title: 'تم تحديث حالة الكوبونة بنجاح', 
        description: `تم ${voucher?.isActive ? 'إلغاء تفعيل' : 'تفعيل'} الكوبونة` 
      });
    },
    onError: (error) => {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    }
  });

  const handleAddRecipients = () => {
    if (voucher && selectedFamilies.length > 0) {
      addRecipientsMutation.mutate({
        voucherId: voucher.id,
        familyIds: selectedFamilies
      });
    }
  };

  const handleUpdateStatus = (recipientId: number, status: string) => {
    updateRecipientStatusMutation.mutate({ recipientId, status });
  };

  const handleSendNotification = (recipientIds?: number[]) => {
    if (voucher) {
      sendNotificationMutation.mutate({ voucherId: voucher.id, recipientIds });
    }
  };

  // Select all filtered recipients (excluding already added ones)
  const handleSelectAll = () => {
    const filteredIds = filteredRecipients
      .filter((recipient: any) => {
        // Exclude recipients that are already in the voucher
        const isAlreadyRecipient = voucher?.recipients?.some((r: any) => r.familyId === recipient.id);
        return !isAlreadyRecipient;
      })
      .map((recipient: any) => recipient.id);
    setSelectedFamilies(filteredIds);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedFamilies([]);
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
              <div className="text-lg text-muted-foreground">جاري تحميل تفاصيل الكوبونة...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              لم يتم العثور على الكوبونة المطلوبة
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const stats = getStats(voucher);
  const supportType = supportTypes.find(t => t.value === voucher.supportType);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="bg-card rounded-2xl shadow-lg p-8 border border-border">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => setLocation('/admin/support-vouchers')}
              className="border-border text-foreground hover:bg-muted"
            >
              <ArrowLeftIcon className="ml-2 h-4 w-4" />
              العودة للكوبونات
            </Button>
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
              onClick={() => setLocation('/admin')}
            >
              العودة إلى لوحة التحكم
            </Button>
          </div>
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${supportType?.color} text-white shadow-lg`}>
                  {supportType?.icon}
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                    {voucher.title}
                    <Badge variant={voucher.isActive ? "default" : "secondary"} className="text-sm px-3 py-1">
                      {voucher.isActive ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </h1>
                  <p className="text-muted-foreground text-lg mt-2">
                    {voucher.description}
                  </p>
                  
                  {/* Active Status Toggle */}
                  <div className="flex items-center gap-4 mt-6">
                    <Label htmlFor="active-status" className="text-sm font-medium text-foreground mr-2">
                      حالة الكوبونة:
                    </Label>
                    <Switch
                      id="active-status"
                      checked={voucher.isActive}
                      onCheckedChange={(checked) => {
                        toggleVoucherStatusMutation.mutate({ 
                          voucherId: voucher.id, 
                          isActive: checked 
                        });
                      }}
                      disabled={toggleVoucherStatusMutation.isPending}
                    />
                    <span className="text-sm text-muted-foreground">
                      {voucher.isActive ? 'مفعلة' : 'غير مفعلة'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-lg">
                  <span className="font-medium">النوع:</span>
                  <span>{supportType?.label}</span>
                </div>
                {voucher.location && (
                  <div className="flex items-center gap-2 bg-secondary/10 px-3 py-1 rounded-lg">
                    <MapPinIcon className="h-4 w-4" />
                    <span>{voucher.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-accent/10 px-3 py-1 rounded-lg">
                  <UserIcon className="h-4 w-4" />
                  <span>{voucher.creator.username}</span>
                </div>
                <div className="flex items-center gap-2 bg-warning/10 px-3 py-1 rounded-lg">
                  <CalendarDaysIcon className="h-4 w-4" />
                  <span>{format(new Date(voucher.createdAt), 'dd/MM/yyyy', { locale: ar })}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <Dialog open={isAddRecipientsDialogOpen} onOpenChange={setIsAddRecipientsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <PlusIcon className="ml-2 h-4 w-4" />
                    إضافة مستفيدين
                  </Button>
                </DialogTrigger>
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
                        <Label htmlFor="branch" className="text-foreground font-medium">الفرع</Label>
                        <Select value={branchFilter} onValueChange={setBranchFilter}>
                          <SelectTrigger className="border-border focus:border-primary focus:ring-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">جميع الفروع</SelectItem>
                            <SelectItem value="abouda_abunasr">عائلة ابوعودة + ابو نصر</SelectItem>
                            <SelectItem value="married_daughters_displaced">بنات العائلة متزوجات خارج العائلة</SelectItem>
                            <SelectItem value="alnogra">النقرة</SelectItem>
                            <SelectItem value="abushalbia_abumatar">ابو شلبية + ابو مطر</SelectItem>
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
                        className="border-border text-foreground hover:bg-muted hover:border-border hover:text-foreground transition-all duration-200"
                      >
                        إلغاء التحديد
                      </Button>
                      <div className="flex-1 text-right text-sm text-muted-foreground flex items-center justify-end">
                        تم تحديد {selectedFamilies.length} من {filteredRecipients.filter((recipient: any) => {
                          const isAlreadyRecipient = voucher?.recipients?.some((r: any) => r.familyId === recipient.id);
                          return !isAlreadyRecipient;
                        }).length}
                      </div>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto bg-background rounded-xl p-4">
                    <div className="grid gap-3">
                      {filteredRecipients.map((recipient: any) => {
                        const isSelected = selectedFamilies.includes(recipient.id);
                        const isAlreadyRecipient = voucher?.recipients?.some((r: any) => r.familyId === recipient.id);
                        const isDisabled = isAlreadyRecipient;
                        
                        return (
                          <div key={recipient.id} className={`flex items-center space-x-3 space-x-reverse bg-card p-4 rounded-lg border transition-all duration-200 ${
                            isAlreadyRecipient 
                              ? 'border-green-200 bg-green-50 opacity-75' 
                              : isSelected 
                              ? 'border-primary/30 bg-primary/10 shadow-md' 
                              : 'border-border hover:border-primary/30 hover:bg-primary/10 hover:shadow-sm'
                          }`}>
                            <input
                              type="checkbox"
                              id={`recipient-${recipient.id}`}
                              checked={isSelected || isAlreadyRecipient}
                              disabled={isDisabled}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFamilies([...selectedFamilies, recipient.id]);
                                } else {
                                  setSelectedFamilies(selectedFamilies.filter(id => id !== recipient.id));
                                }
                              }}
                              className="w-5 h-5 text-primary border-border rounded focus:ring-primary focus:ring-2 disabled:opacity-50"
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
                                {isAlreadyRecipient && (
                                  <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                                    مستفيد حالياً
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
                    <Button variant="outline" onClick={() => setIsAddRecipientsDialogOpen(false)} className="border-border text-foreground hover:bg-muted">
                      إلغاء
                    </Button>
                    <Button 
                      onClick={handleAddRecipients} 
                      disabled={addRecipientsMutation.isPending || selectedFamilies.length === 0}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {addRecipientsMutation.isPending ? 'جاري الإضافة...' : `إضافة ${selectedFamilies.length} مستفيد`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button
                variant="outline"
                onClick={() => handleSendNotification()}
                className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
              >
                <BellIcon className="ml-2 h-4 w-4" />
                إرسال إشعار للجميع
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats.total}</div>
            <div className="text-sm text-blue-700 font-medium">إجمالي المستفيدين</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200">
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.received}</div>
            <div className="text-sm text-green-700 font-medium">تم الاستلام</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats.paid}</div>
            <div className="text-sm text-blue-700 font-medium">تم الدفع</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.pending}</div>
            <div className="text-sm text-yellow-700 font-medium">في الانتظار</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200">
            <div className="text-3xl font-bold text-red-600 mb-2">{stats.notAttended}</div>
            <div className="text-sm text-red-700 font-medium">لم يحضر</div>
          </div>
          <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
            <div className="text-3xl font-bold text-purple-600 mb-2">{stats.notified}</div>
            <div className="text-sm text-purple-700 font-medium">تم الإشعار</div>
          </div>
        </div>

        {/* Recipients Table */}
        <Card className="bg-card rounded-2xl shadow-lg border border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">قائمة المستفيدين</CardTitle>
            <CardDescription className="text-muted-foreground">
              إدارة المستفيدين وحالاتهم
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search and Filter Controls */}
            <div className="mb-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Box */}
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="البحث باسم رب الأسرة أو رقم الهاتف أو عدد الأفراد..."
                    value={recipientSearchTerm}
                    onChange={(e) => setRecipientSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                
                {/* Status Filter */}
                <Select value={recipientStatusFilter} onValueChange={setRecipientStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="تصفية بالحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="pending">في الانتظار</SelectItem>
                    <SelectItem value="received">تم الاستلام</SelectItem>
                    <SelectItem value="paid">تم الدفع</SelectItem>
                    <SelectItem value="not_attended">لم يحضر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filter Summary */}
              {(recipientSearchTerm || recipientStatusFilter !== 'all') && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Filter className="h-4 w-4" />
                  <span>تم تطبيق الفلاتر:</span>
                  {recipientSearchTerm && (
                    <Badge variant="outline" className="text-xs">
                      البحث: {recipientSearchTerm}
                    </Badge>
                  )}
                  {recipientStatusFilter !== 'all' && (
                    <Badge variant="outline" className="text-xs">
                      الحالة: {statusLabels[recipientStatusFilter as keyof typeof statusLabels]?.label || recipientStatusFilter}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRecipientSearchTerm('');
                      setRecipientStatusFilter('all');
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    مسح الفلاتر
                  </Button>
                </div>
              )}
            </div>

            {filteredRecipientsForTable.length > 0 ? (
              <div className="bg-background rounded-xl p-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground font-semibold">اسم رب الأسرة</TableHead>
                      <TableHead className="text-foreground font-semibold">رقم الهوية</TableHead>
                      <TableHead className="text-foreground font-semibold">الهاتف</TableHead>
                      <TableHead className="text-foreground font-semibold">عدد الأفراد</TableHead>
                      <TableHead className="text-foreground font-semibold">الحالة</TableHead>
                      <TableHead className="text-foreground font-semibold">الإشعار</TableHead>
                      <TableHead className="text-foreground font-semibold">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipientsForTable.map((recipient) => {
                      const statusInfo = statusLabels[recipient.status];
                      const StatusIcon = statusInfo.icon;
                      
                      // Find the family data to get identity IDs
                      const familyData = families?.find((f: any) => f.id === recipient.familyId);
                      const identityId = familyData?.husbandID || 'غير محدد';
                      
                      return (
                        <TableRow key={recipient.id} className="border-border hover:bg-muted">
                          <TableCell className="font-medium text-foreground">{recipient.family.husbandName}</TableCell>
                          <TableCell className="text-muted-foreground font-mono">{identityId}</TableCell>
                          <TableCell className="text-muted-foreground">{recipient.family.primaryPhone}</TableCell>
                          <TableCell className="text-muted-foreground">{recipient.family.totalMembers}</TableCell>
                          <TableCell>
                            <Badge className={`${statusInfo.color} border font-medium`}>
                              <StatusIcon className="ml-1 h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {recipient.notified ? (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                تم الإشعار
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground border-border bg-background">
                                لم يتم الإشعار
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              {/* Status Update Buttons */}
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  size="sm"
                                  variant={recipient.status === 'pending' ? 'default' : 'outline'}
                                  onClick={() => handleUpdateStatus(recipient.id, 'pending')}
                                  className={`text-xs px-2 py-1 h-7 ${
                                    recipient.status === 'pending' 
                                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                                      : 'border-yellow-200 text-yellow-700 hover:bg-yellow-50'
                                  }`}
                                >
                                  <ClockIcon className="ml-1 h-3 w-3" />
                                  في الانتظار
                                </Button>
                                <Button
                                  size="sm"
                                  variant={recipient.status === 'received' ? 'default' : 'outline'}
                                  onClick={() => handleUpdateStatus(recipient.id, 'received')}
                                  className={`text-xs px-2 py-1 h-7 ${
                                    recipient.status === 'received' 
                                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                                      : 'border-green-200 text-green-700 hover:bg-green-50'
                                  }`}
                                >
                                  <CheckCircleIcon className="ml-1 h-3 w-3" />
                                  تم الاستلام
                                </Button>
                                <Button
                                  size="sm"
                                  variant={recipient.status === 'paid' ? 'default' : 'outline'}
                                  onClick={() => handleUpdateStatus(recipient.id, 'paid')}
                                  className={`text-xs px-2 py-1 h-7 ${
                                    recipient.status === 'paid' 
                                      ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                                      : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                                  }`}
                                >
                                  <DollarSignIcon className="ml-1 h-3 w-3" />
                                  تم الدفع
                                </Button>
                                <Button
                                  size="sm"
                                  variant={recipient.status === 'not_attended' ? 'default' : 'outline'}
                                  onClick={() => handleUpdateStatus(recipient.id, 'not_attended')}
                                  className={`text-xs px-2 py-1 h-7 ${
                                    recipient.status === 'not_attended' 
                                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                                      : 'border-red-200 text-red-700 hover:bg-red-50'
                                  }`}
                                >
                                  <XCircleIcon className="ml-1 h-3 w-3" />
                                  لم يحضر
                                </Button>
                              </div>
                              
                              {/* Notification Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendNotification([recipient.id])}
                                disabled={recipient.notified}
                                className={`text-xs px-2 py-1 h-7 ${
                                  recipient.notified
                                    ? 'border-green-200 text-green-700 bg-green-50'
                                    : 'border-border text-muted-foreground hover:bg-muted'
                                }`}
                              >
                                <BellIcon className="ml-1 h-3 w-3" />
                                {recipient.notified ? 'تم الإشعار' : 'إرسال إشعار'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {voucher.recipients.length === 0 
                    ? 'لا توجد مستفيدين لهذا الكوبونة' 
                    : 'لا توجد نتائج تطابق معايير البحث'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
