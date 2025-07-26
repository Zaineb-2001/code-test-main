interface DocumentData {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  readingTime: number;
  fleschScore: number;
  version: number;
}

interface StorageConfig {
  debounceDelay: number;
  maxChunkSize: number;
  compressionThreshold: number;
  maxStorageSize: number;
}

class StorageService {
  private config: StorageConfig;
  private saveQueue: Map<string, NodeJS.Timeout> = new Map();
  private compressionWorker: Worker | null = null;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = {
      debounceDelay: 2000, // 2 seconds
      maxChunkSize: 1000000, // 1MB chunks
      compressionThreshold: 50000, // 50KB threshold for compression
      maxStorageSize: 50 * 1024 * 1024, // 50MB total storage limit
      ...config
    };

    this.initializeCompressionWorker();
  }

  private initializeCompressionWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.compressionWorker = new Worker(new URL('./compression-worker.js', import.meta.url));
      } catch (error) {
        console.warn('Compression worker not available, using fallback compression');
      }
    }
  }

  // Debounced auto-save with localStorage backup
  debouncedSave(documentId: string, data: Partial<DocumentData>): Promise<void> {
    return new Promise((resolve, reject) => {
      // Clear existing timeout for this document
      if (this.saveQueue.has(documentId)) {
        clearTimeout(this.saveQueue.get(documentId)!);
      }

      // Set new timeout
      const timeoutId = setTimeout(async () => {
        try {
          await this.saveDocument(documentId, data);
          this.saveQueue.delete(documentId);
          resolve();
        } catch (error) {
          this.saveQueue.delete(documentId);
          reject(error);
        }
      }, this.config.debounceDelay);

      this.saveQueue.set(documentId, timeoutId);
    });
  }

  // Save document with efficient handling
  private async saveDocument(documentId: string, data: Partial<DocumentData>): Promise<void> {
    try {
      const existingData = this.getDocument(documentId);
      const updatedData = {
        ...existingData,
        ...data,
        updatedAt: new Date(),
        version: (existingData?.version || 0) + 1
      };

      // Handle large content efficiently
      if (updatedData.content && updatedData.content.length > this.config.compressionThreshold) {
        updatedData.content = await this.compressContent(updatedData.content);
      }

      // Check storage limits
      await this.ensureStorageSpace(updatedData);

      // Save in chunks if content is very large
      if (updatedData.content && updatedData.content.length > this.config.maxChunkSize) {
        await this.saveLargeDocument(documentId, updatedData);
      } else {
        await this.saveToLocalStorage(documentId, updatedData);
      }

      // Create backup
      await this.createBackup(documentId, updatedData);

    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  // Compress content if needed
  private async compressContent(content: string): Promise<string> {
    if (!this.compressionWorker) {
      // Fallback compression using built-in methods
      return this.fallbackCompression(content);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Compression timeout'));
      }, 5000);

      this.compressionWorker!.onmessage = (event) => {
        clearTimeout(timeoutId);
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.compressed);
        }
      };

      this.compressionWorker!.postMessage({ content });
    });
  }

  // Fallback compression for browsers without Web Workers
  private fallbackCompression(content: string): string {
    try {
      // Simple compression: remove extra whitespace and newlines
      const compressed = content
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      
      // If still too large, truncate with ellipsis
      if (compressed.length > this.config.maxChunkSize) {
        return compressed.substring(0, this.config.maxChunkSize - 100) + '...';
      }
      
      return compressed;
    } catch (error) {
      console.warn('Compression failed, using original content');
      return content;
    }
  }

  // Save large documents in chunks
  private async saveLargeDocument(documentId: string, data: DocumentData): Promise<void> {
    const chunks = this.chunkContent(data.content, this.config.maxChunkSize);
    
    // Save metadata
    const metadata = {
      ...data,
      content: null, // Don't store content in metadata
      chunks: chunks.length,
      totalSize: data.content.length
    };
    
    await this.saveToLocalStorage(documentId, metadata);

    // Save content chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkKey = `${documentId}_chunk_${i}`;
      await this.saveToLocalStorage(chunkKey, {
        content: chunks[i],
        index: i,
        timestamp: Date.now()
      });
    }
  }

  // Load large documents from chunks
  private async loadLargeDocument(documentId: string): Promise<DocumentData | null> {
    try {
      const metadata = this.getDocument(documentId);
      if (!metadata || !metadata.chunks) {
        return metadata;
      }

      // Load all chunks
      const chunks: string[] = [];
      for (let i = 0; i < metadata.chunks; i++) {
        const chunkKey = `${documentId}_chunk_${i}`;
        const chunkData = this.getFromLocalStorage(chunkKey);
        if (chunkData && chunkData.content) {
          chunks[chunkData.index] = chunkData.content;
        }
      }

      // Reconstruct content
      const content = chunks.join('');
      
      return {
        ...metadata,
        content: content
      };
    } catch (error) {
      console.error('Error loading large document:', error);
      return null;
    }
  }

  // Ensure storage space is available
  private async ensureStorageSpace(data: DocumentData): Promise<void> {
    const currentSize = this.getStorageSize();
    const estimatedSize = this.estimateDataSize(data);
    
    if (currentSize + estimatedSize > this.config.maxStorageSize) {
      await this.cleanupOldData();
    }
  }

  // Get current storage size
  private getStorageSize(): number {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalSize += localStorage.getItem(key)?.length || 0;
      }
    }
    return totalSize;
  }

  // Estimate data size
  private estimateDataSize(data: DocumentData): number {
    return JSON.stringify(data).length;
  }

  // Cleanup old data to free space
  private async cleanupOldData(): Promise<void> {
    const documents = this.getAllDocuments();
    const sortedDocs = documents.sort((a, b) => 
      new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );

    // Remove oldest documents until we have enough space
    for (const doc of sortedDocs) {
      if (this.getStorageSize() < this.config.maxStorageSize * 0.8) {
        break;
      }
      this.deleteDocument(doc.id);
    }
  }

  // Create backup of document
  private async createBackup(documentId: string, data: DocumentData): Promise<void> {
    const backupKey = `${documentId}_backup_${Date.now()}`;
    const backupData = {
      ...data,
      backupTimestamp: Date.now(),
      originalId: documentId
    };

    try {
      await this.saveToLocalStorage(backupKey, backupData);
      
      // Keep only last 5 backups
      const backups = this.getBackups(documentId);
      if (backups.length > 5) {
        const oldestBackup = backups[0];
        localStorage.removeItem(oldestBackup.key);
      }
    } catch (error) {
      console.warn('Backup creation failed:', error);
    }
  }

  // Get all backups for a document
  private getBackups(documentId: string): Array<{ key: string; timestamp: number }> {
    const backups: Array<{ key: string; timestamp: number }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${documentId}_backup_`)) {
        const timestamp = parseInt(key.split('_backup_')[1]);
        backups.push({ key, timestamp });
      }
    }

    return backups.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Save to localStorage with error handling
  private async saveToLocalStorage(key: string, data: any): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        await this.cleanupOldData();
        // Retry once after cleanup
        const serialized = JSON.stringify(data);
        localStorage.setItem(key, serialized);
      } else {
        throw error;
      }
    }
  }

  // Get from localStorage
  private getFromLocalStorage(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  // Public methods
  async saveDocument(documentId: string, data: Partial<DocumentData>): Promise<void> {
    return this.debouncedSave(documentId, data);
  }

  getDocument(documentId: string): DocumentData | null {
    const data = this.getFromLocalStorage(documentId);
    if (!data) return null;

    // Handle large documents
    if (data.chunks) {
      return this.loadLargeDocument(documentId);
    }

    // Decompress if needed
    if (data.content && typeof data.content === 'string' && data.content.length > 1000) {
      try {
        data.content = this.decompressContent(data.content);
      } catch (error) {
        console.warn('Decompression failed, using original content');
      }
    }

    return data;
  }

  getAllDocuments(): DocumentData[] {
    const documents: DocumentData[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !key.includes('_chunk_') && !key.includes('_backup_')) {
        const doc = this.getDocument(key);
        if (doc) {
          documents.push(doc);
        }
      }
    }

    return documents.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  deleteDocument(documentId: string): void {
    // Remove main document
    localStorage.removeItem(documentId);

    // Remove chunks
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${documentId}_chunk_`)) {
        localStorage.removeItem(key);
      }
    }

    // Remove backups
    const backups = this.getBackups(documentId);
    backups.forEach(backup => {
      localStorage.removeItem(backup.key);
    });

    // Clear any pending save operations
    if (this.saveQueue.has(documentId)) {
      clearTimeout(this.saveQueue.get(documentId)!);
      this.saveQueue.delete(documentId);
    }
  }

  // Decompress content
  private decompressContent(content: string): string {
    // Simple decompression (reverse of fallback compression)
    return content;
  }

  // Split content into chunks
  private chunkContent(content: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.substring(i, i + chunkSize));
    }
    return chunks;
  }

  // Force save all pending documents
  async flushAll(): Promise<void> {
    const promises = Array.from(this.saveQueue.keys()).map(documentId => {
      const timeoutId = this.saveQueue.get(documentId)!;
      clearTimeout(timeoutId);
      this.saveQueue.delete(documentId);
      return this.saveDocument(documentId, {});
    });

    await Promise.all(promises);
  }

  // Get storage statistics
  getStorageStats(): {
    totalSize: number;
    documentCount: number;
    pendingSaves: number;
    maxSize: number;
  } {
    return {
      totalSize: this.getStorageSize(),
      documentCount: this.getAllDocuments().length,
      pendingSaves: this.saveQueue.size,
      maxSize: this.config.maxStorageSize
    };
  }

  // Cleanup resources
  destroy(): void {
    // Clear all pending saves
    this.saveQueue.forEach(timeoutId => clearTimeout(timeoutId));
    this.saveQueue.clear();

    // Terminate compression worker
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
      this.compressionWorker = null;
    }
  }
}

// Create singleton instance
let storageService: StorageService | null = null;

export const initializeStorage = (config?: Partial<StorageConfig>): StorageService => {
  if (!storageService) {
    storageService = new StorageService(config);
  }
  return storageService;
};

export const getStorageService = (): StorageService => {
  if (!storageService) {
    throw new Error('Storage service not initialized. Call initializeStorage first.');
  }
  return storageService;
};

export type { DocumentData, StorageConfig };
export default StorageService; 