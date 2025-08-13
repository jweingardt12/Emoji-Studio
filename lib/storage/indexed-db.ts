// IndexedDB wrapper for persistent storage of large data
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

// Helper functions for emoji data specifically
export const emojiStorage = {
  async saveEmojis(emojis: any[]): Promise<void> {
    try {
      await idb.setItem('emojis', 'emoji_data', emojis);
      console.log(`Saved ${emojis.length} emojis to IndexedDB`);
    } catch (error) {
      console.error('Failed to save emojis to IndexedDB:', error);
      // Fallback to localStorage
      localStorage.setItem('emojiData', JSON.stringify(emojis));
    }
  },

  async loadEmojis(): Promise<any[] | null> {
    try {
      const emojis = await idb.getItem('emojis', 'emoji_data');
      if (emojis) {
        console.log(`Loaded ${emojis.length} emojis from IndexedDB`);
        return emojis;
      }
    } catch (error) {
      console.error('Failed to load emojis from IndexedDB:', error);
    }
    
    // Fallback to localStorage
    const stored = localStorage.getItem('emojiData');
    if (stored) {
      try {
        const emojis = JSON.parse(stored);
        // Migrate to IndexedDB
        await idb.setItem('emojis', 'emoji_data', emojis).catch(() => {});
        return emojis;
      } catch (e) {
        console.error('Failed to parse localStorage emoji data:', e);
      }
    }
    
    return null;
  },

  async clearEmojis(): Promise<void> {
    try {
      await idb.removeItem('emojis', 'emoji_data');
    } catch (error) {
      console.error('Failed to clear emojis from IndexedDB:', error);
    }
    localStorage.removeItem('emojiData');
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