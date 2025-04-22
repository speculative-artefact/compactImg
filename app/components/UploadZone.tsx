'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { ImageFile } from '@/app/types'; // Assuming types.ts is in app/

interface UploadZoneProps {
  onFilesUploaded: (files: ImageFile[]) => void;
  setErrorMessage: (message: string | null) => void;
}

export default function UploadZone({ onFilesUploaded, setErrorMessage }: UploadZoneProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setErrorMessage(null); // Clear previous errors
    const formData = new FormData();
    let hasValidFiles = false;

    acceptedFiles.forEach((file) => {
      // Basic client-side validation (can be enhanced)
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
        setErrorMessage(`Unsupported file type: ${file.name} (${file.type})`);
        return; // Skip unsupported files
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit from PRD
        setErrorMessage(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        return; // Skip large files
      }
      formData.append('files', file);
      hasValidFiles = true;
    });

    if (!hasValidFiles && acceptedFiles.length > 0) {
      // Only show error if some files were dropped but none were valid
      setErrorMessage("No valid files selected or files exceed limits.");
      return;
    }
    if (!hasValidFiles && acceptedFiles.length === 0) {
      // No files dropped
      return;
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadedFiles: ImageFile[] = await response.json();
      onFilesUploaded(uploadedFiles);
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred during upload.');
    }
  }, [onFilesUploaded, setErrorMessage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/avif': ['.avif'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
    >
      <input {...getInputProps()} />
      {
        isDragActive ?
          <p className="text-blue-600">Drop the images here ...</p> :
          <p className="text-gray-500">Drag 'n' drop some images here, or click to select files</p>
      }
      <p className="text-sm text-gray-400 mt-2">Supported: JPG, PNG, WebP, AVIF (Max 10MB each)</p>
    </div>
  );
}
