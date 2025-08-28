/**
 * Platform-agnostic storage wrapper
 * Handles both React Native (AsyncStorage) and Web (localStorage/memory)
 */
import { Platform } from 'react-native';

// Only import AsyncStorage on native platforms
const AsyncStorage = Platform.OS !== 'web' 
  ? require('@react-native-async-storage/async-storage').default
  : null;

// In-memory fallback for SSR
const memoryStorage: { [key: string]: string } = {};

class StorageWrapper {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web (client-side)
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        // Fallback to memory storage for SSR
        return memoryStorage[key] || null;
      }
      // Use AsyncStorage on native
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web (client-side)
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
        // Fallback to memory storage for SSR
        memoryStorage[key] = value;
        return;
      }
      // Use AsyncStorage on native
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web (client-side)
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
        // Fallback to memory storage for SSR
        delete memoryStorage[key];
        return;
      }
      // Use AsyncStorage on native
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web (client-side)
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.clear();
          return;
        }
        // Clear memory storage for SSR
        Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
        return;
      }
      // Use AsyncStorage on native
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }

  async getAllKeys(): Promise<string[]> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web (client-side)
        if (typeof window !== 'undefined' && window.localStorage) {
          return Object.keys(window.localStorage);
        }
        // Return memory storage keys for SSR
        return Object.keys(memoryStorage);
      }
      // Use AsyncStorage on native
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Storage getAllKeys error:', error);
      return [];
    }
  }

  async multiGet(keys: string[]): Promise<Array<[string, string | null]>> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web (client-side)
        const result: Array<[string, string | null]> = [];
        for (const key of keys) {
          const value = await this.getItem(key);
          result.push([key, value]);
        }
        return result;
      }
      // Use AsyncStorage on native
      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('Storage multiGet error:', error);
      return keys.map(key => [key, null]);
    }
  }

  async multiSet(keyValuePairs: Array<[string, string]>): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web (client-side)
        for (const [key, value] of keyValuePairs) {
          await this.setItem(key, value);
        }
        return;
      }
      // Use AsyncStorage on native
      await AsyncStorage.multiSet(keyValuePairs);
    } catch (error) {
      console.error('Storage multiSet error:', error);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Use localStorage on web (client-side)
        for (const key of keys) {
          await this.removeItem(key);
        }
        return;
      }
      // Use AsyncStorage on native
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Storage multiRemove error:', error);
    }
  }
}

export const Storage = new StorageWrapper();
export default Storage;