// Debug utilities for mobile development

// Enhanced console.log with timestamps and colors
export const debug = {
  log: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] 📘 ${message}`, data || '');
  },
  
  error: (message: string, error?: any) => {
    console.error(`[${new Date().toISOString()}] ❌ ${message}`, error || '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[${new Date().toISOString()}] ⚠️ ${message}`, data || '');
  },
  
  success: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] ✅ ${message}`, data || '');
  },
  
  network: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] 🌐 ${message}`, data || '');
  },
  
  firestore: (message: string, data?: any) => {
    console.log(`[${new Date().toISOString()}] 🔥 Firestore: ${message}`, data || '');
  },
};

// Performance timing
export class PerfTimer {
  private startTime: number;
  private name: string;
  
  constructor(name: string) {
    this.name = name;
    this.startTime = Date.now();
    debug.log(`Timer started: ${name}`);
  }
  
  end() {
    const duration = Date.now() - this.startTime;
    debug.success(`${this.name} completed in ${duration}ms`);
    return duration;
  }
}

// Network request logger
export const logNetworkRequest = (url: string, method: string, payload?: any) => {
  debug.network(`${method} ${url}`, payload);
};

// Firestore operation logger
export const logFirestoreOp = (operation: string, collection: string, data?: any) => {
  debug.firestore(`${operation} on ${collection}`, data);
};

// Error boundary logger
export const logError = (error: Error, errorInfo?: any) => {
  debug.error('Component Error:', {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
  });
};