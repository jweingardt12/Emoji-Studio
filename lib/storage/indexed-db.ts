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

  // Reset the connection state (call this if database was deleted)
  reset(): void {
    if (this.db) {
      try {
        this.db.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    this.db = null;
    this.initPromise = null;
  }

  private async init(): Promise<void> {
    // Check if existing connection is still valid
    if (this.db) {
      try {
        // Test if the database is still accessible
        const tx = this.db.transaction(['emojis'], 'readonly');
        tx.abort();
        return;
      } catch (e) {
        // Database connection is stale, reset and reconnect
        console.log('[IndexedDB] Connection stale, reconnecting...');
        this.db = null;
        this.initPromise = null;
      }
    }

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
        this.initPromise = null; // Reset so we can retry
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Handle database being deleted while we have it open
        this.db.onversionchange = () => {
          console.log('[IndexedDB] Database version change detected, closing connection');
          this.db?.close();
          this.db = null;
          this.initPromise = null;
        };

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
    // Try to initialize, but don't block on failures
    try {
      await this.initWithTimeout(3000);
    } catch (error) {
      console.warn('[IndexedDB] Init failed, falling back to localStorage:', error);
      return null;
    }

    if (!this.db) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([store], 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.get(key);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };

        request.onerror = () => {
          console.warn('[IndexedDB] getItem error:', request.error);
          resolve(null);
        };

        transaction.onerror = () => {
          console.warn('[IndexedDB] Transaction error');
          resolve(null);
        };
      } catch (error) {
        console.warn('[IndexedDB] Transaction creation failed:', error);
        // Reset connection for next attempt
        this.reset();
        resolve(null);
      }
    });
  }

  // Initialize with timeout wrapper
  private async initWithTimeout(ms: number): Promise<void> {
    if (this.db) {
      // Verify connection is still valid
      try {
        const tx = this.db.transaction(['emojis'], 'readonly');
        tx.abort();
        return;
      } catch (e) {
        this.reset();
      }
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.reset();
        reject(new Error('IndexedDB init timed out'));
      }, ms);

      this.init()
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timeout);
          this.reset();
          reject(err);
        });
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

    // ALWAYS save to localStorage first as primary storage (fast and reliable)
    // This ensures data is persisted even if IndexedDB fails
    let savedToLocalStorage = false;
    try {
      // Check existing localStorage timestamp before overwriting
      const existingLsMeta = localStorage.getItem('emojiDataMeta');
      const existingTimestamp = existingLsMeta ? JSON.parse(existingLsMeta).timestamp : 0;

      if (saveTimestamp >= existingTimestamp) {
        localStorage.setItem('emojiData', JSON.stringify(emojis));
        localStorage.setItem('emojiDataMeta', JSON.stringify({ timestamp: saveTimestamp, version: 1 }));
        savedToLocalStorage = true;
        console.log(`[EmojiStorage] Saved ${emojis.length} emojis to localStorage with timestamp ${saveTimestamp}`);
      } else {
        console.log(`[EmojiStorage] Skipped localStorage save - existing data is newer (${existingTimestamp} > ${saveTimestamp})`);
      }
    } catch (error) {
      console.error('[EmojiStorage] Failed to save to localStorage:', error);
      // Try safe persist as last resort
      const result = safePersistEmojiDataToLocalStorage(emojis as any, { source: 'direct-save-fallback' });
      if (result.saved) {
        localStorage.setItem('emojiDataMeta', JSON.stringify({ timestamp: saveTimestamp, version: 1 }));
        savedToLocalStorage = true;
        console.log(`[EmojiStorage] Saved via safePersist fallback`);
      }
    }

    // Then try IndexedDB as secondary/backup storage (may timeout, that's ok)
    try {
      await idb.setItem('emojis', 'emoji_data', dataWithMeta);
      console.log(`[EmojiStorage] Also saved ${emojis.length} emojis to IndexedDB`);
    } catch (error) {
      // IndexedDB failure is ok - we already saved to localStorage
      console.warn('[EmojiStorage] IndexedDB save failed (localStorage is primary):', error);
    }

    if (!savedToLocalStorage) {
      console.error('[EmojiStorage] CRITICAL: Failed to save emojis to any storage!');
    }
  },

  async loadEmojisWithMeta(): Promise<{ emojis: any[], timestamp: number, version: number } | null> {
    let lsData = null;

    // Try localStorage FIRST (fast and reliable)
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

    // If we have localStorage data, return it immediately without waiting for IndexedDB
    // IndexedDB may timeout and we don't want to block the UI
    if (lsData && lsData.emojis.length > 0) {
      return lsData;
    }

    // Only try IndexedDB if localStorage is empty
    let idbData = null;
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
      console.warn('[EmojiStorage] IndexedDB load failed:', error);
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