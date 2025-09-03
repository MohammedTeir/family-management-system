import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export function calculateAge(birthDate: string): number {
  if (!birthDate) return 0;
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

export function calculateDetailedAge(birthDate: string): string {
  if (!birthDate) return "غير محدد";
  
  const today = new Date();
  const birth = new Date(birthDate);
  
  const yearDiff = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const dayDiff = today.getDate() - birth.getDate();
  
  let years = yearDiff;
  let months = monthDiff;
  let days = dayDiff;
  
  // Adjust for negative months/days
  if (days < 0) {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, birth.getDate());
    days = Math.floor((today.getTime() - lastMonth.getTime()) / (1000 * 60 * 60 * 24));
    months--;
  }
  
  if (months < 0) {
    months += 12;
    years--;
  }
  
  // For children under 1 year, show months and days with proper Arabic formatting
  if (years === 0) {
    if (months === 0) {
      return `\u202B${days} يوم\u202C`;
    } else if (days === 0) {
      return `\u202B${months} شهر\u202C`;
    } else {
      return `\u202B${months} شهر و ${days} يوم\u202C`;
    }
  }
  
  // For older children and adults, show years with proper Arabic formatting
  return `\u202B${years} سنة\u202C`;
}

export function isChild(birthDate: string): boolean {
  return calculateAge(birthDate) < 2;
}

export function getRequestStatusInArabic(status: string): string {
  const statusMap: Record<string, string> = {
    pending: 'قيد المراجعة',
    approved: 'موافق عليه',
    rejected: 'مرفوض'
  };
  return statusMap[status] || status;
}

export function getRequestTypeInArabic(type: string): string {
  const typeMap: Record<string, string> = {
    financial: 'مساعدة مالية',
    medical: 'مساعدة طبية',
    damage: 'تقرير أضرار'
  };
  return typeMap[type] || type;
}

export function getGenderInArabic(gender: string): string {
  const genderMap: Record<string, string> = {
    male: 'ذكر',
    female: 'أنثى'
  };
  return genderMap[gender] || gender;
}

export function getRelationshipInArabic(relationship: string): string {
  const relationshipMap: Record<string, string> = {
    son: 'ابن',
    daughter: 'ابنة',
    mother: 'أم',
    father: 'أب',
    brother: 'أخ',
    sister: 'أخت',
    other: 'أخرى'
  };
  return relationshipMap[relationship] || relationship;
}

export function formatPhoneNumber(phone: string): string {
  // Format Palestinian phone numbers
  if (phone.startsWith('+970')) {
    return phone.replace('+970', '0');
  }
  return phone;
}

export function validateNationalId(id: string): boolean {
  // Basic Palestinian ID validation (9 digits)
  return /^\d{9}$/.test(id);
}

export function generatePrintDate(): string {
  const now = new Date();
  return now.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function generatePrintTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getBranchInArabic(branch: string): string {
  const branches: Record<string, string> = {
    abouda_abunasr: "عائلة ابوعودة + ابو نصر",
    married_daughters_displaced: "بنات العائلة متزوجات خارج العائلة, نازحين عند عائلة ابو طير",
    alnogra: "النقرة",
    abushalbia_abumatar: "ابو شلبية + ابو مطر",
  };

  return branches[branch] || branch;
}

export function getDamageDescriptionInArabic(damageType: string): string {
  const damageTypes: Record<string, string> = {
    total_destruction_uninhabitable: "هدم كلي غير قابل للسكن",
    partial_destruction_habitable: "هدم جزئي قابل للسكن",
    minor_damage: "اضرار بسيطة",
  };

  return damageTypes[damageType] || damageType;
}

export function getSocialStatusInArabic(status: string): string {
  const socialStatuses: Record<string, string> = {
    married: "متزوج",
    divorced: "مطلق",
    widowed: "أرمل",
  };

  return socialStatuses[status] || status;
}

/**
 * Validate password against policy settings.
 * @param password The password to validate
 * @param settings The settings object containing password policy
 * @returns Array of Arabic error messages (empty if valid)
 */
export function validatePasswordWithPolicy(password: string, settings: {
  minPasswordLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}): string[] {
  const errors: string[] = [];
  const minLength = settings.minPasswordLength ?? 8;
  const requireUppercase = settings.requireUppercase ?? true;
  const requireLowercase = settings.requireLowercase ?? true;
  const requireNumbers = settings.requireNumbers ?? true;
  const requireSpecialChars = settings.requireSpecialChars ?? false;

  if (password.length < minLength) {
    errors.push(`كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`);
  }
  if (requireUppercase && !/[A-Z -]/.test(password)) {
    errors.push("كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل");
  }
  if (requireLowercase && !/[a-z -]/.test(password)) {
    errors.push("كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل");
  }
  if (requireNumbers && !/\d/.test(password)) {
    errors.push("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");
  }
  if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل");
  }
  return errors;
}