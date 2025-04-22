export interface ImageMetadata {
  title?: string;
  description?: string;
  author?: string;
  copyright?: string;
  keywords?: string[];
  customFields?: Record<string, string>;
}

export interface CompressionSettings {
  quality: number; // 60-100
  targetFormat: 'jpeg' | 'png' | 'webp' | 'avif' | 'original';
  stripMetadata?: boolean;
  preserveMetadata?: boolean;
  resize?: {
    maxWidth?: number;
    maxHeight?: number;
  };
}

export interface ImageFile {
  id: string; // Identifier for the temporary file (e.g., storage key/blob URL path)
  originalName: string;
  originalSize: number;
  originalFormat: string;
  compressedSize?: number;
  compressionRatio?: number;
  status: 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed';
  metadata: ImageMetadata; // Editable metadata
  originalMetadata?: Record<string, any>; // Raw metadata read from original file
  processingSettings?: CompressionSettings; // Settings used for this file
  downloadUrl?: string; // URL to the final processed file in temporary storage
  errorMessage?: string; // Error message if processing failed
  processingTimeMs?: number; // Time taken for compression
  blobUrl?: string; // URL of the originally uploaded blob
}

export interface ErrorResponse {
  error: string;
  details?: Error | string; // Use Error or string for details
}
