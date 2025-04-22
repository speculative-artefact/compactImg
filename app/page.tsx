'use client';

import React, { useState, useCallback } from 'react';
import UploadZone from '@/app/components/UploadZone';
import ImageCard from '@/app/components/ImageCard';
import type { ImageFile, ImageMetadata, CompressionSettings } from '@/app/types';

export default function Home() {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingAny, setIsProcessingAny] = useState<boolean>(false); // Track if *any* image is processing

  const handleFilesUploaded = useCallback((uploadedFiles: ImageFile[]) => {
    // Append new files, avoiding duplicates based on blobUrl (or ID if available)
    setFiles(prevFiles => {
      const existingIds = new Set(prevFiles.map(f => f.blobUrl));
      const newFiles = uploadedFiles.filter(f => !existingIds.has(f.blobUrl));
      return [...prevFiles, ...newFiles];
    });
    setErrorMessage(null); // Clear error on successful upload
  }, []);

  const updateFileState = (id: string, updates: Partial<ImageFile>) => {
    setFiles(prevFiles =>
      prevFiles.map(file => (file.id === id ? { ...file, ...updates } : file))
    );
  };

  const handleProcessImage = useCallback(async (id: string, settings: CompressionSettings & { metadata: ImageMetadata }) => {
    const imageFile = files.find(f => f.id === id);
    if (!imageFile) return;

    setIsProcessingAny(true);
    updateFileState(id, { status: 'processing', errorMessage: undefined }); // Set status to processing

    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageFile, settings }),
      });

      const result: ImageFile = await response.json();

      if (!response.ok) {
        throw new Error(result.errorMessage || 'Processing failed');
      }

      updateFileState(id, result); // Update with completed/failed status and results

    } catch (error) {
      console.error('Processing error:', error);
      updateFileState(id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'An unknown error occurred during processing.',
      });
    } finally {
      // Check if any *other* files are still processing before setting global flag to false
      setFiles(currentFiles => {
        const stillProcessing = currentFiles.some(f => f.id !== id && f.status === 'processing');
        setIsProcessingAny(stillProcessing);
        return currentFiles; // No state change needed here, just checking
      });
    }
  }, [files]);

  return (
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">compactImg Image Compressor</h1>

      <div className="mb-8">
        <UploadZone onFilesUploaded={handleFilesUploaded} setErrorMessage={setErrorMessage} />
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <p><strong>Error:</strong> {errorMessage}</p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Uploaded Images</h2>
          <div className="space-y-4">
            {files.map(file => (
              <ImageCard
                key={file.id} // Use the unique ID from the upload response
                file={file}
                onProcessImage={handleProcessImage}   // Connect handler
                isProcessing={isProcessingAny} // Disable inputs globally if any image is processing
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
