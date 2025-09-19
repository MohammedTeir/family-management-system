import { apiClient } from './api';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'error';
  timestamp: string;
  database?: {
    healthy: boolean;
    error: string | null;
  };
  serverless?: {
    platform: string;
    memory: any;
    uptime: number;
  };
  error?: string;
}

export async function checkBackendHealth(): Promise<HealthStatus> {
  try {
    const response = await apiClient.get('/api/health', {
      timeout: 5000 // 5 second timeout for health checks
    });
    return response.data as HealthStatus;
  } catch (error: any) {
    console.error('Health check failed:', error);
    
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed'
    };
  }
}

export async function waitForDatabase(
  maxAttempts: number = 5,
  interval: number = 2000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Checking database health (attempt ${attempt}/${maxAttempts})...`);
    
    try {
      const health = await checkBackendHealth();
      
      if (health.status === 'healthy' && health.database?.healthy) {
        console.log('✅ Database is healthy');
        return true;
      }
      
      if (health.database?.error) {
        console.log(`❌ Database error: ${health.database.error}`);
      }
      
    } catch (error) {
      console.log(`❌ Health check failed: ${error}`);
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏳ Waiting ${interval}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  console.log('💥 Database health check failed after all attempts');
  return false;
}

// React Query retry configuration for database errors
export const databaseRetryConfig = {
  retry: (failureCount: number, error: any) => {
    // Don't retry more than 3 times
    if (failureCount >= 3) return false;
    
    // Only retry for database-related errors
    const message = error?.message?.toLowerCase() || '';
    const isDatabaseError = message.includes('قاعدة البيانات متوقفة') || 
                            message.includes('database temporarily unavailable') ||
                            message.includes('connection') ||
                            message.includes('timeout');
    
    return isDatabaseError;
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff with max 30s
};