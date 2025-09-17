import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { comparePasswords, hashPassword } from "./auth";

export interface JWTPayload {
  id: number;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export function generateToken(user: { id: number; username: string; role: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role 
    },
    secret,
    { expiresIn: '1h' }
  );
}

export function verifyToken(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  
  return jwt.verify(token, secret) as JWTPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: "No authorization header provided" });
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: "Invalid authorization header format" });
  }
  
  const token = parts[1];
  
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function loginHandler(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    // Special case: If password is empty/null/undefined, look for user with head role by identity number
    if (!password || password === "" || password === null || password === undefined) {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "معلومات الدخول خاطئة - راجع لجنة العائلة" });
      }
      
      // Allow heads OR admins with 9-digit usernames (promoted heads) to login without password
      const isPromotedHead = user.role === 'admin' && /^\d{9}$/.test(user.username);
      if (user.role !== 'head' && !isPromotedHead) {
        return res.status(401).json({ message: "فشل تسجيل الدخول: كلمة المرور مطلوبة" });
      }
      
      // For head users, verify they have a family record
      if (user.role === 'head') {
        const family = await storage.getFamilyByUserId(user.id);
        if (!family) {
          return res.status(401).json({ message: "معلومات الدخول خاطئة - راجع لجنة العائلة" });
        }
      }
      
      // Check if account is locked out
      if (user.lockoutUntil && new Date() < user.lockoutUntil) {
        const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - new Date().getTime()) / (1000 * 60));
        return res.status(423).json({ message: `الحساب محظور مؤقتاً. يرجى المحاولة بعد ${remainingMinutes} دقيقة` });
      }
      
      // Login successful for head - reset failed attempts
      await storage.updateUser(user.id, {
        failedLoginAttempts: 0,
        lockoutUntil: null
      });
      
      // Generate JWT token
      const token = generateToken(user);
      return res.status(200).json({ token, user });
    }
    
    // Get user by username first to check lockout status
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "معلومات الدخول خاطئة - راجع لجنة العائلة" });
    }
    
    // Check if account is locked out
    if (user.lockoutUntil && new Date() < user.lockoutUntil) {
      const remainingMinutes = Math.ceil((user.lockoutUntil.getTime() - new Date().getTime()) / (1000 * 60));
      return res.status(423).json({ message: `الحساب محظور مؤقتاً. يرجى المحاولة بعد ${remainingMinutes} دقيقة` });
    }
    
    // Get lockout settings
    const settings = await storage.getAllSettings();
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const maxLoginAttempts = parseInt(settingsMap.maxLoginAttempts || "5");
    const lockoutDuration = parseInt(settingsMap.lockoutDuration || "15");
    
    // Verify password
    const passwordMatch = await comparePasswords(password, user.password);
    
    if (!passwordMatch) {
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
        return res.status(423).json({ message: `تم حظر الحساب لمدة ${lockoutDuration} دقيقة بسبب محاولات تسجيل الدخول الفاشلة المتكررة` });
      } else {
        const remainingAttempts = maxLoginAttempts - newFailedAttempts;
        return res.status(401).json({ message: `فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور غير صحيحة. المحاولات المتبقية: ${remainingAttempts}` });
      }
    }
    
    // Login successful - reset failed attempts and lockout
    await storage.updateUser(user.id, {
      failedLoginAttempts: 0,
      lockoutUntil: null
    });
    
    // Generate JWT token
    const token = generateToken(user);
    res.status(200).json({ token, user });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "خطأ في الخادم" });
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  try {
    // Get fresh user data from database
    const user = await storage.getUser(req.user.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "خطأ في الخادم" });
  }
}

export function logoutHandler(req: Request, res: Response) {
  // With JWT, logout is handled client-side by removing the token
  // We could implement a token blacklist if needed
  res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
}