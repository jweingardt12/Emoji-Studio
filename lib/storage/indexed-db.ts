// IndexedDB wrapper for persistent storage of large data
import { safePersistEmojiDataToLocalStorage } from "./safe-emoji-local-storage";

const DB_NAME = 'EmojiStudioDB';
const DB_VERSION = 1;

interface DBStores {
  emojis: {
    key: string;
    value: any;
  };
  settings: {
    key: string;
    value: any;
  };
  cache: {
    key: string;
    value: any;
    timestamp: number;
  };
}

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize DB on first use
  }

  private async init(): Promise<void> {
    if (this.db) return;
    
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('emojis')) {
          db.createObjectStore('emojis', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    await this.initPromise;
  }

  async setItem(store: keyof DBStores, key: string, value: any): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      
      const data = store === 'cache' 
        ? { key, value, timestamp: Date.now() }
        : { key, value };

      const request = objectStore.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getItem(store: keyof DBStores, key: string): Promise<any> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async removeItem(store: keyof DBStores, key: string): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(store: keyof DBStores): Promise<void> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([store], 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllKeys(store: keyof DBStores): Promise<string[]> {
    await this.init();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([store], 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  }

  // Clean up old cache entries
  async cleanupCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    await this.init();
    
    if (!this.db) return;

    const transaction = this.db.transaction(['cache'], 'readwrite');
    const objectStore = transaction.objectStore('cache');
    const index = objectStore.index('timestamp');
    const cutoff = Date.now() - maxAge;

    const request = index.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        if (cursor.value.timestamp < cutoff) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }
}

// Singleton instance
export const idb = new IndexedDBStorage();

// Helper functions for emoji data specifically with timestamp versioning
export const emojiStorage = {
  async saveEmojis(emojis: any[], timestamp?: number): Promise<void> {
    const saveTimestamp = timestamp || Date.now();
    const dataWithMeta = {
      emojis,
      timestamp: saveTimestamp,
      version: 1
    };

    // Check if we're trying to save older data
    const existing = await this.loadEmojisWithMeta();
    if (existing && existing.timestamp > saveTimestamp) {
      console.warn(`[EmojiStorage] Rejecting stale data write. Existing: ${existing.timestamp}, New: ${saveTimestamp}`);
      return;
    }

    let storedInIndexedDb = false;

    try {
      await idb.setItem('emojis', 'emoji_data', dataWithMeta);
      storedInIndexedDb = true;
      console.log(`[EmojiStorage] Saved ${emojis.length} emojis to IndexedDB with timestamp ${saveTimestamp}`);
    } catch (error) {
      console.error('[EmojiStorage] Failed to save emojis to IndexedDB:', error);
    }

    // Always sync to localStorage for fallback, with same timestamp check
    if (storedInIndexedDb) {
      try {
        const existingLs = localStorage.getItem('emojiData');
        const existingLsMeta = existingLs ? JSON.parse(localStorage.getItem('emojiDataMeta') || '{}') : null;

        if (!existingLsMeta || existingLsMeta.timestamp < saveTimestamp) {
          localStorage.setItem('emojiData', JSON.stringify(emojis));
          localStorage.setItem('emojiDataMeta', JSON.stringify({ timestamp: saveTimestamp, version: 1 }));
          console.log(`[EmojiStorage] Synced ${emojis.length} emojis to localStorage with timestamp ${saveTimestamp}`);
        } else {
          console.log(`[EmojiStorage] Skipped localStorage sync - existing data is newer`);
        }
      } catch (error) {
        console.error('[EmojiStorage] Failed to sync to localStorage:', error);
      }
    } else {
      // IndexedDB failed, try localStorage as primary
      const result = safePersistEmojiDataToLocalStorage(emojis as any, { source: 'indexedDB-fallback' });
      if (result.saved) {
        localStorage.setItem('emojiDataMeta', JSON.stringify({ timestamp: saveTimestamp, version: 1 }));
      } else if (result.reason) {
        console.warn(`[EmojiStorage] Emoji data could not be persisted to localStorage fallback: ${result.reason}`);
      }
    }
  },

  async loadEmojisWithMeta(): Promise<{ emojis: any[], timestamp: number, version: number } | null> {
    let idbData = null;
    let lsData = null;

    // Try IndexedDB first
    try {
      const data = await idb.getItem('emojis', 'emoji_data');
      if (data) {
        // Check if data has metadata (new format)
        if (data.emojis && data.timestamp) {
          idbData = data;
          console.log(`[EmojiStorage] Loaded ${data.emojis.length} emojis from IndexedDB (timestamp: ${data.timestamp})`);
        } else if (Array.isArray(data)) {
          // Old format - migrate it
          idbData = { emojis: data, timestamp: Date.now(), version: 1 };
          console.log(`[EmojiStorage] Migrating ${data.length} emojis to new format`);
        }
      }
    } catch (error) {
      console.error('[EmojiStorage] Failed to load from IndexedDB:', error);
    }

    // Try localStorage
    try {
      const stored = localStorage.getItem('emojiData');
      const storedMeta = localStorage.getItem('emojiDataMeta');

      if (stored) {
        const emojis = JSON.parse(stored);
        const meta = storedMeta ? JSON.parse(storedMeta) : { timestamp: 0, version: 1 };
        lsData = { emojis, timestamp: meta.timestamp, version: meta.version };
        console.log(`[EmojiStorage] Loaded ${emojis.length} emojis from localStorage (timestamp: ${meta.timestamp})`);
      }
    } catch (error) {
      console.error('[EmojiStorage] Failed to load from localStorage:', error);
    }

    // Return the newest data
    if (idbData && lsData) {
      const result = idbData.timestamp >= lsData.timestamp ? idbData : lsData;
      console.log(`[EmojiStorage] Using ${idbData.timestamp >= lsData.timestamp ? 'IndexedDB' : 'localStorage'} data (newer)`);
      return result;
    }

    return idbData || lsData;
  },

  async loadEmojis(): Promise<any[] | null> {
    const data = await this.loadEmojisWithMeta();
    return data ? data.emojis : null;
  },

  async clearEmojis(): Promise<void> {
    console.log('[EmojiStorage] Clearing all emoji data');
    try {
      await idb.removeItem('emojis', 'emoji_data');
    } catch (error) {
      console.error('[EmojiStorage] Failed to clear from IndexedDB:', error);
    }
    localStorage.removeItem('emojiData');
    localStorage.removeItem('emojiDataMeta');
  }
};

// Settings storage with automatic sync between localStorage and IndexedDB
export const settingsStorage = {
  async saveSetting(key: string, value: any): Promise<void> {
    // Save to both for redundancy
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    
    try {
      await idb.setItem('settings', key, value);
    } catch (error) {
      console.error('Failed to save setting to IndexedDB:', error);
    }
  },

  async loadSetting(key: string): Promise<any> {
    // Try IndexedDB first
    try {
      const value = await idb.getItem('settings', key);
      if (value !== null) return value;
    } catch (error) {
      console.error('Failed to load setting from IndexedDB:', error);
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return stored; // Return as string if not JSON
      }
    }
    
    return null;
  },

  async clearSetting(key: string): Promise<void> {
    localStorage.removeItem(key);
    
    try {
      await idb.removeItem('settings', key);
    } catch (error) {
      console.error('Failed to clear setting from IndexedDB:', error);
    }
  }
};