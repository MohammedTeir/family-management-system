import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { storage } from "./storage";
import { insertFamilySchema, insertWifeSchema, insertMemberSchema, insertRequestSchema, insertNotificationSchema, insertSupportVoucherSchema, insertVoucherRecipientSchema } from "./schema.js";
import { z } from "zod";
import passport from "passport";
import multer from "multer";
import cors from "cors";
import pg from "pg";
import * as XLSX from "xlsx";
const upload = multer({ storage: multer.memoryStorage() });

// Utility function for request type translation
function getRequestTypeInArabic(type: string): string {
  switch (type) {
    case 'financial': return 'مساعدة مالية';
    case 'medical': return 'مساعدة طبية';
    case 'damage': return 'تعويض أضرار';
    default: return type;
  }
}

// Helper: isHeadOrDualRole
function isHeadOrDualRole(user: any, family?: any) {
  // True if user is head, or admin with a family (dual-role)
  return user.role === 'head' || (user.role === 'admin' && family);
}

// Helper: getFamilyByIdOrDualRole
async function getFamilyByIdOrDualRole(familyId: number) {
  let family = await storage.getFamily(familyId);
  if (!family) {
    // Try to find a family whose user is an admin with a numeric username (dual-role head)
    const allFamilies = await storage.getAllFamilies();
    family = allFamilies.find(f => f.id === familyId);
    // Optionally, you could also check for user role and username pattern if needed
  }
  return family;
}

export function registerRoutes(app: Express): Server {
  // Add CORS configuration for cross-origin requests
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  }));

  setupAuth(app);

  // Excel import route for bulk importing head users
  app.post("/api/admin/import-heads", upload.single("excel"), async (req, res) => {
    if (!req.isAuthenticated() || !['admin', 'root'].includes(req.user!.role)) {
      console.log(`❌ Unauthorized import attempt by user: ${req.user?.username || 'anonymous'}`);
      return res.sendStatus(403);
    }
    
    console.log(`📊 Excel import started by user: ${req.user!.username}`);
    
    try {
      if (!req.file) {
        console.log('❌ No file uploaded');
        return res.status(400).json({ message: "يرجى رفع ملف Excel" });
      }

      console.log(`📁 File uploaded: ${req.file.originalname}, Size: ${req.file.size} bytes`);

      // Validate file size (max 10MB)
      if (req.file.size > 10 * 1024 * 1024) {
        console.log(`❌ File too large: ${req.file.size} bytes`);
        return res.status(400).json({ message: "حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت" });
      }

      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      console.log(`📋 Processing sheet: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (!data || data.length === 0) {
        console.log('❌ Empty Excel file');
        return res.status(400).json({ message: "ملف Excel فارغ أو لا يحتوي على بيانات" });
      }

      console.log(`📊 Found ${data.length} rows to process`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        const rowIndex = i + 2; // Excel rows start from 2 (accounting for header)

        try {
          // Validate required fields
          if (!row.husbandName || !row.husbandID) {
            errors.push(`الصف ${rowIndex}: اسم رب الأسرة ورقم الهوية مطلوبان`);
            errorCount++;
            continue;
          }

          // Check if user already exists
          const existingUser = await storage.getUserByNationalId(row.husbandID);
          if (existingUser) {
            errors.push(`الصف ${rowIndex}: رقم الهوية ${row.husbandID} مسجل مسبقاً`);
            errorCount++;
            continue;
          }

          // Validate ID format (9 digits)
          if (!/^\d{9}$/.test(row.husbandID)) {
            errors.push(`الصف ${rowIndex}: رقم الهوية ${row.husbandID} يجب أن يكون 9 أرقام`);
            errorCount++;
            continue;
          }

          // Create user
          const user = await storage.createUser({
            username: row.husbandID,
            password: await hashPassword(row.husbandID), // Use ID as default password
            role: 'head',
            phone: row.primaryPhone || null
          });

          // Create family
          const familyData = {
            userId: user.id,
            husbandName: row.husbandName,
            husbandID: row.husbandID,
            husbandBirthDate: row.husbandBirthDate || null,
            husbandJob: row.husbandJob || null,
            primaryPhone: row.primaryPhone || null,
            secondaryPhone: row.secondaryPhone || null,
            originalResidence: row.originalResidence || null,
            currentHousing: row.currentHousing || null,
            isDisplaced: Boolean(row.isDisplaced),
            displacedLocation: row.displacedLocation || null,
            isAbroad: Boolean(row.isAbroad),
            warDamage2024: Boolean(row.warDamage2024),
            warDamageDescription: row.warDamageDescription || null,
            branch: row.branch || null,
            landmarkNear: row.landmarkNear || null,
            totalMembers: parseInt(row.totalMembers) || 0,
            numMales: parseInt(row.numMales) || 0,
            numFemales: parseInt(row.numFemales) || 0,
            socialStatus: row.socialStatus || null,
            adminNotes: row.adminNotes || null
          };

          await storage.createFamily(familyData);
          successCount++;

        } catch (error: any) {
          errors.push(`الصف ${rowIndex}: ${error.message}`);
          errorCount++;
        }
      }

      const resultMessage = `تم استيراد ${successCount} عائلة بنجاح، فشل في ${errorCount} صف`;
      console.log(`✅ Import completed: ${resultMessage}`);
      
      res.json({
        message: resultMessage,
        successCount,
        errorCount,
        errors: errors.slice(0, 20) // Limit errors to first 20 to avoid huge responses
      });

    } catch (error: any) {
      console.error('❌ Excel import error:', error);
      console.error('Stack trace:', error.stack);
      
      let errorMessage = "خطأ في استيراد ملف Excel";
      if (error.message.includes('Invalid file format')) {
        errorMessage = "تنسيق الملف غير صحيح. يرجى استخدام ملف Excel (.xlsx أو .xls)";
      } else if (error.message.includes('Permission denied')) {
        errorMessage = "ليس لديك صلاحية لهذه العملية";
      } else {
        errorMessage += ": " + error.message;
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });

  // Patch: Return Arabic error for login failures as plain text
  app.post("/api/login", async (req, res, next) => {
    try {
      const { username, password } = req.body;
      
      // Special case: If password is empty/null/undefined, look for user with head role by identity number
      if (!password || password === "" || password === null || password === undefined) {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return res.status(401).send("معلومات الدخول خاطئة - راجع لجنة العائلة");
        }
        
        // Allow heads OR admins with 9-digit usernames (promoted heads) to login without password
        const isPromotedHead = user.role === 'admin' && /^\d{9}$/.test(user.username);
        if (user.role !== 'head' && !isPromotedHead) {
          return res.status(401).send("فشل تسجيل الدخول: كلمة المرور مطلوبة");
        }
        
        // For head users, verify they have a family record
        if (user.role === 'head') {
          const family = await storage.getFamilyByUserId(user.id);
          if (!family) {
            return res.status(401).send("معلومات الدخول خاطئة - راجع لجنة العائلة");
          }
        }
        
        // Check if account is locked out
        if (user.lockoutUntil && new Date() < user.lockoutUntil) {
          const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - new Date().getTime()) / (1000 * 60));
          return res.status(423).send(`الحساب محظور مؤقتاً. يرجى المحاولة بعد ${remainingMinutes} دقيقة`);
        }
        
        // Login successful for head - reset failed attempts
        await storage.updateUser(user.id, {
          failedLoginAttempts: 0,
          lockoutUntil: null
        });
        
        // Complete the login process
        req.login(user, (err: any) => {
          if (err) return next(err);
          res.status(200).json(user);
        });
        return;
      }
      
      // Get user by username first to check lockout status
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).send("معلومات الدخول خاطئة - راجع لجنة العائلة");
      }
      
      // Check if account is locked out
      if (user.lockoutUntil && new Date() < user.lockoutUntil) {
        const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - new Date().getTime()) / (1000 * 60));
        return res.status(423).send(`الحساب محظور مؤقتاً. يرجى المحاولة بعد ${remainingMinutes} دقيقة`);
      }
      
      // Get lockout settings
      const settings = await storage.getAllSettings();
      const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
      const maxLoginAttempts = parseInt(settingsMap.maxLoginAttempts || "5");
      const lockoutDuration = parseInt(settingsMap.lockoutDuration || "15");
      
      // Attempt authentication
      passport.authenticate("local", async (err: any, authenticatedUser: any, info: any) => {
        if (err) return next(err);
        
        if (!authenticatedUser) {
          // Login failed - increment failed attempts
          const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
          let lockoutUntil = null;
          
          // Check if we should lock the account
          if (newFailedAttempts >= maxLoginAttempts) {
            lockoutUntil = new Date(Date.now() + (lockoutDuration * 60 * 1000)); // Convert minutes to milliseconds
          }
          
          // Update user with new failed attempts and lockout time
          await storage.updateUser(user.id, {
            failedLoginAttempts: newFailedAttempts,
            lockoutUntil: lockoutUntil
          });
          
          // Return appropriate error message
          if (lockoutUntil) {
            return res.status(423).send(`تم حظر الحساب لمدة ${lockoutDuration} دقيقة بسبب محاولات تسجيل الدخول الفاشلة المتكررة`);
          } else {
            const remainingAttempts = maxLoginAttempts - newFailedAttempts;
            return res.status(401).send(`فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة. المحاولات المتبقية: ${remainingAttempts}`);
          }
        }
        
        // Login successful - reset failed attempts and lockout
        await storage.updateUser(user.id, {
          failedLoginAttempts: 0,
          lockoutUntil: null
        });
        
        // Complete the login process
        req.login(authenticatedUser, (err: any) => {
          if (err) return next(err);
          res.status(200).json(authenticatedUser);
      });
    })(req, res, next);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).send("خطأ في الخادم");
    }
  });

  // Family routes
  app.get("/api/family", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Allow dual-role admin to access their family
      const family = await storage.getFamilyByUserId(req.user!.id);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
      const wives = await storage.getWivesByFamilyId(family.id);
      const members = await storage.getMembersByFamilyId(family.id);
      res.json({ ...family, wives, members });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/family", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const familyData = insertFamilySchema.parse(req.body);
      familyData.userId = req.user!.id;
      
      const family = await storage.createFamily(familyData);
      res.status(201).json(family);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.put("/api/family/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const id = parseInt(req.params.id);
      const familyData = insertFamilySchema.partial().parse(req.body);
      
      // Check ownership for head users
      if (req.user!.role === 'head') {
        const family = await storage.getFamily(id);
        if (!family || family.userId !== req.user!.id) {
          return res.status(403).json({ message: "غير مصرح لك" });
        }
      }
      
      const family = await storage.updateFamily(id, familyData);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
      
      res.json(family);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Member routes
  app.get("/api/family/:familyId/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyId = parseInt(req.params.familyId);
      // Allow dual-role admin to access their family
        const family = await storage.getFamily(familyId);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
      if (isHeadOrDualRole(req.user!, family) && family.userId !== req.user!.id) {
          return res.status(403).json({ message: "غير مصرح لك" });
      }
      const members = await storage.getMembersByFamilyId(familyId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Allow dual-role admin to add members to their family
        const family = await storage.getFamilyByUserId(req.user!.id);
        if (!family) {
          return res.status(404).json({ message: "العائلة غير موجودة" });
        }
      if (isHeadOrDualRole(req.user!, family)) {
        const memberDataSchema = insertMemberSchema.omit({ familyId: true });
        const parsedData = memberDataSchema.parse(req.body);
        const memberData = { ...parsedData, familyId: family.id };
      const member = await storage.createMember(memberData);
      res.status(201).json(member);
      } else {
        return res.status(403).json({ message: "غير مصرح لك" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.put("/api/members/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);

  try {
    const id = parseInt(req.params.id);
    const memberData = insertMemberSchema.partial().parse(req.body);
      const member = await storage.getMember(id);
      if (!member) return res.status(404).json({ message: "الفرد غير موجود" });
      const family = await storage.getFamily(member.familyId);
    if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
    if (isHeadOrDualRole(req.user!, family) && family.userId !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح لك" });
    }
    const updatedMember = await storage.updateMember(id, memberData);
    if (!updatedMember) return res.status(404).json({ message: "الفرد غير موجود" });

    // Don't update family statistics - keep them as stored
    // The family statistics will remain unchanged

    res.json(updatedMember);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
    }
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});


  app.delete("/api/members/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);

  try {
    const id = parseInt(req.params.id);
    console.log('Server: Attempting to delete member with ID:', id);
    console.log('Server: ID type:', typeof id);

    // 🔒 تحقق من الملكية إذا كان المستخدم "رب أسرة"
    if (req.user!.role === 'head') {
      const member = await storage.getMember(id);
      console.log('Server: Found member:', member);
      
      if (!member) {
        console.log('Server: Member not found for ID:', id);
        return res.status(404).json({ message: "الفرد غير موجود" });
      }

      const family = await storage.getFamily(member.familyId);
      console.log('Server: Found family:', family);
      
      if (!family || family.userId !== req.user!.id) {
        console.log('Server: Forbidden - family not found or user mismatch');
        return res.status(403).json({ message: "غير مصرح لك" });
    }

      // 🗑️ تنفيذ الحذف بعد التأكد من الصلاحيات
    const success = await storage.deleteMember(id);
      console.log('Server: Delete result:', success);
      
      if (!success) {
        console.log('Server: Delete failed for ID:', id);
        return res.status(404).json({ message: "الفرد غير موجود" });
      }

      // Don't update family statistics - keep them as stored
      // The family statistics will remain unchanged

    res.sendStatus(204);
    } else {
      // For admin users, just delete directly
      const success = await storage.deleteMember(id);
      if (!success) {
        return res.status(404).json({ message: "الفرد غير موجود" });
      }
      res.sendStatus(204);
    }
  } catch (error: any) {
    console.error('Server: Error deleting member:', error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
 });

  // Wife routes
  app.get("/api/family/:familyId/wives", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const familyId = parseInt(req.params.familyId);
      const family = await storage.getFamily(familyId);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
      
      if (isHeadOrDualRole(req.user!, family) && family.userId !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح لك" });
      }
      
      const wives = await storage.getWivesByFamilyId(familyId);
      res.json(wives);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/wives", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const family = await storage.getFamilyByUserId(req.user!.id);
      if (!family) {
        return res.status(404).json({ message: "العائلة غير موجودة" });
      }
      
      if (isHeadOrDualRole(req.user!, family)) {
        const wifeDataSchema = insertWifeSchema.omit({ familyId: true });
        const parsedData = wifeDataSchema.parse(req.body);
        const wifeData = { ...parsedData, familyId: family.id };
        const wife = await storage.createWife(wifeData);
        res.status(201).json(wife);
      } else {
        return res.status(403).json({ message: "غير مصرح لك" });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.put("/api/wives/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const wifeData = insertWifeSchema.partial().parse(req.body);
      const wife = await storage.getWife(id);
      if (!wife) return res.status(404).json({ message: "الزوجة غير موجودة" });
      
      const family = await storage.getFamily(wife.familyId);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
      
      if (isHeadOrDualRole(req.user!, family) && family.userId !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح لك" });
      }
      
      const updatedWife = await storage.updateWife(id, wifeData);
      if (!updatedWife) return res.status(404).json({ message: "الزوجة غير موجودة" });
      
      res.json(updatedWife);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/wives/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const id = parseInt(req.params.id);
      const wife = await storage.getWife(id);
      if (!wife) return res.status(404).json({ message: "الزوجة غير موجودة" });
      
      const family = await storage.getFamily(wife.familyId);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
      
      if (isHeadOrDualRole(req.user!, family) && family.userId !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح لك" });
      }
      
      const success = await storage.deleteWife(id);
      if (!success) return res.status(404).json({ message: "الزوجة غير موجودة" });
      
      res.sendStatus(204);
    } catch (error) {
      console.error('Server: Error deleting wife:', error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Request routes
  app.get("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      // Allow dual-role admin to fetch their family's requests
        const family = await storage.getFamilyByUserId(req.user!.id);
      if (isHeadOrDualRole(req.user!, family)) {
        if (!family) return res.json([]);
        const requests = await storage.getRequestsByFamilyId(family.id);
        res.json(requests);
      } else {
        const requests = await storage.getAllRequests();
        // For admin users, include family data with each request
        const requestsWithFamily = await Promise.all(
          requests.map(async (request: any) => {
            const family = await getFamilyByIdOrDualRole(request.familyId);
            return { ...request, family };
          })
        );
        res.json(requestsWithFamily);
      }
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      let requestData;
      
      const family = await storage.getFamilyByUserId(req.user!.id);
      if (isHeadOrDualRole(req.user!, family)) {
        // For head users, omit familyId from validation since it's set automatically
        const requestDataSchema = insertRequestSchema.omit({ familyId: true });
        requestData = requestDataSchema.parse(req.body);
        
        if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
        
        // Add familyId from user's family
        requestData = { ...requestData, familyId: family.id };
      } else {
        // For admin users, validate with familyId included
        requestData = insertRequestSchema.parse(req.body);
      }
      
      const request = await storage.createRequest(requestData);
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.put("/api/requests/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role === 'head') return res.sendStatus(403);
    
    try {
      const id = parseInt(req.params.id);
      const requestData = insertRequestSchema.partial().parse(req.body);
      
      // Get the original request to check for changes
      const originalRequest = await storage.getRequest(id);
      if (!originalRequest) return res.status(404).json({ message: "الطلب غير موجود" });
      
      const request = await storage.updateRequest(id, requestData);
      if (!request) return res.status(404).json({ message: "الطلب غير موجود" });

      // Move variable declarations before usage
      const statusChanged = originalRequest.status !== request.status;
      const commentAdded = !originalRequest.adminComment && request.adminComment;
      const commentChanged = originalRequest.adminComment !== request.adminComment;
      
      // Get family information for notification
      const family = await getFamilyByIdOrDualRole(request.familyId);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });

      console.log('[Notification Debug]', {
        requestId: request.id,
        familyId: request.familyId,
        familyUserId: family.userId,
        action: statusChanged ? 'statusChanged' : (commentAdded || commentChanged) ? 'comment' : 'none',
        notificationRecipients: [family.userId]
      });
      
      // Send notifications based on changes
      if (statusChanged) {
        // Status changed - send approval/rejection notification
        const statusText = request.status === 'approved' ? 'تمت الموافقة' : 
                          request.status === 'rejected' ? 'تم الرفض' : 'تم التحديث';
        
        await storage.createNotification({
          title: `تحديث حالة الطلب #${request.id}`,
          message: `تم ${statusText} على طلبك من نوع "${getRequestTypeInArabic(request.type)}". ${request.adminComment ? `التعليق: ${request.adminComment}` : ''}`,
          target: 'specific',
          recipients: [family.userId]
        });
      } else if (commentAdded || commentChanged) {
        // Only comment changed - send comment notification
        await storage.createNotification({
          title: `تعليق إداري على الطلب #${request.id}`,
          message: `تم إضافة تعليق إداري على طلبك من نوع "${getRequestTypeInArabic(request.type)}": ${request.adminComment}`,
          target: 'specific',
          recipients: [family.userId]
        });
      }
      
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      let notifications = await storage.getAllNotifications();
      if (req.user!.role === 'head') {
        // Only show notifications relevant to this head
        notifications = notifications.filter(n =>
          n.target === 'all' ||
          n.target === 'head' ||
          n.target === 'urgent' ||
          (n.target === 'specific' && Array.isArray(n.recipients) && n.recipients.includes(req.user!.id))
        );
      }
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role === 'head') return res.sendStatus(403);
    
    try {
      let notificationData = insertNotificationSchema.parse(req.body);

      // If target is 'admin', set recipients to all admin user IDs
      if (notificationData.target === 'admin') {
        const admins = await storage.getAllUsers?.() || []; // If you have a getAllUsers method
        const adminIds = admins.filter((u: any) => u.role === 'admin').map((u: any) => u.id);
        notificationData = {
          ...notificationData,
          recipients: adminIds,
        };
      }

      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin routes
  app.get("/api/admin/families", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role === 'head') return res.sendStatus(403);
    
    try {
      const families = await storage.getAllFamiliesWithMembers();
      res.json(families);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/admin/families/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role === 'head') return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const family = await getFamilyByIdOrDualRole(id);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
      const wives = await storage.getWivesByFamilyId(family.id);
      const members = await storage.getMembersByFamilyId(family.id);
      const requests = await storage.getRequestsByFamilyId(family.id);
      res.json({ ...family, wives, members, requests });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.put("/api/admin/families/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role === 'head') return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const familyData = insertFamilySchema.partial().parse(req.body);
      // Use getFamilyByIdOrDualRole to check existence before update
      const family = await getFamilyByIdOrDualRole(id);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
      const updatedFamily = await storage.updateFamily(id, familyData);
      if (!updatedFamily) return res.status(404).json({ message: "العائلة غير موجودة" });
      res.json(updatedFamily);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/admin/families/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role === 'head') return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteFamily(id);
      if (!success) return res.status(404).json({ message: "العائلة غير موجودة" });
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/admin/families/:id/members", async (req, res) => {
  if (!req.isAuthenticated() || req.user!.role === 'head') return res.sendStatus(403);
  try {
    const familyId = parseInt(req.params.id);
      const family = await getFamilyByIdOrDualRole(familyId);
      if (!family) return res.status(404).json({ message: "العائلة غير موجودة" });
    const memberData = { ...insertMemberSchema.omit({ familyId: true }).parse(req.body), familyId };
    const member = await storage.createMember(memberData);
    res.status(201).json(member);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
    }
    res.status(500).json({ message: "خطأ في الخادم" });
  }
});

  // Registration route for family heads
  app.post("/api/register-family", async (req, res) => {
  try {
      const { user: userData, family: familyData, members: membersData } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByNationalId(familyData.husbandID);
      if (existingUser) {
        return res.status(400).json({ message: "رقم الهوية مسجل مسبقاً" });
      }
      
      // Create user
      const user = await storage.createUser({
        username: familyData.husbandID,
        password: userData.password ? await hashPassword(userData.password) : await hashPassword(familyData.husbandID),
        role: 'head',
        phone: familyData.primaryPhone
      });
      
      // Create family
      const family = await storage.createFamily({
        ...familyData,
        userId: user.id
      });
      
      // Create members if provided
      if (membersData && membersData.length > 0) {
        for (const memberData of membersData) {
          await storage.createMember({
            ...memberData,
            familyId: family.id
          });
        }
      }
      
      // Only log in the user if they provided a password (self-registration)
      // If no password provided, this is admin creating a head, so don't auto-login
      if (userData.password) {
        req.login(user, (err) => {
          if (err) return res.status(500).json({ message: "تم التسجيل بنجاح لكن فشل تسجيل الدخول" });
          res.status(201).json({ user, family });
        });
      } else {
        // Admin creating head - don't auto-login
        res.status(201).json({ user, family });
      }
    } catch (error: any) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "رقم الهوية مسجل مسبقاً" });
    }
    console.error("Registration error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Profile: Get current user profile (excluding password)
  app.get("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
      // Exclude password from response
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Profile: Change password
  app.post("/api/user/password", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "الرجاء إدخال كلمة المرور الحالية والجديدة" });
  }
  try {
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    const valid = await comparePasswords(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة" });
    }

    const hashed = await hashPassword(newPassword);
    await storage.updateUser(user.id, { password: hashed });
    res.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "حدث خطأ أثناء تغيير كلمة المرور" });
  }
  });

  // Admin: Get all users
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role === 'head') return res.sendStatus(403);
    try {
      const users = await storage.getAllUsers({ includeDeleted: true });
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Create user
  app.post("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'root') return res.sendStatus(403);
    try {
      let userData = req.body;
      // Validate password if provided
      if (userData.password) {
        // Fetch password policy settings
        const settings = await storage.getAllSettings();
        const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
        const minLength = parseInt(settingsMap.minPasswordLength || "8");
        const requireUppercase = settingsMap.requireUppercase === "true";
        const requireLowercase = settingsMap.requireLowercase === "true";
        const requireNumbers = settingsMap.requireNumbers === "true";
        const requireSpecialChars = settingsMap.requireSpecialChars === "true";
        const errors = [];
        if (userData.password.length < minLength) {
          errors.push(`كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`);
        }
        if (requireUppercase && !/[A-Z]/.test(userData.password)) {
          errors.push("كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل");
        }
        if (requireLowercase && !/[a-z]/.test(userData.password)) {
          errors.push("كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل");
        }
        if (requireNumbers && !/\d/.test(userData.password)) {
          errors.push("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");
        }
        if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(userData.password)) {
          errors.push("كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل");
        }
        if (errors.length > 0) {
          return res.status(400).json({ message: errors.join("، ") });
        }
        userData.password = await hashPassword(userData.password);
      }
      // Only allow certain fields to be set
      const allowedFields = ['username', 'password', 'role', 'phone', 'isProtected', 'identityId'];
      userData = Object.fromEntries(Object.entries(userData).filter(([k]) => allowedFields.includes(k)));
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Update user
  app.put("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user!.role !== 'root' && req.user!.role !== 'admin')) return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      let userData = req.body;
      // Fetch the target user
      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });

      // Root can edit anyone, including isProtected
      if (req.user!.role === 'root') {
      if (!userData.username) {
          userData.username = targetUser.username;
      }
      const updatedUser = await storage.updateUser(id, userData);
      if (!updatedUser) return res.status(404).json({ message: "المستخدم غير موجود" });
        return res.json(updatedUser);
      }
      // Admin logic (protected or not)
      if (req.user!.role === 'admin') {
        // Prevent admin from editing root
        if (targetUser.role === 'root') {
          return res.status(403).json({ message: "لا يمكن للمشرفين تعديل المشرف الرئيسي." });
        }
        // Prevent admin from editing protected admins unless current admin is protected and target is not
        if (targetUser.role === 'admin' && targetUser.isProtected) {
          return res.status(403).json({ message: "لا يمكن للمشرفين تعديل مشرف محمي." });
        }
        // Allow protected admin to edit unprotected admin or head
        if (req.user!.isProtected) {
          if (targetUser.role === 'admin' && !targetUser.isProtected) {
            // ok
          } else if (targetUser.role === 'head') {
            // ok
          } else {
            return res.status(403).json({ message: "غير مسموح بتعديل هذا المستخدم." });
          }
        } else {
          // Unprotected admin can only edit heads and unprotected admins
        if (targetUser.role !== 'head' && !(targetUser.role === 'admin' && !targetUser.isProtected)) {
          return res.status(403).json({ message: "غير مسموح بتعديل هذا المستخدم." });
          }
        }
        // Prevent admin from changing isProtected
        if ('isProtected' in userData) {
          delete userData.isProtected;
        }
        userData.role = targetUser.role; // cannot change role
        if (!userData.username) {
          userData.username = targetUser.username;
        }
        const updatedUser = await storage.updateUser(id, userData);
        if (!updatedUser) return res.status(404).json({ message: "المستخدم غير موجود" });
        return res.json(updatedUser);
      }
      return res.sendStatus(403);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Delete user
  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user!.role !== 'root' && req.user!.role !== 'admin')) return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });

      // Check for family references
      const families = await storage.getFamiliesByUserId(id);
      const hasFamilies = families && families.length > 0;
      const cascade = req.query.cascade === 'true';

      if (hasFamilies && !cascade) {
        // Prevent deletion, return clear error
        return res.status(409).json({
          message: "لا يمكن حذف المستخدم لأنه مرتبط بعائلات. يمكنك اختيار الحذف المتسلسل لحذف جميع العائلات والأفراد المرتبطين بهذا المستخدم.",
          code: "USER_REFERENCED_IN_FAMILY",
          families: families.map(f => ({ id: f.id, husbandName: f.husbandName, husbandID: f.husbandID }))
        });
      }

      // Root can delete anyone except themselves
      if (req.user!.role === 'root') {
        if (targetUser.id === req.user!.id) {
          return res.status(403).json({ message: "لا يمكن حذف حسابك الخاص" });
        }
        // Cascade deletion if requested
        if (hasFamilies && cascade) {
          for (const family of families) {
            await storage.deleteFamily(family.id);
          }
        }
        const success = await storage.softDeleteUser(id);
        if (!success) return res.status(404).json({ message: "المستخدم غير موجود" });
        return res.sendStatus(204);
      }
      // Admin logic (protected or not)
      if (req.user!.role === 'admin') {
        // Prevent admin from deleting root
        if (targetUser.role === 'root') {
          return res.status(403).json({ message: "لا يمكن للمشرفين حذف المشرف الرئيسي." });
        }
        // Prevent admin from deleting protected admins unless current admin is protected and target is not
        if (targetUser.role === 'admin' && targetUser.isProtected) {
          return res.status(403).json({ message: "لا يمكن للمشرفين حذف مشرف محمي." });
        }
        // Allow protected admin to delete unprotected admin or head
        if (req.user!.isProtected) {
          if (targetUser.role === 'admin' && !targetUser.isProtected) {
            // ok
          } else if (targetUser.role === 'head') {
            // ok
          } else {
            return res.status(403).json({ message: "غير مسموح بحذف هذا المستخدم." });
          }
        } else {
          // Unprotected admin can only delete heads and unprotected admins
          if (targetUser.role !== 'head' && !(targetUser.role === 'admin' && !targetUser.isProtected)) {
            return res.status(403).json({ message: "غير مسموح بحذف هذا المستخدم." });
          }
        }
        // Cascade deletion if requested
        if (hasFamilies && cascade) {
          for (const family of families) {
            await storage.deleteFamily(family.id);
          }
        }
        const success = await storage.softDeleteUser(id);
        if (!success) return res.status(404).json({ message: "المستخدم غير موجود" });
        return res.sendStatus(204);
      }
      return res.sendStatus(403);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Reset user lockout
  app.post("/api/admin/users/:id/reset-lockout", async (req, res) => {
    if (!req.isAuthenticated() || (req.user!.role !== 'root' && req.user!.role !== 'admin')) return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      const targetUser = await storage.getUser(id);
      if (!targetUser) return res.status(404).json({ message: "المستخدم غير موجود" });

      // Root can reset anyone
      if (req.user!.role === 'root') {
        await storage.updateUser(id, {
          failedLoginAttempts: 0,
          lockoutUntil: null
        });
        return res.json({ message: "تم إعادة تعيين حظر الحساب بنجاح" });
      }

      // Admin can reset heads and unprotected admins
      if (req.user!.role === 'admin') {
        // Prevent admin from resetting root
        if (targetUser.role === 'root') {
          return res.status(403).json({ message: "لا يمكن للمشرفين إعادة تعيين حظر المشرف الرئيسي." });
        }
        // Prevent admin from resetting protected admins
        if (targetUser.role === 'admin' && targetUser.isProtected) {
          return res.status(403).json({ message: "لا يمكن للمشرفين إعادة تعيين حظر مشرف محمي." });
        }
        // Admin can only reset heads and unprotected admins
        if (targetUser.role !== 'head' && !(targetUser.role === 'admin' && !targetUser.isProtected)) {
          return res.status(403).json({ message: "غير مسموح بإعادة تعيين حظر هذا المستخدم." });
        }
        await storage.updateUser(id, {
          failedLoginAttempts: 0,
          lockoutUntil: null
        });
        return res.json({ message: "تم إعادة تعيين حظر الحساب بنجاح" });
      }

      // Fallback forbidden
      return res.sendStatus(403);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Restore soft-deleted user
  app.post("/api/admin/users/:id/restore", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'root') return res.sendStatus(403);
    try {
      const id = parseInt(req.params.id);
      // Only allow restoring if user is soft-deleted
      const user = await storage.getUser(id, { includeDeleted: true });
      if (!user || !user.deletedAt) return res.status(404).json({ message: "المستخدم غير موجود أو غير محذوف" });
      const success = await storage.restoreUser(id);
      if (!success) return res.status(500).json({ message: "فشل في الاستعادة" });
      res.json({ message: "تم استعادة المستخدم" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Get logs
  app.get("/api/admin/logs", async (req, res) => {
    if (!req.isAuthenticated() || (req.user!.role !== 'root' && req.user!.role !== 'admin')) return res.sendStatus(403);
    try {
      const { page = 1, pageSize = 20, type, userId, search } = req.query;
      const limit = Math.max(1, Math.min(Number(pageSize) || 20, 100));
      const offset = (Number(page) - 1) * limit;
      const logs = await storage.getLogs({
        type: type as string | undefined,
        userId: userId ? Number(userId) : undefined,
        search: search as string | undefined,
        limit,
        offset,
      });
      // Optionally join user info
      const usersMap = Object.fromEntries((await storage.getAllUsers()).map(u => [u.id, u]));
      const logsWithUser = logs.map(log => ({ ...log, user: usersMap[log.userId] || null }));
      res.json(logsWithUser);
    } catch (error) {
      console.error('Error in GET /api/admin/logs:', error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Admin: Create log (optional, for manual log creation)
  app.post("/api/admin/logs", async (req, res) => {
    if (!req.isAuthenticated() || (req.user!.role !== 'root' && req.user!.role !== 'admin')) return res.sendStatus(403);
    try {
      const logData = req.body;
      logData.userId = req.user!.id;
      const log = await storage.createLog(logData);
      res.status(201).json(log);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
  }
  });

  // Settings routes
  app.get("/api/settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const allSettings = await storage.getAllSettings();
      const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Public settings route - no authentication required
  app.get("/api/public/settings", async (req, res) => {
    try {
      const allSettings = await storage.getAllSettings();
      const settingsMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));
      res.json(settingsMap);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'root') return res.sendStatus(403);
    try {
      const { key, value, description } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ message: "المفتاح والقيمة مطلوبان" });
      }
      await storage.setSetting(key, value, description);
      res.json({ message: "تم تحديث الإعداد بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/settings/:key", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const value = await storage.getSetting(req.params.key);
      if (value === undefined) {
        return res.status(404).json({ message: "الإعداد غير موجود" });
      }
      res.json({ value });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Dedicated maintenance mode endpoints
  app.get("/api/settings/maintenance", async (req, res) => {
    try {
      const value = await storage.getSetting("maintenance");
      res.json({ enabled: value === "true" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/settings/maintenance", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'root') return res.sendStatus(403);
    try {
      const { enabled } = req.body;
      await storage.setSetting("maintenance", enabled ? "true" : "false", "وضع الصيانة");
      res.json({ message: "تم تحديث وضع الصيانة" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // System version endpoint (ESM compatible)
  app.get("/api/version", async (req, res) => {
    try {
      const pkg = await import('../package.json', { assert: { type: 'json' } });
      res.json({ version: pkg.default.version });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحميل الإصدار" });
    }
  });

  // Password change route
  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "كلمة المرور الحالية والجديدة مطلوبة" });
      }
      
      // Verify current password
      const user = await storage.getUser(req.user!.id);
      if (!user || !(await comparePasswords(currentPassword, user.password))) {
        return res.status(400).json({ message: "كلمة المرور الحالية غير صحيحة" });
      }
      
      // Validate new password against policy
      const settings = await storage.getAllSettings();
      const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
      
      const minLength = parseInt(settingsMap.minPasswordLength || "8");
      const requireUppercase = settingsMap.requireUppercase === "true";
      const requireLowercase = settingsMap.requireLowercase === "true";
      const requireNumbers = settingsMap.requireNumbers === "true";
      const requireSpecialChars = settingsMap.requireSpecialChars === "true";
      
      const errors = [];
      
      if (newPassword.length < minLength) {
        errors.push(`كلمة المرور يجب أن تكون ${minLength} أحرف على الأقل`);
      }
      if (requireUppercase && !/[A-Z]/.test(newPassword)) {
        errors.push("كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل");
      }
      if (requireLowercase && !/[a-z]/.test(newPassword)) {
        errors.push("كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل");
      }
      if (requireNumbers && !/\d/.test(newPassword)) {
        errors.push("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل");
      }
      if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
        errors.push("كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل");
      }
      
      if (errors.length > 0) {
        return res.status(400).json({ message: errors.join("، ") });
      }
      
      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(req.user!.id, hashedPassword);
      
      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في تغيير كلمة المرور" });
  }
  });

  // Admin: Download full database backup
  app.get("/api/admin/backup", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'root') return res.sendStatus(403);
    try {
      const users = await storage.getAllUsers();
      const families = await storage.getAllFamilies();
      const members = [];
      for (const family of families) {
        const famMembers = await storage.getMembersByFamilyId(family.id);
        members.push(...famMembers);
      }
      const requests = await storage.getAllRequests();
      const notifications = await storage.getAllNotifications();
      const settings = await storage.getAllSettings();
      const logs = await storage.getLogs({});
      const backup = { users, families, members, requests, notifications, settings, logs };
      res.setHeader("Content-Disposition", `attachment; filename=backup-${Date.now()}.json`);
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(backup, null, 2));
    } catch (e) {
      res.status(500).json({ message: "فشل في إنشاء النسخة الاحتياطية" });
    }
  });

  // Admin: Restore full database from backup
  app.post("/api/admin/restore", upload.single("backup"), async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'root') return res.sendStatus(403);
    try {
      if (!req.file) return res.status(400).json({ message: "يرجى رفع ملف النسخة الاحتياطية" });
      const data = JSON.parse(req.file.buffer.toString());
      // Clear all tables (order matters for FKs)
      await storage.clearLogs();
      await storage.clearNotifications();
      await storage.clearRequests();
      await storage.clearMembers();
      await storage.clearFamilies();
      await storage.clearUsers();
      await storage.clearSettings();
      // Insert new data
      for (const s of data.settings || []) await storage.setSetting(s.key, s.value, s.description);
      for (const u of data.users || []) await storage.createUser(u);
      for (const f of data.families || []) await storage.createFamily(f);
      for (const m of data.members || []) await storage.createMember(m);
      for (const r of data.requests || []) await storage.createRequest(r);
      for (const n of data.notifications || []) await storage.createNotification(n);
      for (const l of data.logs || []) await storage.createLog(l);
      res.json({ message: "تمت استعادة البيانات بنجاح" });
    } catch (e) {
      res.status(500).json({ message: "فشل في استعادة النسخة الاحتياطية" });
  }
  });

  // Admin: Automated Merge from another database
  app.post("/api/admin/merge", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== 'root') return res.sendStatus(403);
    try {
      const { url } = req.body;
      const remoteUrl = url || process.env.DATABASE_URL;
      if (!remoteUrl) return res.status(400).json({ message: "يرجى إدخال رابط قاعدة البيانات أو ضبطه في البيئة" });
      // Connect to remote DB
      const { Pool } = pg;
      const remotePool = new Pool({ connectionString: remoteUrl, ssl: { rejectUnauthorized: false } });
      const remoteDb = { query: (...args: any[]) => remotePool.query(...args) };
      // Helper to fetch all rows from a table
      async function fetchAll(table: string) {
        const { rows } = await remoteDb.query(`SELECT * FROM ${table}`);
        return rows;
      }
      // Fetch remote data
      const remote = {
        users: await fetchAll('users'),
        families: await fetchAll('families'),
        members: await fetchAll('members'),
        requests: await fetchAll('requests'),
        notifications: await fetchAll('notifications'),
        settings: await fetchAll('settings'),
        logs: await fetchAll('logs'),
      };
      // Merge logic for each table
      let inserted = 0, updated = 0, skipped = 0;
      // Users
      for (const r of remote.users) {
        const local = await storage.getUser(r.id);
        if (!local) {
          await storage.createUser(r);
          inserted++;
        } else if (r.updatedAt && local.updatedAt && new Date(r.updatedAt) > new Date(local.updatedAt)) {
          await storage.updateUser(r.id, r);
          updated++;
        } else {
          skipped++;
        }
      }
      // Families
      for (const r of remote.families) {
        const local = await storage.getFamily(r.id);
        if (!local) {
          await storage.createFamily(r);
          inserted++;
        } else if (r.updatedAt && local.updatedAt && new Date(r.updatedAt) > new Date(local.updatedAt)) {
          await storage.updateFamily(r.id, r);
          updated++;
        } else {
          skipped++;
        }
      }
      // Members
      for (const r of remote.members) {
        const local = await storage.getMember(r.id);
        if (!local) {
          await storage.createMember(r);
          inserted++;
        } else if (r.updatedAt && local.updatedAt && new Date(r.updatedAt) > new Date(local.updatedAt)) {
          await storage.updateMember(r.id, r);
          updated++;
        } else {
          skipped++;
        }
      }
      // Requests
      for (const r of remote.requests) {
        const local = await storage.getRequest(r.id);
        if (!local) {
          await storage.createRequest(r);
          inserted++;
        } else if (r.updatedAt && local.updatedAt && new Date(r.updatedAt) > new Date(local.updatedAt)) {
          await storage.updateRequest(r.id, r);
          updated++;
        } else {
          skipped++;
        }
      }
      // Notifications
      for (const r of remote.notifications) {
        // No update, just insert if not exists
        const all = await storage.getAllNotifications();
        if (!all.find(n => n.id === r.id)) {
          await storage.createNotification(r);
          inserted++;
        } else {
          skipped++;
        }
      }
      // Settings
      for (const r of remote.settings) {
        const val = await storage.getSetting(r.key);
        if (val === undefined) {
          await storage.setSetting(r.key, r.value, r.description);
          inserted++;
        } else {
          skipped++;
        }
      }
      // Logs
      for (const r of remote.logs) {
        // No update, just insert if not exists
        const all = await storage.getLogs({});
        if (!all.find(l => l.id === r.id)) {
          await storage.createLog(r);
          inserted++;
        } else {
          skipped++;
        }
      }
      await remotePool.end();
      res.json({ message: `تم الدمج: ${inserted} مضافة، ${updated} محدثة، ${skipped} متطابقة.` });
    } catch (e) {
      res.status(500).json({ message: "فشل في الدمج التلقائي: " + (e as Error).message });
  }
  });

  // Users routes
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || !['admin', 'root'].includes(req.user!.role)) return res.sendStatus(403);
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Support Vouchers routes
  app.get("/api/support-vouchers", async (req, res) => {
    if (!req.isAuthenticated() || !['admin', 'root'].includes(req.user!.role)) return res.sendStatus(403);
    try {
      const vouchers = await storage.getAllSupportVouchers();
      res.json(vouchers);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/support-vouchers/:id", async (req, res) => {
    if (!req.isAuthenticated() || !['admin', 'root'].includes(req.user!.role)) return res.sendStatus(403);
    try {
      const voucherId = parseInt(req.params.id);
      const voucher = await storage.getSupportVoucher(voucherId);
      
      if (!voucher) {
        return res.status(404).json({ message: "الكوبون غير موجود" });
      }
      
      // Get creator and recipients
      const creator = await storage.getUser(voucher.createdBy);
      const recipients = await storage.getVoucherRecipients(voucherId);
      
      const voucherWithDetails = {
        ...voucher,
        creator: creator!,
        recipients
      };
      
      res.json(voucherWithDetails);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/support-vouchers", async (req, res) => {
    if (!req.isAuthenticated() || !['admin', 'root'].includes(req.user!.role)) return res.sendStatus(403);
    try {
      console.log('Received voucher data:', req.body);
      
      // Create a schema that doesn't require createdBy (it will be set manually)
      const createVoucherSchema = insertSupportVoucherSchema.omit({ createdBy: true });
      const voucherData = createVoucherSchema.parse(req.body);
      
      console.log('Parsed voucher data:', voucherData);
      
      // Add the createdBy field manually
      const voucherToCreate = {
        ...voucherData,
        createdBy: req.user!.id
      };
      
      const voucher = await storage.createSupportVoucher(voucherToCreate);
      res.status(201).json(voucher);
    } catch (error) {
      console.error('Error creating voucher:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/support-vouchers/:id", async (req, res) => {
    if (!req.isAuthenticated() || !['admin', 'root'].includes(req.user!.role)) return res.sendStatus(403);
    try {
      const voucherId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const voucher = await storage.getSupportVoucher(voucherId);
      if (!voucher) {
        return res.status(404).json({ message: "الكوبون غير موجود" });
      }
      
      const updatedVoucher = await storage.updateSupportVoucher(voucherId, { isActive });
      res.json(updatedVoucher);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/support-vouchers/:id/recipients", async (req, res) => {
    if (!req.isAuthenticated() || !['admin', 'root'].includes(req.user!.role)) return res.sendStatus(403);
    try {
      const voucherId = parseInt(req.params.id);
      const { familyIds } = req.body;
      
      if (!Array.isArray(familyIds)) {
        return res.status(400).json({ message: "يجب أن تكون معرفات العوائل مصفوفة" });
      }

      const recipients = [];
      for (const familyId of familyIds) {
        const recipientData = {
          voucherId,
          familyId,
          status: 'pending' as const
        };
        const recipient = await storage.createVoucherRecipient(recipientData);
        recipients.push(recipient);
      }
      
      res.status(201).json(recipients);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/support-vouchers/:id/notify", async (req, res) => {
    if (!req.isAuthenticated() || !['admin', 'root'].includes(req.user!.role)) return res.sendStatus(403);
    try {
      const voucherId = parseInt(req.params.id);
      const { recipientIds } = req.body;
      
      const voucher = await storage.getSupportVoucher(voucherId);
      if (!voucher) {
        return res.status(404).json({ message: "الكوبون غير موجود" });
      }

      const recipients = await storage.getVoucherRecipients(voucherId);
      const targetRecipients = recipientIds 
        ? recipients.filter(r => recipientIds.includes(r.id))
        : recipients;

      // Create notification for each recipient
      for (const recipient of targetRecipients) {
        let message = `تم إضافة كوبونة دعم الى عائلتك "${voucher.title}". يرجى الذهاب الى مكان الاستلام لاستلام الكوبونة.`;
        
        if (voucher.location) {
          message += `\n\nموقع الاستلام: ${voucher.location}`;
        }
        
        const notification = {
          title: `كوبونة دعم جديد: ${voucher.title}`,
          message: message,
          target: 'specific' as const,
          recipients: [recipient.familyId]
        };
        await storage.createNotification(notification);
        
        // Update recipient notification status
        await storage.updateVoucherRecipient(recipient.id, {
          notified: true,
          notifiedAt: new Date(),
          updatedBy: req.user!.id
        });
      }
      
      res.json({ message: `تم إرسال ${targetRecipients.length} إشعار` });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Voucher Recipients routes
  app.patch("/api/voucher-recipients/:id", async (req, res) => {
    if (!req.isAuthenticated() || !['admin', 'root'].includes(req.user!.role)) return res.sendStatus(403);
    try {
      const recipientId = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      const updateData: any = { updatedBy: req.user!.id };
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      
      const recipient = await storage.updateVoucherRecipient(recipientId, updateData);
      if (!recipient) return res.status(404).json({ message: "المستلم غير موجود" });
      
      res.json(recipient);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
  }
  });

  const httpServer = createServer(app);
  return httpServer;
}