import 'dotenv/config';
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import {
  users,
  families,
  members,
  requests,
  notifications,
} from "./schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const main = async () => {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    const db = drizzle(client);

    console.log("🌱 Seeding users...");
    
    // Clear existing root user first
    await db.delete(users).where(eq(users.username, "root"));
    console.log("🗑️ Cleared existing root user");
    
    const hashedPassword = await hashPassword("123456");
    console.log(`🔑 Generated scrypt hash: ${hashedPassword.substring(0, 20)}...`);

    await db.insert(users).values([
      {
        username: "root",
        password: hashedPassword,
        role: "root",
        phone: "0592524815",
        isProtected: true,
      },
    ]);

    console.log("✅ Seed completed with scrypt password");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await client.end();
  }
};

main();