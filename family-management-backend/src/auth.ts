import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import bcrypt from "bcryptjs";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  if (!stored) {
    console.log(`❌ No stored password`);
    return false;
  }
  
  // Check if it's a bcrypt hash (starts with $2b$, $2a$, etc.)
  if (stored.startsWith('$2') && stored.length >= 60) {
    console.log(`🔐 Using bcrypt comparison for: ${stored.substring(0, 10)}...`);
    try {
      const result = await bcrypt.compare(supplied, stored);
      console.log(`🔒 Bcrypt comparison result: ${result}`);
      return result;
    } catch (error) {
      console.error("Bcrypt comparison error:", error);
      return false;
    }
  }
  
  // Check if it's a scrypt hash (contains a dot)
  if (stored.includes(".")) {
    console.log(`🔐 Using scrypt comparison for: ${stored.substring(0, 20)}...`);
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.log(`❌ Failed to split scrypt hash: hashed=${!!hashed}, salt=${!!salt}`);
      return false;
    }
    
    try {
      const hashedBuf = Buffer.from(hashed, "hex");
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      
      console.log(`🔍 Buffer lengths - stored: ${hashedBuf.length}, computed: ${suppliedBuf.length}`);
      
      // Ensure buffers are same length before comparison
      if (hashedBuf.length !== suppliedBuf.length) {
        console.log(`❌ Buffer length mismatch`);
        return false;
      }
      
      const result = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log(`🔒 Scrypt comparison result: ${result}`);
      return result;
    } catch (error) {
      console.error("Scrypt comparison error:", error);
      return false;
    }
  }
  
  console.log(`❌ Unknown password format: ${stored.substring(0, 10)}...`);
  return false;
}

