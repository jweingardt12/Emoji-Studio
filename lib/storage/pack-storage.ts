/**
 * Pack Storage Service
 * IndexedDB-based storage for emoji packs
 */

import type { EmojiPack, PackEmoji } from "@/lib/types/emoji-pack"
import type { ProcessedEmoji } from "@/lib/utils/emoji-processor"

const DB_NAME = "emoji-studio-packs"
const DB_VERSION = 1
const STORE_NAME = "packs"

class PackStorageService {
  private db: IDBDatabase | null = null

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
          store.createIndex("source", "source", { unique: false })
          store.createIndex("created", "created", { unique: false })
        }
      }
    })
  }

  async savePack(pack: EmojiPack): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.put(pack)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getPack(id: string): Promise<EmojiPack | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllPacks(): Promise<EmojiPack[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async updatePack(
    id: string,
    updates: Partial<EmojiPack>
  ): Promise<void> {
    const pack = await this.getPack(id)
    if (!pack) throw new Error(`Pack ${id} not found`)

    const updated = {
      ...pack,
      ...updates,
      lastModified: Date.now(),
    }

    await this.savePack(updated)
  }

  async deletePack(id: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async saveEmojisToNewPack(
    emojis: ProcessedEmoji[],
    name: string,
    description?: string
  ): Promise<EmojiPack> {
    const packEmojis: PackEmoji[] = await Promise.all(
      emojis.map(async (emoji, index) => ({
        id: `${Date.now()}-${index}`,
        name: emoji.name,
        imageURL: emoji.blob, // Data URL
        isAnimated: emoji.format === "GIF",
        originalFile: emoji.originalFile,
        processedBlob: emoji.processedBlob,
        metadata: {
          width: emoji.dimensions.width,
          height: emoji.dimensions.height,
          format: emoji.format,
          size: emoji.processedSize,
        },
      }))
    )

    const pack: EmojiPack = {
      id: `pack-${Date.now()}`,
      name,
      description,
      source: "local",
      emojis: packEmojis,
      created: Date.now(),
      lastModified: Date.now(),
      thumbnail: packEmojis[0]?.imageURL,
    }

    await this.savePack(pack)
    return pack
  }

  async addEmojisToExistingPack(
    packId: string,
    emojis: PackEmoji[]
  ): Promise<void> {
    const pack = await this.getPack(packId)
    if (!pack) throw new Error(`Pack ${packId} not found`)

    pack.emojis.push(...emojis)
    pack.lastModified = Date.now()

    await this.savePack(pack)
  }

  async removeEmojisFromPack(
    packId: string,
    emojiIds: string[]
  ): Promise<void> {
    const pack = await this.getPack(packId)
    if (!pack) throw new Error(`Pack ${packId} not found`)

    pack.emojis = pack.emojis.filter((e) => !emojiIds.includes(e.id))
    pack.lastModified = Date.now()

    await this.savePack(pack)
  }
}

export const packStorage = new PackStorageService()