import { db, pool } from './db.js';

// Database error codes that indicate connection issues
const CONNECTION_ERROR_CODES = [
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown  
  '57P03', // cannot_connect_now
  '08000', // connection_exception
  '08003', // connection_does_not_exist
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
];

// Check if error is a connection-related error
function isConnectionError(error: any): boolean {
  if (!error) return false;
  
  // Check PostgreSQL error codes
  if (error.code && CONNECTION_ERROR_CODES.includes(error.code)) {
    return true;
  }
  
  // Check error messages
  const message = error.message?.toLowerCase() || '';
  return message.includes('connection') || 
         message.includes('connect') ||
         message.includes('terminating') ||
         message.includes('timeout') ||
         message.includes('network') ||
         message.includes('closed');
}

// Sleep function for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Database operation wrapper with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Database operation attempt ${attempt}/${maxAttempts}`);
      const result = await operation();
      
      if (attempt > 1) {
        console.log(`✅ Database operation succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error: any) {
      lastError = error;
      console.error(`❌ Database operation failed on attempt ${attempt}:`, {
        code: error.code,
        message: error.message,
        isConnectionError: isConnectionError(error)
      });
      
      // If it's the last attempt or not a connection error, don't retry
      if (attempt === maxAttempts || !isConnectionError(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await sleep(delay);
      
      // For Neon database, try to refresh the connection
      try {
        console.log('🔄 Testing database connection...');
        await db.execute('SELECT 1');
        console.log('✅ Database connection is healthy');
      } catch (connectionError) {
        console.log('⚠️ Database connection test failed, will retry operation anyway');
      }
    }
  }
  
  // Log final error details
  console.error('💥 Database operation failed after all retries:', {
    code: lastError.code,
    message: lastError.message,
    maxAttempts,
    isConnectionError: isConnectionError(lastError)
  });
  
  // Enhance error message for connection-related errors
  if (isConnectionError(lastError)) {
    const enhancedError = new Error(
      `Database temporarily unavailable. Please try again in a moment. (${lastError.message})`
    );
    (enhancedError as any).code = lastError.code;
    (enhancedError as any).isConnectionError = true;
    throw enhancedError;
  }
  
  throw lastError;
}

// Wrap common database operations
export const dbWithRetry = {
  // Generic query execution
  execute: <T>(query: any) => withRetry(() => db.execute(query)),
  
  // Select operations
  select: <T>(query: any) => withRetry(() => db.select(query)),
  
  // Insert operations
  insert: <T>(table: any) => ({
    values: (values: any) => withRetry(() => db.insert(table).values(values).returning())
  }),
  
  // Update operations
  update: <T>(table: any) => ({
    set: (values: any) => ({
      where: (condition: any) => withRetry(() => db.update(table).set(values).where(condition).returning())
    })
  }),
  
  // Delete operations
  delete: <T>(table: any) => ({
    where: (condition: any) => withRetry(() => db.delete(table).where(condition))
  }),
  
  // Transaction wrapper
  transaction: <T>(callback: (tx: any) => Promise<T>) => 
    withRetry(() => db.transaction(callback))
};

// Health check function
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; error?: string }> {
  try {
    await withRetry(() => db.execute('SELECT 1'), 2, 500);
    return { healthy: true };
  } catch (error: any) {
    return { 
      healthy: false, 
      error: error.message,
      isConnectionError: isConnectionError(error)
    };
  }
}