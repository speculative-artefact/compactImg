'use client';

import React, { useState, useEffect } from 'react';
import type { ImageFile, ImageMetadata, CompressionSettings } from '@/app/types';

interface ImageCardProps {
  file: ImageFile;
  onProcessImage: (id: string, settings: CompressionSettings & { metadata: ImageMetadata }) => void;
  isProcessing: boolean;
}

// Helper to format bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function ImageCard({ file, onProcessImage, isProcessing }: ImageCardProps) {
  const [title, setTitle] = useState(file.metadata.title || '');
  const [description, setDescription] = useState(file.metadata.description || '');
  const [quality, setQuality] = useState<number>(80); // Default quality

  // Update local state if file metadata changes externally (e.g., after processing)
  useEffect(() => {
    setTitle(file.metadata.title || '');
    setDescription(file.metadata.description || '');
  }, [file.metadata]);

  const handleProcessClick = () => {
    // For MVP, we only support JPEG/PNG. We'll use 'original' if it's one of those,
    // otherwise default to jpeg. A format selector would be needed for Phase 2.
    let targetFormat: 'jpeg' | 'png' | 'original' = 'jpeg';
    if (file.originalFormat === 'image/jpeg' || file.originalFormat === 'image/png') {
      targetFormat = 'original';
    }

    const settings: CompressionSettings & { metadata: ImageMetadata } = {
      quality: quality,
      targetFormat: targetFormat, // Keep original format for MVP if supported
      metadata: { title, description }, // Pass current metadata state
      // stripMetadata/preserveMetadata/resize are Phase 2+
    };
    onProcessImage(file.id, settings);
  };

  const getStatusColor = () => {
    switch (file.status) {
      case 'uploaded': return 'text-blue-500';
      case 'queued': return 'text-gray-500';
      case 'processing': return 'text-yellow-500 animate-pulse';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="border rounded-lg p-4 mb-4 shadow-sm bg-white">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Thumbnail/Preview */} 
        <div className="flex-shrink-0 w-full md:w-32 h-32 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
          {file.blobUrl ? (
            <img src={file.blobUrl} alt={file.originalName} className="object-contain max-h-full max-w-full" />
          ) : (
            <span className="text-gray-400 text-sm">No preview</span>
          )}
        </div>

        {/* File Info & Metadata Inputs */} 
        <div className="flex-grow">
          <h3 className="font-semibold text-lg truncate" title={file.originalName}>{file.originalName}</h3>
          <p className="text-sm text-gray-500">
            Original Size: {formatBytes(file.originalSize)} ({file.originalFormat})
          </p>
          <p className={`text-sm font-medium ${getStatusColor()}`}>Status: {file.status}</p>
          {file.errorMessage && <p className="text-xs text-red-600 mt-1">Error: {file.errorMessage}</p>}

          {/* MVP Metadata Inputs */}
          {(file.status === 'uploaded' || file.status === 'failed') && (
            <div className="mt-3 space-y-2">
              <div>
                <label htmlFor={`title-${file.id}`} className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  id={`title-${file.id}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={isProcessing} // Simplified condition
                />
              </div>
              <div>
                <label htmlFor={`description-${file.id}`} className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  id={`description-${file.id}`}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={isProcessing} // Simplified condition
                />
              </div>
            </div>
          )}
        </div>

        {/* Processing Controls & Results */} 
        <div className="flex-shrink-0 md:w-48 mt-4 md:mt-0 flex flex-col justify-between">
          {(file.status === 'uploaded' || file.status === 'failed') && (
            <div className="space-y-3">
              <div>
                <label htmlFor={`quality-${file.id}`} className="block text-sm font-medium text-gray-700">Quality ({quality})</label>
                <input
                  type="range"
                  id={`quality-${file.id}`}
                  min="60"
                  max="100"
                  step="1"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                  disabled={isProcessing} // Also simplify here for consistency
                />
              </div>
              <button
                onClick={handleProcessClick}
                disabled={isProcessing} // Also simplify here for consistency
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {file.status === 'failed' ? 'Retry Process' : 'Process Image'}
              </button>
            </div>
          )}

          {file.status === 'processing' && (
            <div className="text-center text-yellow-600">
              Processing...
            </div>
          )}

          {file.status === 'completed' && file.downloadUrl && (
            <div className="space-y-2 text-sm">
              <p>Compressed Size: <span className="font-medium">{formatBytes(file.compressedSize ?? 0)}</span></p>
              <p>Reduction: <span className="font-medium">{file.compressionRatio?.toFixed(1) ?? 'N/A'}%</span></p>
              <p>Time: <span className="font-medium">{(file.processingTimeMs ?? 0) / 1000}s</span></p>
              <a
                href={file.downloadUrl}
                download={file.originalName.replace(/(\.[^.]+)$/, `-compressed$1`)} // Suggest a new filename
                target="_blank" // Open blob URL directly for download
                rel="noopener noreferrer"
                className="block w-full mt-2 px-4 py-2 bg-green-600 text-white text-center rounded-md hover:bg-green-700 transition-colors"
              >
                Download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}