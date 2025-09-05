import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, ArrowRight, FileSpreadsheet, FileText, Users, Calendar, Phone, MapPin, AlertTriangle, Heart, Home, GraduationCap, Briefcase, Edit } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { calculateAge, getGenderInArabic, getRelationshipInArabic, generatePrintDate, generatePrintTime, getDamageDescriptionInArabic, getBranchInArabic, getSocialStatusInArabic, isChild, calculateDetailedAge } from "@/lib/utils";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Link, useRoute } from "wouter";
import { useSettings } from "@/hooks/use-settings";
import { useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Header } from "@/components/layout/header";

export default function Summary() {
  const { toast } = useToast();
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(true);
  const [showMembers, setShowMembers] = useState(true);
  const [showHousingInfo, setShowHousingInfo] = useState(true);
  const [showChildrenModal, setShowChildrenModal] = useState(false);
  const [match, params] = useRoute("/admin/families/:id/summary");
  const familyId = params?.id;

  const { data: family, isLoading: familyLoading, error } = useQuery({
    queryKey: ["/api/admin/families", familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const res = await fetchApi(`/api/admin/families/${familyId}`);
      if (!res.ok) throw new Error("Family not found");
      return res.json();
    }
  });

  // Extract members from family data instead of separate query
  const members = family?.members || [];

  // Filter children (under 2 years old)
  const children = members.filter((member: any) => isChild(member.birthDate));

  const totalMembers = members.length;
  const maleCount = members.filter((m: any) => m.gender === 'male').length;
  const femaleCount = members.filter((m: any) => m.gender === 'female').length;

  const storedTotalMembers = family?.totalMembers || 0;
  const storedNumMales = family?.numMales || 0;
  const storedNumFemales = family?.numFemales || 0;

  // Helper function to format age for PDF with proper RTL ordering
  const formatAgeForPDF = (birthDate: string): string => {
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
  };

  const handlePrint = () => {
    window.print();
    toast({
      title: "طباعة",
      description: "تم إرسال المستند للطابعة",
    });
  };

  const handleExportPDF = async () => {
    try {
      // Helper function to get housing status
      const getHousingStatus = () => {
        if (family.isAbroad) {
          return family.abroadLocation || 'مغترب بالخارج';
        } else if (family.isDisplaced) {
          return 'نازح';
        } else {
          return 'مقيم';
        }
      };

      // Helper function to clean RTL markers for PDF display
      const cleanAgeForPDF = (birthDate: string): string => {
        const detailedAge = calculateDetailedAge(birthDate);
        // Remove RTL markers for PDF display
        return detailedAge.replace(/\u202B/g, '').replace(/\u202C/g, '');
      };

      // Create PDF document
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Load Amiri fonts with better error handling
      let fontsLoaded = false;
      try {
        fontsLoaded = await loadAmiriFonts(doc);
        if (fontsLoaded) {
          console.log('Amiri fonts loaded successfully');
          doc.setFont('Amiri', 'normal');
        } else {
          console.log('Falling back to default font');
          doc.setFont('helvetica');
        }
      } catch (error) {
        console.error('Font loading failed:', error);
        doc.setFont('helvetica');
        fontsLoaded = false;
      }
      
      doc.setFontSize(16);

      // Add title
      doc.setFillColor(76, 175, 80); // Green background
      doc.rect(10, 10, 190, 15, 'F');
      doc.setTextColor(255, 255, 255); // White text
      doc.text('بيانات الأسرة - تقرير مفصل', 105, 20, { align: 'center' });

      // Reset text color
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);

      // Format date and time
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'م' : 'ص';
      const displayHours = hours % 12 || 12;
      const timeStr = `${ampm} ${displayHours}:${String(minutes).padStart(2, '0')}`;

      // Add export info - centered
      doc.text(`تاريخ التصدير: ${dateStr}`, 105, 35, { align: 'center' });
      doc.text(`وقت التصدير: ${timeStr}`, 105, 42, { align: 'center' });

      // Family Information Section
      doc.setFontSize(14);
      doc.setFillColor(76, 175, 80);
      doc.rect(10, 50, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('بيانات الأسرة', 105, 56, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      // Family data table - RTL order
      const familyData = [
        ['اسم الزوج رباعي', family.husbandName || ''],
        ['رقم هوية الزوج', family.husbandID || ''],
        ['عمل الزوج', family.husbandJob || ''],
        ['اسم الزوجة رباعي', family.wifeName || ''],
        ['رقم هوية الزوجة', family.wifeID || ''],
        ['عمل الزوجة', family.wifeJob || ''],
        ['هل الزوجة حامل', family.wifePregnant ? 'نعم' : 'لا'],
        ['رقم الجوال للتواصل', family.primaryPhone || ''],
        ['رقم الجوال البديل', family.secondaryPhone || ''],
        ['السكن الأصلي', family.originalResidence || ''],
        ['حالة السكن الحالي', getHousingStatus()],
        ['الاضرار الناجمة عن حرب 2024', family.warDamage2024 ? (family.warDamageDescription || 'نعم') : 'لا'],
        ['الفرع', getBranchInArabic(family.branch) || ''],
        ['هل يوجد افراد ذوي اعاقة في العائلة', family.hasDisabledMembers ? 'نعم' : 'لا'],
        ['هل لديك ابناء اقل من سنتين', family.hasChildrenUnderTwo ? 'نعم' : 'لا'],
        ['إجمالي أفراد الأسرة', (family.totalMembers || 0).toString()],
        ['عدد الذكور', (family.numMales || 0).toString()],
        ['عدد الإناث', (family.numFemales || 0).toString()],
        ['عدد الأطفال', children.length.toString()],
        ['الحالة الاجتماعية', getSocialStatusInArabic(family.socialStatus) || ''],
        ['مغترب بالخارج', family.isAbroad ? 'نعم' : 'لا']
      ];

      autoTable(doc, {
        startY: 70,
        head: [['المعلومات', 'البيان']], // RTL order: Information first, then Statement
        body: familyData.map(row => [row[1], row[0]]), // RTL order: Value first, then Label
        theme: 'grid',
        headStyles: {
          fillColor: [76, 175, 80],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: fontsLoaded ? 'Amiri' : 'helvetica',
          halign: 'center'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: fontsLoaded ? 'Amiri' : 'helvetica',
          textColor: [0, 0, 0] // Make text black instead of gray
        },
        columnStyles: {
          0: { cellMinWidth: 40, halign: 'center' }, // المعلومات column (Value)
          1: { cellMinWidth: 60, halign: 'right' }   // البيان column (Label) - RTL
        }
      });

      // Family Members Section - RTL order
      if (members && members.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setFillColor(76, 175, 80);
        doc.rect(10, 10, 190, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('أفراد الأسرة', 105, 16, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        const membersData = members.map((member: any) => [
          member.isDisabled ? (member.disabilityType || 'غير محدد') : '', // نوع الإعاقة
          member.isDisabled ? 'نعم' : 'لا', // إعاقة
          getRelationshipInArabic(member.relationship), // القرابة
          member.gender === 'male' ? 'ذكر' : 'أنثى', // الجنس
          cleanAgeForPDF(member.birthDate), // العمر using the same function as Excel
          member.birthDate || '', // تاريخ الميلاد
          member.memberID || '', // رقم الهوية
          member.fullName || '' // الاسم الكامل
        ]);

        autoTable(doc, {
          startY: 30,
          head: [['نوع الإعاقة', 'إعاقة', 'القرابة', 'الجنس', 'العمر', 'تاريخ الميلاد', 'رقم الهوية', 'الاسم الكامل']], // RTL order
          body: membersData,
          theme: 'grid',
          headStyles: {
            fillColor: [76, 175, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            font: fontsLoaded ? 'Amiri' : 'helvetica',
            halign: 'center'
          },
          styles: {
            fontSize: 8,
            cellPadding: 2,
            font: fontsLoaded ? 'Amiri' : 'helvetica',
            textColor: [0, 0, 0] // Make text black instead of gray
          },
          columnStyles: {
            0: { halign: 'center' }, // نوع الإعاقة
            1: { halign: 'center' }, // إعاقة
            2: { halign: 'center' }, // القرابة
            3: { halign: 'center' }, // الجنس
            4: { halign: 'center' }, // العمر
            5: { halign: 'center' }, // تاريخ الميلاد
            6: { halign: 'center' }, // رقم الهوية
            7: { halign: 'right' }   // الاسم الكامل (RTL)
          }
        });
      }

      // Children Section - RTL order with proper age sorting
      if (children.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setFillColor(76, 175, 80);
        doc.rect(10, 10, 190, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text('تفاصيل الأطفال', 105, 16, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        // Sort children by age: under 2 years first, then above 2 years
        const sortedChildren = [...children].sort((a: any, b: any) => {
          const ageA = calculateAge(a.birthDate);
          const ageB = calculateAge(b.birthDate);
          
          // Children under 2 years come first
          if (ageA < 2 && ageB >= 2) return -1;
          if (ageA >= 2 && ageB < 2) return 1;
          
          // Within the same age group, sort by actual age (youngest first)
          return ageA - ageB;
        });

        const childrenData = sortedChildren.map((child: any) => [
          child.isDisabled ? (child.disabilityType || 'غير محدد') : '', // نوع الإعاقة
          child.isDisabled ? 'نعم' : 'لا', // إعاقة
          getRelationshipInArabic(child.relationship), // القرابة
          child.gender === 'male' ? 'ذكر' : 'أنثى', // الجنس
          cleanAgeForPDF(child.birthDate), // العمر using the same function as Excel
          child.birthDate || '', // تاريخ الميلاد
          child.memberID || '', // رقم الهوية
          child.fullName || '' // الاسم الكامل
        ]);

        autoTable(doc, {
          startY: 30,
          head: [['نوع الإعاقة', 'إعاقة', 'القرابة', 'الجنس', 'العمر', 'تاريخ الميلاد', 'رقم الهوية', 'الاسم الكامل']], // RTL order
          body: childrenData,
          theme: 'grid',
          headStyles: {
            fillColor: [76, 175, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            font: fontsLoaded ? 'Amiri' : 'helvetica',
            halign: 'center'
          },
          styles: {
            fontSize: 8,
            cellPadding: 2,
            font: fontsLoaded ? 'Amiri' : 'helvetica',
            textColor: [0, 0, 0] // Make text black instead of gray
          },
          columnStyles: {
            0: { halign: 'center' }, // نوع الإعاقة
            1: { halign: 'center' }, // إعاقة
            2: { halign: 'center' }, // القرابة
            3: { halign: 'center' }, // الجنس
            4: { halign: 'center' }, // العمر
            5: { halign: 'center' }, // تاريخ الميلاد
            6: { halign: 'center' }, // رقم الهوية
            7: { halign: 'right' }   // الاسم الكامل (RTL)
          }
        });
      }

      // Summary Statistics Section - RTL order
      doc.addPage();
      doc.setFontSize(14);
      doc.setFillColor(76, 175, 80);
      doc.rect(10, 10, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('الملخص الإحصائي', 105, 16, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      const summaryData = [
        ['إجمالي أفراد الأسرة', (family.totalMembers || 0).toString()],
        ['عدد الذكور', (family.numMales || 0).toString()],
        ['عدد الإناث', (family.numFemales || 0).toString()],
        ['عدد الأطفال', children.length.toString()],
        ['الأبناء', children.filter((child: any) => child.gender === 'male').length.toString()],
        ['البنات', children.filter((child: any) => child.gender === 'female').length.toString()],
        ['الحالة الاجتماعية', family.socialStatus ? getSocialStatusInArabic(family.socialStatus) : 'غير محدد'],
        ['حالة الحمل', family.wifePregnant ? 'حامل' : 'غير حامل'],
        ['نازح', family.isDisplaced ? 'نعم' : 'لا'],
        ['موقع النزوح', family.isDisplaced ? (family.displacedLocation || '') : ''],
        ['مغترب بالخارج', family.isAbroad ? 'نعم' : 'لا'],
        ['أضرار الحرب 2024', family.warDamage2024 ? 'نعم' : 'لا'],
        ['تفاصيل الأضرار', family.warDamage2024 ? (family.warDamageDescription || '') : ''],
        ['إجمالي المعاقين', (members ? members.filter((m: any) => m.isDisabled).length : 0).toString()],
        ['الأطفال المعاقين', children.filter((child: any) => child.isDisabled).length.toString()],
        ['الأطفال أقل من سنتين', children.filter((child: any) => calculateAge(child.birthDate) < 2).length.toString()],
        ['الفرع', getBranchInArabic(family.branch) || 'غير محدد'],
        ['تاريخ التصدير', dateStr],
        ['وقت التصدير', timeStr],
        ['ملاحظات إدارية', family.adminNotes || 'لا توجد ملاحظات']
      ];

      autoTable(doc, {
        startY: 30,
        head: [['المعلومات', 'البيان']], // RTL order: Information first, then Statement
        body: summaryData.map(row => [row[1], row[0]]), // RTL order: Value first, then Label
        theme: 'grid',
        headStyles: {
          fillColor: [76, 175, 80],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: fontsLoaded ? 'Amiri' : 'helvetica',
          halign: 'center'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: fontsLoaded ? 'Amiri' : 'helvetica',
          textColor: [0, 0, 0] // Make text black instead of gray
        },
        columnStyles: {
          0: { cellMinWidth: 40, halign: 'center' }, // المعلومات column (Value)
          1: { cellMinWidth: 60, halign: 'right' }   // البيان column (Label) - RTL
        }
      });

      // Generate and download the PDF file
      const fileName = `family_data_${family.husbandName}_${dateStr}.pdf`;
      doc.save(fileName);

    toast({
        title: "تم التصدير بنجاح",
        description: `تم حفظ ملف PDF باسم: ${fileName}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات إلى PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      // Helper function to get housing status
      const getHousingStatus = () => {
        if (family.isAbroad) {
          return family.abroadLocation || 'مغترب بالخارج';
        } else if (family.isDisplaced) {
          return 'نازح';
        } else {
          return 'مقيم';
        }
      };

      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      
      // Define styles
      const titleStyle = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4CAF50' } // Green
        },
        font: {
          color: { argb: 'FFFFFFFF' }, // White
          bold: true,
          size: 16
        },
        alignment: {
          horizontal: 'center',
          vertical: 'middle'
        }
      };

      const headerStyle = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4CAF50' } // Green
        },
        font: {
          color: { argb: 'FFFFFFFF' }, // White
          bold: true,
          size: 12
        },
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        },
        border: {
          top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
        }
      };

      const dataStyle = {
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // 1. Family Information Sheet (بيانات الأسرة)
      const familySheet = workbook.addWorksheet('بيانات الأسرة');
      
      const familyHeaders = [
        'مغترب بالخارج', 'الحالة الاجتماعية', 'عدد الأطفال', 
        'عدد الإناث', 'عدد الذكور', 'إجمالي أفراد الأسرة', 'هل لديك ابناء اقل من سنتين', 
        'هل يوجد افراد ذوي اعاقة في العائلة', 'الفرع', 'الاضرار الناجمة عن حرب 2024', 
        'حالة السكن الحالي', 'السكن الأصلي', 'رقم الجوال البديل', 'رقم الجوال للتواصل', 
        'هل الزوجة حامل', 'عمل الزوجة', 'عمر الزوجة', 'تاريخ ميلاد الزوجة', 'رقم هوية الزوجة', 'اسم الزوجة رباعي', 
        'عمل الزوج', 'عمر الزوج', 'تاريخ ميلاد الزوج', 'رقم هوية الزوج', 'اسم الزوج رباعي'
      ];

      const familyData = [
        family.isAbroad ? 'نعم' : 'لا',
        getSocialStatusInArabic(family.socialStatus) || '',
        children.length,
        family.numFemales || 0,
        family.numMales || 0,
        family.totalMembers || 0,
        family.hasChildrenUnderTwo ? 'نعم' : 'لا',
        family.hasDisabledMembers ? 'نعم' : 'لا',
        getBranchInArabic(family.branch) || '',
        family.warDamage2024 ? (family.warDamageDescription || 'نعم') : 'لا',
        getHousingStatus(),
        family.originalResidence || '',
        family.secondaryPhone || '',
        family.primaryPhone || '',
        family.wifePregnant ? 'نعم' : 'لا',
        family.wifeJob || '',
        formatAgeForPDF(family.wifeBirthDate || ''), // عمر الزوجة
        family.wifeBirthDate || '', // تاريخ ميلاد الزوجة
        family.wifeID || '',
        family.wifeName || '',
        family.husbandJob || '',
        formatAgeForPDF(family.husbandBirthDate || ''), // عمر الزوج
        family.husbandBirthDate || '', // تاريخ ميلاد الزوج
        family.husbandID || '',
        family.husbandName || ''
      ];

      // Add title row with proper spacing
      const titleRow = familySheet.addRow(['بيانات الأسرة - تقرير مفصل']);
      titleRow.getCell(1).style = titleStyle;
      titleRow.height = 30; // Increase title row height
      familySheet.mergeCells(`A1:${String.fromCharCode(65 + familyHeaders.length - 1)}1`); // Merge based on header count

      // Add header row (no empty row)
      const headerRow = familySheet.addRow(familyHeaders);
      headerRow.height = 25; // Increase header row height
      headerRow.eachCell((cell) => {
        cell.style = headerStyle;
      });

      // Add data row
      const dataRow = familySheet.addRow(familyData);
      dataRow.height = 20; // Set data row height
      dataRow.eachCell((cell) => {
        cell.style = dataStyle;
      });

      // Set column widths with better alignment (updated for new columns)
      const columnWidths = [
        18, 20, 15, 15, 15, 20, 25, 30, 25, 30, 20, 25, 20, 20, 15, 20, 15, 20, 20, 25, 20, 15, 20, 20, 25
      ];
      columnWidths.forEach((width, index) => {
        familySheet.getColumn(index + 1).width = width;
      });

      // 2. Family Members Sheet (أفراد الأسرة)
      if (members && members.length > 0) {
        const membersSheet = workbook.addWorksheet('أفراد الأسرة');
        
        const memberHeaders = [
          'نوع الإعاقة', 'هل يوجد إعاقة', 'القرابة', 'الجنس', 
          'العمر', 'تاريخ الميلاد', 'رقم الهوية', 'الاسم الكامل'
        ];

        // Add title row
        const membersTitleRow = membersSheet.addRow(['أفراد الأسرة']);
        membersTitleRow.getCell(1).style = titleStyle;
        membersTitleRow.height = 30;
        membersSheet.mergeCells(`A1:${String.fromCharCode(65 + memberHeaders.length - 1)}1`);

        // Add header row (no empty row)
        const membersHeaderRow = membersSheet.addRow(memberHeaders);
        membersHeaderRow.height = 25;
        membersHeaderRow.eachCell((cell) => {
          cell.style = headerStyle;
        });

        // Add data rows
        members.forEach((member: any) => {
          const memberData = [
            member.isDisabled ? (member.disabilityType || 'غير محدد') : '',
            member.isDisabled ? 'نعم' : 'لا',
            getRelationshipInArabic(member.relationship),
            member.gender === 'male' ? 'ذكر' : 'أنثى',
            formatAgeForPDF(member.birthDate),
            member.birthDate || '',
            member.memberID || '',
            member.fullName || ''
          ];
          const row = membersSheet.addRow(memberData);
          row.height = 20;
          row.eachCell((cell) => {
            cell.style = dataStyle;
          });
        });

        // Set column widths
        const memberColumnWidths = [20, 15, 15, 12, 12, 15, 18, 30];
        memberColumnWidths.forEach((width, index) => {
          membersSheet.getColumn(index + 1).width = width;
        });
      }

      // 3. Children Sheet (الأطفال)
      if (children.length > 0) {
        const childrenSheet = workbook.addWorksheet('الأطفال');
        
        const childrenHeaders = [
          'نوع الإعاقة', 'هل يوجد إعاقة', 'القرابة', 'الجنس', 
          'العمر', 'تاريخ الميلاد', 'رقم الهوية', 'الاسم الكامل'
        ];

        // Add title row
        const childrenTitleRow = childrenSheet.addRow(['تفاصيل الأطفال']);
        childrenTitleRow.getCell(1).style = titleStyle;
        childrenTitleRow.height = 30;
        childrenSheet.mergeCells(`A1:${String.fromCharCode(65 + childrenHeaders.length - 1)}1`);

        // Add header row (no empty row)
        const childrenHeaderRow = childrenSheet.addRow(childrenHeaders);
        childrenHeaderRow.height = 25;
        childrenHeaderRow.eachCell((cell) => {
          cell.style = headerStyle;
        });

        // Sort children by age: under 2 years first, then above 2 years
        const sortedChildren = [...children].sort((a: any, b: any) => {
          const ageA = calculateAge(a.birthDate);
          const ageB = calculateAge(b.birthDate);
          
          // Children under 2 years come first
          if (ageA < 2 && ageB >= 2) return -1;
          if (ageA >= 2 && ageB < 2) return 1;
          
          // Within the same age group, sort by actual age (youngest first)
          return ageA - ageB;
        });

        // Add data rows
        sortedChildren.forEach((child: any) => {
          const childData = [
            child.isDisabled ? (child.disabilityType || 'غير محدد') : '',
            child.isDisabled ? 'نعم' : 'لا',
            getRelationshipInArabic(child.relationship),
            child.gender === 'male' ? 'ذكر' : 'أنثى',
            formatAgeForPDF(child.birthDate),
            child.birthDate || '',
            child.memberID || '',
            child.fullName || ''
          ];
          const row = childrenSheet.addRow(childData);
          row.height = 20;
          row.eachCell((cell) => {
            cell.style = dataStyle;
          });
        });

        // Set column widths
        const childColumnWidths = [20, 15, 15, 12, 12, 15, 18, 30];
        childColumnWidths.forEach((width, index) => {
          childrenSheet.getColumn(index + 1).width = width;
        });
      }

      // 4. Summary Sheet (الملخص)
      const summarySheet = workbook.addWorksheet('الملخص');
      
      const summaryHeaders = ['المعلومات', 'القيمة'];
      
      const summaryData = [
        ['إجمالي أفراد الأسرة', (family.totalMembers || 0).toString()],
        ['عدد الذكور', (family.numMales || 0).toString()],
        ['عدد الإناث', (family.numFemales || 0).toString()],
        ['عدد الأطفال', children.length.toString()],
        ['الأبناء', children.filter((child: any) => child.gender === 'male').length.toString()],
        ['البنات', children.filter((child: any) => child.gender === 'female').length.toString()],
        ['الحالة الاجتماعية', family.socialStatus ? getSocialStatusInArabic(family.socialStatus) : 'غير محدد'],
        ['حالة الحمل', family.wifePregnant ? 'حامل' : 'غير حامل'],
        ['نازح', family.isDisplaced ? 'نعم' : 'لا'],
        ['موقع النزوح', family.isDisplaced ? (family.displacedLocation || '') : ''],
        ['مغترب بالخارج', family.isAbroad ? 'نعم' : 'لا'],
        ['أضرار الحرب 2024', family.warDamage2024 ? 'نعم' : 'لا'],
        ['تفاصيل الأضرار', family.warDamage2024 ? (family.warDamageDescription || '') : ''],
        ['إجمالي المعاقين', (members ? members.filter((m: any) => m.isDisabled).length : 0).toString()],
        ['الأطفال المعاقين', children.filter((child: any) => child.isDisabled).length.toString()],
        ['الأطفال أقل من سنتين', children.filter((child: any) => calculateAge(child.birthDate) < 2).length.toString()],
        ['الفرع', getBranchInArabic(family.branch) || 'غير محدد'],
        ['تاريخ التصدير', new Date().toLocaleDateString('ar-EG')],
        ['وقت التصدير', new Date().toLocaleTimeString('ar-EG')],
        ['ملاحظات إدارية', family.adminNotes || 'لا توجد ملاحظات']
      ];

      // Add title row
      const summaryTitleRow = summarySheet.addRow(['الملخص الإحصائي']);
      summaryTitleRow.getCell(1).style = titleStyle;
      summaryTitleRow.height = 30;
      summarySheet.mergeCells('A1:B1');

      // Add header row
      const summaryHeaderRow = summarySheet.addRow(summaryHeaders);
      summaryHeaderRow.height = 25;
      summaryHeaderRow.eachCell((cell) => {
        cell.style = headerStyle;
      });

      // Add data rows
      summaryData.forEach(([label, value]) => {
        const row = summarySheet.addRow([label, value]);
        row.height = 20;
        row.eachCell((cell) => {
          cell.style = dataStyle;
        });
      });

      // Set column widths
      summarySheet.getColumn(1).width = 30;
      summarySheet.getColumn(2).width = 20;

      // Generate and download the Excel file
      const fileName = `family_data_${family.husbandName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "تم التصدير بنجاح",
        description: `تم حفظ ملف Excel باسم: ${fileName}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير البيانات إلى Excel",
        variant: "destructive",
      });
    }
  };

  const handlePrintChildren = () => {
    setShowChildrenModal(false);
    // Print children data specifically
    toast({
      title: "طباعة بيانات الأطفال",
      description: "تم إرسال بيانات الأطفال للطابعة",
    });
  };

  const handleExportChildrenPDF = async () => {
    try {
      setShowChildrenModal(false);
      
      // Helper function to clean RTL markers for PDF display
      const cleanAgeForPDF = (birthDate: string): string => {
        const detailedAge = calculateDetailedAge(birthDate);
        // Remove RTL markers for PDF display
        return detailedAge.replace(/\u202B/g, '').replace(/\u202C/g, '');
      };

      // Create PDF document
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Load Amiri fonts with better error handling
      let fontsLoaded = false;
      try {
        fontsLoaded = await loadAmiriFonts(doc);
        if (fontsLoaded) {
          console.log('Amiri fonts loaded successfully');
          doc.setFont('Amiri', 'normal');
        } else {
          console.log('Falling back to default font');
          doc.setFont('helvetica');
        }
      } catch (error) {
        console.error('Font loading failed:', error);
        doc.setFont('helvetica');
        fontsLoaded = false;
      }
      
      doc.setFontSize(16);

      // Add title
      doc.setFillColor(76, 175, 80); // Green background
      doc.rect(10, 10, 190, 15, 'F');
      doc.setTextColor(255, 255, 255); // White text
      doc.text('تفاصيل الأطفال - تقرير مفصل', 105, 20, { align: 'center' });

      // Reset text color
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);

      // Format date and time
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'م' : 'ص';
      const displayHours = hours % 12 || 12;
      const timeStr = `${ampm} ${displayHours}:${String(minutes).padStart(2, '0')}`;

      // Add export info - centered
      doc.text(`اسم رب الأسرة: ${family.husbandName}`, 105, 35, { align: 'center' });
      doc.text(`تاريخ التصدير: ${dateStr}`, 105, 42, { align: 'center' });
      doc.text(`وقت التصدير: ${timeStr}`, 105, 49, { align: 'center' });

      // Children Details Section
      doc.setFontSize(14);
      doc.setFillColor(76, 175, 80);
      doc.rect(10, 60, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('تفاصيل الأطفال', 105, 66, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      // Sort children by age: under 2 years first, then above 2 years
      const sortedChildren = [...children].sort((a: any, b: any) => {
        const ageA = calculateAge(a.birthDate);
        const ageB = calculateAge(b.birthDate);
        
        // Children under 2 years come first
        if (ageA < 2 && ageB >= 2) return -1;
        if (ageA >= 2 && ageB < 2) return 1;
        
        // Within the same age group, sort by actual age (youngest first)
        return ageA - ageB;
      });

      const childrenData = sortedChildren.map((child: any) => [
        child.isDisabled ? (child.disabilityType || 'غير محدد') : '', // نوع الإعاقة
        child.isDisabled ? 'نعم' : 'لا', // إعاقة
        getRelationshipInArabic(child.relationship), // القرابة
        child.gender === 'male' ? 'ذكر' : 'أنثى', // الجنس
        cleanAgeForPDF(child.birthDate), // العمر using the same function as Excel
        child.birthDate || '', // تاريخ الميلاد
        child.memberID || '', // رقم الهوية
        child.fullName || '' // الاسم الكامل
      ]);

      autoTable(doc, {
        startY: 80,
        head: [['نوع الإعاقة', 'إعاقة', 'القرابة', 'الجنس', 'العمر', 'تاريخ الميلاد', 'رقم الهوية', 'الاسم الكامل']], // RTL order
        body: childrenData,
        theme: 'grid',
        headStyles: {
          fillColor: [76, 175, 80],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: fontsLoaded ? 'Amiri' : 'helvetica',
          halign: 'center'
        },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          font: fontsLoaded ? 'Amiri' : 'helvetica',
          textColor: [0, 0, 0] // Make text black instead of gray
        },
        columnStyles: {
          0: { halign: 'center' }, // نوع الإعاقة
          1: { halign: 'center' }, // إعاقة
          2: { halign: 'center' }, // القرابة
          3: { halign: 'center' }, // الجنس
          4: { halign: 'center' }, // العمر
          5: { halign: 'center' }, // تاريخ الميلاد
          6: { halign: 'center' }, // رقم الهوية
          7: { halign: 'right' }   // الاسم الكامل (RTL)
        }
      });

      // Summary Statistics Section - RTL order
      doc.addPage();
      doc.setFontSize(14);
      doc.setFillColor(76, 175, 80);
      doc.rect(10, 10, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('الملخص الإحصائي للأطفال', 105, 16, { align: 'center' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);

      const summaryData = [
        ['إجمالي الأطفال', children.length.toString()],
        ['الأبناء', children.filter((child: any) => child.gender === 'male').length.toString()],
        ['البنات', children.filter((child: any) => child.gender === 'female').length.toString()],
        ['الأطفال المعاقين', children.filter((child: any) => child.isDisabled).length.toString()],
        ['الأطفال أقل من سنة', children.filter((child: any) => calculateAge(child.birthDate) < 1).length.toString()],
        ['الأطفال من سنة إلى سنتين', children.filter((child: any) => calculateAge(child.birthDate) >= 1 && calculateAge(child.birthDate) < 2).length.toString()],
        ['الأطفال من سنتين إلى 5 سنوات', children.filter((child: any) => calculateAge(child.birthDate) >= 2 && calculateAge(child.birthDate) < 5).length.toString()],
        ['الأطفال من 5 سنوات إلى 12 سنة', children.filter((child: any) => calculateAge(child.birthDate) >= 5 && calculateAge(child.birthDate) < 12).length.toString()],
        ['الأطفال من 12 سنة إلى 18 سنة', children.filter((child: any) => calculateAge(child.birthDate) >= 12 && calculateAge(child.birthDate) < 18).length.toString()],
        ['اسم رب الأسرة', family.husbandName || ''],
        ['تاريخ التصدير', dateStr],
        ['وقت التصدير', timeStr]
      ];

      autoTable(doc, {
        startY: 30,
        head: [['المعلومات', 'البيان']], // RTL order: Information first, then Statement
        body: summaryData.map(row => [row[1], row[0]]), // RTL order: Value first, then Label
        theme: 'grid',
        headStyles: {
          fillColor: [76, 175, 80],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: fontsLoaded ? 'Amiri' : 'helvetica',
          halign: 'center'
        },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: fontsLoaded ? 'Amiri' : 'helvetica',
          textColor: [0, 0, 0] // Make text black instead of gray
        },
        columnStyles: {
          0: { cellMinWidth: 40, halign: 'center' }, // المعلومات column (Value)
          1: { cellMinWidth: 60, halign: 'right' }   // البيان column (Label) - RTL
        }
      });

      // Generate and download the PDF file
      const fileName = `children_data_${family.husbandName}_${dateStr}.pdf`;
      doc.save(fileName);

      toast({
        title: "تم التصدير بنجاح",
        description: `تم حفظ ملف PDF باسم: ${fileName}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting children to PDF:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير بيانات الأطفال إلى PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportChildrenExcel = async () => {
    try {
      setShowChildrenModal(false);
      
      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      
      // Define styles
      const titleStyle = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4CAF50' } // Green
        },
        font: {
          color: { argb: 'FFFFFFFF' }, // White
          bold: true,
          size: 16
        },
        alignment: {
          horizontal: 'center',
          vertical: 'middle'
        }
      };

      const headerStyle = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4CAF50' } // Green
        },
        font: {
          color: { argb: 'FFFFFFFF' }, // White
          bold: true,
          size: 12
        },
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        },
        border: {
          top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
          right: { style: 'thin', color: { argb: 'FFFFFFFF' } }
        }
      };

      const dataStyle = {
        alignment: {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true
        },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // Children Sheet (الأطفال)
      const childrenSheet = workbook.addWorksheet('بيانات الأطفال');
      
      const childrenHeaders = [
        'نوع الإعاقة', 'هل يوجد إعاقة', 'القرابة', 'الجنس', 
        'العمر', 'تاريخ الميلاد', 'رقم الهوية', 'الاسم الكامل'
      ];

      // Add title row
      const childrenTitleRow = childrenSheet.addRow([`تفاصيل الأطفال - ${family.husbandName}`]);
      childrenTitleRow.getCell(1).style = titleStyle;
      childrenTitleRow.height = 30;
      childrenSheet.mergeCells(`A1:${String.fromCharCode(65 + childrenHeaders.length - 1)}1`);

      // Add header row
      const childrenHeaderRow = childrenSheet.addRow(childrenHeaders);
      childrenHeaderRow.height = 25;
      childrenHeaderRow.eachCell((cell) => {
        cell.style = headerStyle;
      });

      // Add data rows
      children.forEach((child: any) => {
        const childData = [
          child.isDisabled ? (child.disabilityType || 'غير محدد') : '',
          child.isDisabled ? 'نعم' : 'لا',
          getRelationshipInArabic(child.relationship),
          child.gender === 'male' ? 'ذكر' : 'أنثى',
          formatAgeForPDF(child.birthDate),
          child.birthDate || '',
          child.memberID || '',
          child.fullName || ''
        ];
        const row = childrenSheet.addRow(childData);
        row.height = 20;
        row.eachCell((cell) => {
          cell.style = dataStyle;
        });
      });

      // Set column widths
      const childrenColumnWidths = [20, 15, 15, 12, 12, 15, 18, 30];
      childrenColumnWidths.forEach((width, index) => {
        childrenSheet.getColumn(index + 1).width = width;
      });

      // Summary Statistics Sheet (ملخص إحصائي للأطفال)
      const summarySheet = workbook.addWorksheet('ملخص إحصائي للأطفال');
      
      const summaryHeaders = [
        'التفاصيل', 'القيمة', 'المعلومات'
      ];

      // Format time in 12-hour format with Arabic AM/PM on the left for Arabic RTL
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'م' : 'ص'; // م for PM, ص for AM
      const displayHours = hours % 12 || 12;
      const timeStr = `${ampm} ${displayHours}:${String(minutes).padStart(2, '0')}`;

      const summaryData = [
        ['', children.length, 'إجمالي الأطفال'],
        ['', children.filter((child: any) => child.gender === 'male').length, 'الأبناء'],
        ['', children.filter((child: any) => child.gender === 'female').length, 'البنات'],
        ['', children.filter((child: any) => child.isDisabled).length, 'الأطفال المعاقين'],
        ['', children.filter((child: any) => calculateAge(child.birthDate) < 1).length, 'الأطفال أقل من سنة'],
        ['', children.filter((child: any) => calculateAge(child.birthDate) >= 1 && calculateAge(child.birthDate) < 2).length, 'الأطفال من سنة إلى سنتين'],
        ['', family.husbandName || '', 'اسم رب الأسرة'],
        ['', dateStr, 'تاريخ التصدير'],
        ['', timeStr, 'وقت التصدير']
      ];

      // Add title row
      const summaryTitleRow = summarySheet.addRow(['ملخص إحصائي للأطفال']);
      summaryTitleRow.getCell(1).style = titleStyle;
      summaryTitleRow.height = 30;
      summarySheet.mergeCells(`A1:${String.fromCharCode(65 + summaryHeaders.length - 1)}1`);

      // Add header row
      const summaryHeaderRow = summarySheet.addRow(summaryHeaders);
      summaryHeaderRow.height = 25;
      summaryHeaderRow.eachCell((cell) => {
        cell.style = headerStyle;
      });

      // Add data rows
      summaryData.forEach(row => {
        const dataRow = summarySheet.addRow(row);
        dataRow.height = 20;
        dataRow.eachCell((cell) => {
          cell.style = dataStyle;
        });
      });

      // Set column widths
      summarySheet.getColumn(1).width = 40;
      summarySheet.getColumn(2).width = 20;
      summarySheet.getColumn(3).width = 30;

      // Generate and download the Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `children_data_${family.husbandName}_${dateStr}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "تم التصدير بنجاح",
        description: `تم حفظ ملف Excel باسم: children_data_${family.husbandName}_${dateStr}.xlsx`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error exporting children to Excel:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير بيانات الأطفال إلى Excel",
        variant: "destructive",
      });
    }
  };

  // Helper function to get housing status
  const getHousingStatus = () => {
    if (family.isAbroad) {
      return family.abroadLocation || 'مغترب بالخارج';
    } else if (family.isDisplaced) {
      return 'نازح';
    } else {
      return 'مقيم';
    }
  };
  
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

  if (!family) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">لم يتم العثور على بيانات الأسرة</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Print Header (hidden in screen view) */}
        <div className="text-center mb-6 sm:mb-8 print-only">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-2">بيانات الأسرة - تقرير مفصل</h1>
          <p className="text-sm sm:text-base text-muted-foreground">تاريخ الطباعة: {generatePrintDate()}</p>
        </div>

        {/* Control Panel (Hidden in print) */}
        <Card className="mb-4 sm:mb-6 no-print">
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">إعدادات العرض والطباعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  id="showSensitiveInfo"
                  checked={showSensitiveInfo}
                  onCheckedChange={setShowSensitiveInfo}
                />
                <Label htmlFor="showSensitiveInfo" className="text-sm sm:text-base">عرض المعلومات الحساسة</Label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  id="showMembers"
                  checked={showMembers}
                  onCheckedChange={setShowMembers}
                />
                <Label htmlFor="showMembers" className="text-sm sm:text-base">عرض أفراد الأسرة</Label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Switch
                  id="showHousingInfo"
                  checked={showHousingInfo}
                  onCheckedChange={setShowHousingInfo}
                />
                <Label htmlFor="showHousingInfo" className="text-sm sm:text-base">عرض بيانات السكن</Label>
              </div>

              <Dialog open={showChildrenModal} onOpenChange={setShowChildrenModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full text-sm sm:text-base">
                    <Users className="h-4 w-4 ml-2" />
                    بيانات الأطفال
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl mx-4">
                  <DialogHeader>
                    <DialogTitle className="text-center text-lg sm:text-xl">بيانات الأطفال - {family.husbandName}</DialogTitle>
                    <DialogDescription className="text-center text-sm sm:text-base">
                      عرض تفاصيل جميع الأطفال في الأسرة مع إمكانية التصدير والطباعة
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-blue-600">{children.length}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">إجمالي الأطفال</p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-green-600">
                          {children.filter((child: any) => child.gender === 'male').length}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">الأبناء</p>
                      </div>
                      <div className="text-center p-3 sm:p-4 bg-pink-50 rounded-lg">
                        <p className="text-xl sm:text-2xl font-bold text-pink-600">
                          {children.filter((child: any) => child.gender === 'female').length}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground">البنات</p>
              </div>
            </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-background">
                            <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">الاسم الكامل</th>
                            <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">رقم الهوية</th>
                            <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">تاريخ الميلاد</th>
                            <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">العمر</th>
                            <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">الجنس</th>
                            <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">القرابة</th>
                            <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">إعاقة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {children.map((child: any) => (
                            <tr key={child.id}>
                              <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{child.fullName}</td>
                              <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{child.memberID || 'غير محدد'}</td>
                              <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{child.birthDate}</td>
                              <td className="border border-gray-300 px-2 sm:px-4 py-2">
                                <Badge variant="outline" className="text-xs">{formatAgeForPDF(child.birthDate)}</Badge>
                              </td>
                              <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{getGenderInArabic(child.gender)}</td>
                              <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{getRelationshipInArabic(child.relationship)}</td>
                              <td className="border border-gray-300 px-2 sm:px-4 py-2">
                                {child.isDisabled ? (
                                  <Badge variant="destructive" className="text-xs">نعم</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">لا</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                      {children.map((child: any) => (
                        <div key={child.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-foreground text-sm">{child.fullName}</h4>
                            {child.isDisabled ? (
                              <Badge variant="destructive" className="text-xs">معاق</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">سليم</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">رقم الهوية:</span>
                              <span className="mr-1">{child.memberID || 'غير محدد'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">الجنس:</span>
                              <span className="mr-1">{getGenderInArabic(child.gender)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">تاريخ الميلاد:</span>
                              <span className="mr-1">{child.birthDate}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">العمر:</span>
                              <span className="mr-1">{formatAgeForPDF(child.birthDate)}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">القرابة:</span>
                              <span className="mr-1">{getRelationshipInArabic(child.relationship)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 pt-4">
                      <Button onClick={handlePrintChildren} variant="outline" className="w-full sm:w-auto text-sm sm:text-base">
                        <Printer className="h-4 w-4 ml-2" />
                        طباعة
              </Button>
                      <Button onClick={handleExportChildrenPDF} variant="outline" className="w-full sm:w-auto text-sm sm:text-base">
                        <FileText className="h-4 w-4 ml-2" />
                        PDF
                      </Button>
                      <Button onClick={handleExportChildrenExcel} variant="outline" className="w-full sm:w-auto text-sm sm:text-base">
                        <FileSpreadsheet className="h-4 w-4 ml-2" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center">
                <Button onClick={handlePrint} className="bg-primary text-primary-foreground w-full sm:w-auto text-sm sm:text-base">
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </Button>
                <Button onClick={handleExportPDF} className="bg-red-600 text-white hover:bg-red-700 w-full sm:w-auto text-sm sm:text-base">
                <FileText className="h-4 w-4 ml-2" />
                PDF
                </Button>
              <Button onClick={handleExportExcel} className="bg-green-600 text-white hover:bg-green-700 w-full sm:w-auto text-sm sm:text-base">
                <FileSpreadsheet className="h-4 w-4 ml-2" />
                Excel
              </Button>
              <Link href={`/admin/families/${familyId}/edit`}>
                <Button variant="outline" className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto text-sm sm:text-base">
                  <Users className="h-4 w-4 ml-2" />
                  تعديل أفراد الأسرة
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Family Data Card */}
        <Card className="print-card">
          <CardContent className="p-8">
            {/* Head of Family Information */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 pb-2 border-b border-gray-300 flex items-center">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                بيانات رب الأسرة
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">الاسم الرباعي</p>
                  <p className="text-sm sm:text-base lg:text-lg text-foreground break-words">{family.husbandName}</p>
                </div>
                {showSensitiveInfo && (
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">رقم الهوية</p>
                    <p className="text-sm sm:text-base lg:text-lg text-foreground">{family.husbandID}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">تاريخ الميلاد</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <p className="text-sm sm:text-base lg:text-lg text-foreground">{family.husbandBirthDate}</p>
                    <Badge variant="outline" className="text-xs w-fit">
                      {calculateAge(family.husbandBirthDate)} سنة
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">المهنة</p>
                  <p className="text-sm sm:text-base lg:text-lg text-foreground break-words">{family.husbandJob}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">رقم الجوال الأساسي</p>
                  <div className="flex items-center">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 ml-2 text-muted-foreground" />
                  <p className="text-sm sm:text-base lg:text-lg text-foreground">{family.primaryPhone}</p>
                  </div>
                </div>
                {family.secondaryPhone && (
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">رقم الجوال البديل</p>
                    <div className="flex items-center">
                      <Phone className="h-3 w-3 sm:h-4 sm:w-4 ml-2 text-muted-foreground" />
                    <p className="text-sm sm:text-base lg:text-lg text-foreground">{family.secondaryPhone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Wife Information */}
            {family.wifeName && (
              <div className="mb-6 sm:mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 pb-2 border-b border-gray-300 flex items-center">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                  بيانات الزوجة
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">الاسم الرباعي</p>
                    <p className="text-sm sm:text-base lg:text-lg text-foreground break-words">{family.wifeName}</p>
                  </div>
                  {showSensitiveInfo && family.wifeID && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">رقم الهوية</p>
                      <p className="text-sm sm:text-base lg:text-lg text-foreground">{family.wifeID}</p>
                    </div>
                  )}
                  {family.wifeBirthDate && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">تاريخ الميلاد</p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <p className="text-sm sm:text-base lg:text-lg text-foreground">{family.wifeBirthDate}</p>
                        <Badge variant="outline" className="text-xs w-fit">
                          {calculateAge(family.wifeBirthDate)} سنة
                        </Badge>
                      </div>
                    </div>
                  )}
                  {family.wifeJob && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">المهنة</p>
                      <p className="text-sm sm:text-base lg:text-lg text-foreground break-words">{family.wifeJob}</p>
                    </div>
                  )}
                  {family.wifePregnant && (
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">حالة الحمل</p>
                      <Badge variant={family.wifePregnant ? "destructive" : "secondary"} className="text-xs w-fit">
                        {family.wifePregnant ? 'حامل' : 'غير حامل'}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Housing Information */}
            {showHousingInfo && (
              <Card className="mb-4 sm:mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Home className="h-4 w-4 sm:h-5 sm:w-5" />
                    معلومات السكن
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">المسكن الأصلي</Label>
                      <p className="text-xs sm:text-sm text-foreground mt-1 break-words">
                        {family?.originalResidence || "غير محدد"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">حالة السكن الحالي</Label>
                      <div className="mt-1">
                        {family?.isAbroad ? (
                          <Badge variant="destructive" className="text-xs w-fit">
                            <MapPin className="h-3 w-3 ml-1" />
                            مغترب بالخارج
                          </Badge>
                        ) : family?.isDisplaced ? (
                          <Badge variant="destructive" className="text-xs w-fit">
                            <AlertTriangle className="h-3 w-3 ml-1" />
                            نازح
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs w-fit">
                            <Home className="h-3 w-3 ml-1" />
                            مقيم
                          </Badge>
                        )}
                      </div>
                    </div>
                    {family?.isDisplaced && (
                    <div>
                        <Label className="text-xs sm:text-sm font-medium text-muted-foreground">موقع النزوح</Label>
                        <p className="text-xs sm:text-sm text-foreground mt-1 break-words">
                          {family?.displacedLocation || "غير محدد"}
                        </p>
                    </div>
                  )}
                    {family?.isAbroad && (
                    <div>
                        <Label className="text-xs sm:text-sm font-medium text-muted-foreground">الموقع في الخارج</Label>
                        <p className="text-xs sm:text-sm text-foreground mt-1 break-words">
                          {family?.abroadLocation || "غير محدد"}
                        </p>
                    </div>
                  )}
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">أضرار الحرب 2024</Label>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                        {family?.warDamage2024 ? (
                          <Badge variant="destructive" className="text-xs w-fit">
                            <AlertTriangle className="h-3 w-3 ml-1" />
                            متضرر ({family?.warDamageDescription})
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs w-fit">
                            <Home className="h-3 w-3 ml-1" />
                            غير متضرر
                          </Badge>
                  )}
                </div>
              </div>
                    <div>
                      <Label className="text-xs sm:text-sm font-medium text-muted-foreground">الفرع</Label>
                      <p className="text-xs sm:text-sm text-foreground mt-1 break-words">
                        {getBranchInArabic(family?.branch) || "غير محدد"}
                      </p>
                </div>
              </div>
                </CardContent>
              </Card>
            )}

            {/* Family Status */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 pb-2 border-b border-gray-300 flex items-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                الحالة العامة للأسرة
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="text-center p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-primary">{totalMembers || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">إجمالي أفراد الأسرة  (محسوب)</p>
                  <p className="text-xs text-muted-foreground">محفوظ: {storedTotalMembers}</p>
                  
                </div>
                <div className="text-center p-3 sm:p-4 bg-green-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-secondary">{maleCount || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">عدد الذكور (محسوب)</p>
                  <p className="text-xs text-muted-foreground">محفوظ: {storedNumMales}</p>
                </div>
                <div className="text-center p-3 sm:p-4 bg-pink-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-pink-600">{femaleCount || 0}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">عدد الإناث (محسوب)</p>
                  <p className="text-xs text-muted-foreground">محفوظ: {storedNumFemales}</p>

                </div>
                <div className="text-center p-3 sm:p-4 bg-yellow-50 rounded-lg">
                  <p className="text-xl sm:text-2xl font-bold text-yellow-600">{children.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">عدد الأطفال (تحت 2 سنة)</p>
                  </div>
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {family.socialStatus && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                    <span className="text-xs sm:text-sm font-medium text-muted-foreground">الحالة الاجتماعية:</span>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs w-fit">
                      {getSocialStatusInArabic(family.socialStatus)}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Family Members */}
            {showMembers && members && members.length > 0 && (
              <div className="mb-6 sm:mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 pb-2 border-b border-gray-300 flex items-center">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                  أفراد الأسرة
                </h3>
                
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-background">
                        <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">الاسم الكامل</th>
                        <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">رقم الهوية</th>
                        <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">تاريخ الميلاد</th>
                        <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">العمر</th>
                        <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">الجنس</th>
                        <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">القرابة</th>
                        <th className="border border-gray-300 px-2 sm:px-4 py-2 text-right font-medium text-muted-foreground text-xs sm:text-sm">إعاقة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member: any) => (
                        <tr key={member.id}>
                          <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{member.fullName}</td>
                          <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{member.memberID || 'غير محدد'}</td>
                          <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{member.birthDate}</td>
                          <td className="border border-gray-300 px-2 sm:px-4 py-2">
                            <Badge variant="outline" className="text-xs">{formatAgeForPDF(member.birthDate)}</Badge>
                          </td>
                          <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{getGenderInArabic(member.gender)}</td>
                          <td className="border border-gray-300 px-2 sm:px-4 py-2 text-xs sm:text-sm">{getRelationshipInArabic(member.relationship)}</td>
                          <td className="border border-gray-300 px-2 sm:px-4 py-2">
                            {member.isDisabled ? (
                              <Badge variant="destructive" className="text-xs">نعم</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">لا</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {members.map((member: any) => (
                    <div key={member.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-foreground text-sm">{member.fullName}</h4>
                        {member.isDisabled ? (
                          <Badge variant="destructive" className="text-xs">معاق</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">سليم</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">رقم الهوية:</span>
                          <span className="mr-1">{member.memberID || 'غير محدد'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">الجنس:</span>
                          <span className="mr-1">{getGenderInArabic(member.gender)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">تاريخ الميلاد:</span>
                          <span className="mr-1">{member.birthDate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">العمر:</span>
                          <span className="mr-1">{formatAgeForPDF(member.birthDate)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">القرابة:</span>
                          <span className="mr-1">{getRelationshipInArabic(member.relationship)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Administrative Notes */}
            {family.adminNotes && (
              <div className="mb-6 sm:mb-8">
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 pb-2 border-b border-gray-300 flex items-center">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                  ملاحظات إدارية
                </h3>
                <div className="bg-background p-3 sm:p-4 rounded-lg">
                  <p className="text-sm sm:text-base text-gray-700 break-words">{family.adminNotes}</p>
                </div>
              </div>
            )}

            {/* Footer for print */}
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-300 text-center text-xs sm:text-sm text-muted-foreground print-only">
              <p>تم إنشاء هذا التقرير بواسطة {settings.siteName || "نظام إدارة البيانات العائلية"}</p>
              <p className="mt-2">تاريخ الطباعة: {generatePrintDate()} | الوقت: {generatePrintTime()}</p>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-between gap-4 sm:gap-0">
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2 mt-6 sm:mt-8 w-24 sm:w-32 mx-auto">
                    <p className="text-xs sm:text-sm">توقيع المسؤول</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-gray-400 pt-2 mt-6 sm:mt-8 w-24 sm:w-32 mx-auto">
                    <p className="text-xs sm:text-sm">ختم الإدارة</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}