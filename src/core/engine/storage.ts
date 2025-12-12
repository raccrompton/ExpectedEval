/**
 * IndexedDB Storage for Maia Model Caching
 *
 * This file manages persistent browser storage for the Maia ONNX model.
 * The model file is ~90MB, so we cache it in IndexedDB to avoid re-downloading
 * on every page load. IndexedDB is a low-level browser API for storing large
 * amounts of structured data, including files/blobs.
 *
 * Why IndexedDB instead of localStorage?
 * - localStorage is limited to ~5MB
 * - IndexedDB can store hundreds of MBs
 * - IndexedDB supports binary data (Blobs, ArrayBuffers)
 *
 * The storage flow:
 * 1. First visit: Download model → store in IndexedDB → initialize
 * 2. Later visits: Load from IndexedDB → initialize (much faster!)
 *
 * @example
 * const storage = new MaiaModelStorage()
 * const buffer = await storage.getModel('/maia2/maia_rapid.onnx')
 * if (!buffer) {
 *   // Model not cached, need to download
 *   await downloadAndStore()
 * }
 */

/**
 * Schema for model data stored in IndexedDB.
 *
 * Each cached model has:
 * - id: Unique identifier (we use 'maia-rapid-model' for the main model)
 * - url: The original URL (for cache invalidation if model changes)
 * - data: The actual model bytes as a Blob
 * - timestamp: When it was cached (for potential expiry logic)
 * - size: Size in bytes (for display to user)
 */
interface ModelStorage {
  id: string       // Primary key for IndexedDB
  url: string      // Original download URL
  data: Blob       // The model file as a binary blob
  timestamp: number // Unix timestamp when cached
  size: number     // File size in bytes
}

/**
 * Manages Maia model caching in browser's IndexedDB.
 *
 * This class provides methods to:
 * - Store a downloaded model
 * - Retrieve a cached model
 * - Check storage availability and usage
 * - Clear cached data
 *
 * @example
 * const storage = new MaiaModelStorage()
 *
 * // Check if model is cached
 * const cached = await storage.getModel('/maia2/maia_rapid.onnx')
 *
 * // Store after downloading
 * await storage.storeModel('/maia2/maia_rapid.onnx', downloadedBuffer)
 *
 * // Get storage info for debugging
 * const info = await storage.getStorageInfo()
 * console.log(`Model size: ${info.modelSize} bytes`)
 */
export class MaiaModelStorage {
  // IndexedDB configuration
  private dbName = 'MaiaModels'    // Database name
  private storeName = 'models'     // Object store (like a table) name
  private version = 1              // Schema version (increment to trigger upgrade)
  private db: IDBDatabase | null = null  // Cached database connection

  /**
   * Opens (or creates) the IndexedDB database.
   *
   * IndexedDB is asynchronous, so we return a Promise.
   * The database is created on first access with our schema.
   *
   * @returns Promise resolving to the database connection
   */
  async openDB(): Promise<IDBDatabase> {
    // Return cached connection if available
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      // Request to open the database with our version
      const request = indexedDB.open(this.dbName, this.version)

      // Handle errors (e.g., user denied storage permission)
      request.onerror = () => reject(request.error)

      // Handle successful connection
      request.onsuccess = () => {
        this.db = request.result
        resolve(request.result)
      }

      // Handle database upgrade (runs on first open or version change)
      // This is where we define the schema
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create the 'models' object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          // Create store with 'id' as the primary key
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' })
          // Create an index on timestamp for potential cleanup queries
          store.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Stores a downloaded model in IndexedDB.
   *
   * The model is stored as a Blob along with metadata.
   * If a model with the same ID exists, it's overwritten.
   *
   * @param modelUrl - The URL the model was downloaded from
   * @param buffer - The model data as an ArrayBuffer
   *
   * @example
   * const response = await fetch('/maia2/maia_rapid.onnx')
   * const buffer = await response.arrayBuffer()
   * await storage.storeModel('/maia2/maia_rapid.onnx', buffer)
   */
  async storeModel(modelUrl: string, buffer: ArrayBuffer): Promise<void> {
    try {
      // Get database connection
      const db = await this.openDB()

      // Start a read-write transaction on the models store
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      // Prepare the model data object
      const modelData: ModelStorage = {
        id: 'maia-rapid-model',      // Fixed ID for the main model
        url: modelUrl,               // For cache invalidation
        data: new Blob([buffer]),    // Convert ArrayBuffer to Blob for storage
        timestamp: Date.now(),       // Current time in milliseconds
        size: buffer.byteLength,     // Size for display/debugging
      }

      // Store (or replace) the model data
      await new Promise<void>((resolve, reject) => {
        const request = store.put(modelData)  // put = insert or update
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      console.log('Maia model stored in IndexedDB')
    } catch (error) {
      console.error('Failed to store model in IndexedDB:', error)
      throw error
    }
  }

  /**
   * Retrieves a cached model from IndexedDB.
   *
   * Returns null if:
   * - Model not found (first visit)
   * - URL changed (model was updated on server)
   * - Any error occurs (fail gracefully)
   *
   * @param modelUrl - The expected URL (for cache validation)
   * @returns The model as ArrayBuffer, or null if not cached
   *
   * @example
   * const buffer = await storage.getModel('/maia2/maia_rapid.onnx')
   * if (buffer) {
   *   // Use cached model
   *   const session = await InferenceSession.create(buffer)
   * } else {
   *   // Need to download model
   * }
   */
  async getModel(modelUrl: string): Promise<ArrayBuffer | null> {
    console.log('Storage: getModel called with URL:', modelUrl)

    try {
      console.log('Storage: Opening IndexedDB...')
      const db = await this.openDB()

      // Start a read-only transaction
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      console.log('Storage: Requesting model data...')

      // Try to get the model by ID
      const modelData = await new Promise<ModelStorage | null>(
        (resolve, reject) => {
          const request = store.get('maia-rapid-model')
          request.onsuccess = () => {
            console.log(
              'Storage: IndexedDB request successful, result:',
              request.result ? 'Found' : 'Not found',
            )
            resolve(request.result || null)
          }
          request.onerror = () => {
            console.log('Storage: IndexedDB request error:', request.error)
            reject(request.error)
          }
        },
      )

      // No cached model found
      if (!modelData) {
        console.log('Storage: No model data found in IndexedDB (normal for first visit)')
        return null
      }

      // Check if URL matches (cache invalidation)
      // If the server URL changed, we need to re-download
      if (modelData.url !== modelUrl) {
        console.log('Storage: Model URL changed, clearing old cache')
        console.log('Storage: Cached URL:', modelData.url)
        console.log('Storage: Requested URL:', modelUrl)
        await this.deleteModel()
        console.log('Storage: Old cache cleared, model needs to be re-downloaded')
        return null
      }

      console.log('Storage: Converting Blob to ArrayBuffer...')

      // Convert Blob back to ArrayBuffer for ONNX runtime
      const buffer = await modelData.data.arrayBuffer()

      console.log('Storage: Successfully retrieved model, size:', buffer.byteLength)
      return buffer
    } catch (error) {
      console.error('Storage: IndexedDB operation failed:', error)
      // Don't throw - return null so caller knows to download
      return null
    }
  }

  /**
   * Deletes the cached model from IndexedDB.
   *
   * Used when:
   * - Cache invalidation (URL changed)
   * - User requests to clear data
   * - Debugging/testing
   */
  async deleteModel(): Promise<void> {
    try {
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      await new Promise<void>((resolve, reject) => {
        const request = store.delete('maia-rapid-model')
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to delete model from IndexedDB:', error)
    }
  }

  /**
   * Gets information about storage state.
   *
   * Useful for:
   * - Debugging storage issues
   * - Showing storage usage to user
   * - Checking if IndexedDB is supported
   *
   * @returns Object with storage info
   *
   * @example
   * const info = await storage.getStorageInfo()
   * console.log(`IndexedDB supported: ${info.supported}`)
   * console.log(`Storage quota: ${info.quota} bytes`)
   * console.log(`Storage used: ${info.usage} bytes`)
   * console.log(`Model size: ${info.modelSize} bytes`)
   */
  async getStorageInfo(): Promise<{
    supported: boolean        // Whether IndexedDB is available
    quota?: number           // Total storage quota in bytes
    usage?: number           // Current storage usage in bytes
    modelSize?: number       // Size of cached model in bytes
    modelTimestamp?: number  // When model was cached (Unix timestamp)
  }> {
    try {
      // Check if IndexedDB is supported
      const supported = 'indexedDB' in globalThis
      if (!supported) {
        return { supported: false }
      }

      let quota: number | undefined
      let usage: number | undefined

      // Try to get storage estimates (not supported in all browsers)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        quota = estimate.quota
        usage = estimate.usage
      }

      // Get info about cached model
      const db = await this.openDB()
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)

      const modelData = await new Promise<ModelStorage | null>(
        (resolve, reject) => {
          const request = store.get('maia-rapid-model')
          request.onsuccess = () => resolve(request.result || null)
          request.onerror = () => reject(request.error)
        },
      )

      return {
        supported: true,
        quota,
        usage,
        modelSize: modelData?.size,
        modelTimestamp: modelData?.timestamp,
      }
    } catch (error) {
      console.error('Failed to get storage info:', error)
      return { supported: false }
    }
  }

  /**
   * Requests persistent storage from the browser.
   *
   * By default, browser storage can be cleared when disk space is low.
   * Persistent storage won't be cleared automatically.
   *
   * Note: This requires user permission and may show a prompt.
   *
   * @returns Whether persistent storage was granted
   */
  async requestPersistentStorage(): Promise<boolean> {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const isPersistent = await navigator.storage.persist()
        console.log(
          isPersistent
            ? 'Persistent storage granted'
            : 'Persistent storage denied',
        )
        return isPersistent
      }
      return false
    } catch (error) {
      console.error('Failed to request persistent storage:', error)
      return false
    }
  }

  /**
   * Clears all cached Maia data from IndexedDB.
   *
   * Use with caution - user will need to re-download the model.
   */
  async clearAllStorage(): Promise<void> {
    try {
      await this.deleteModel()
      console.log('Maia storage cleared')
    } catch (error) {
      console.warn('Failed to clear storage:', error)
    }
  }
}

// Export a default instance for convenience
export default MaiaModelStorage
