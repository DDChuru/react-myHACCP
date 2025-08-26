// Simplified network utilities that work without additional dependencies

export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    // Try to fetch a simple endpoint to check connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    
    const isOnline = response.ok || response.status < 500;
    console.log('[Network] Connection status:', isOnline);
    return isOnline;
  } catch (error) {
    console.log('[Network] Connection status: offline (error)', error.message);
    return false;
  }
};

export const subscribeToNetworkChanges = (callback: (isConnected: boolean) => void) => {
  // Simple polling mechanism as fallback
  let lastStatus = true;
  
  const checkStatus = async () => {
    const currentStatus = await checkNetworkStatus();
    if (currentStatus !== lastStatus) {
      lastStatus = currentStatus;
      callback(currentStatus);
    }
  };
  
  // Check every 30 seconds
  const interval = setInterval(checkStatus, 30000);
  
  // Return unsubscribe function
  return () => clearInterval(interval);
};