import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { ImageFile } from '@/app/types';
import { nanoid } from 'nanoid';

// Define max file size (10MB)
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Define allowed mime types for MVP (JPEG, PNG) + others from PRD for future phases
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
// MVP specific types for initial processing logic
const MVP_MIME_TYPES = ['image/jpeg', 'image/png'];


export async function POST(request: NextRequest): Promise<NextResponse> {
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return NextResponse.json({ error: 'No files provided.' }, { status: 400 });
  }

  const uploadedFilesInfo: ImageFile[] = [];
  const errors: string[] = [];

  for (const file of files) {
    // Server-side validation
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      errors.push(`Unsupported file type: ${file.name} (${file.type})`);
      continue; // Skip this file
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      continue; // Skip this file
    }

    // Generate a unique path for the blob
    const uniqueId = nanoid();
    // Extract extension more reliably
    const fileExtension = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
    const blobPath = `uploads/${uniqueId}.${fileExtension}`;

    try {
      const blob = await put(blobPath, file, {
        access: 'public',
        contentType: file.type,
        // Add cache control headers for temporary nature
        cacheControl: 'public, max-age=3600', // Cache for 1 hour (adjust TTL as needed)
      });

      // Prepare the ImageFile object based on PRD
      const imageFileInfo: ImageFile = {
        id: blob.pathname, // Use the pathname from the blob result as the ID
        originalName: file.name,
        originalSize: file.size,
        originalFormat: file.type, // Store MIME type
        status: 'uploaded',
        metadata: {}, // Initialize empty metadata
        blobUrl: blob.url, // Store the public URL from Vercel Blob
        // Other fields like compressedSize, downloadUrl etc. will be populated after processing
      };
      uploadedFilesInfo.push(imageFileInfo);

    } catch (error) {
      console.error(`Failed to upload ${file.name}:`, error);
      errors.push(`Failed to upload ${file.name}.`);
    }
  }

  if (uploadedFilesInfo.length === 0 && errors.length > 0) {
    // If all files failed validation or upload
    return NextResponse.json({ error: `Upload failed. Errors: ${errors.join(', ')}` }, { status: 400 });
  }

  // Return successfully uploaded file info (even if some failed)
  // Optionally include errors for files that failed
  if (errors.length > 0) {
     console.warn("Some files failed to upload:", errors);
     // Decide if you want to return partial success with errors or just the successes
     // Returning successes and errors:
     return NextResponse.json({ uploadedFiles: uploadedFilesInfo, uploadErrors: errors }, { status: 207 }); // Multi-Status
  }

  return NextResponse.json(uploadedFilesInfo);
}

// Optional: Add config for API route if needed (e.g., increase body size limit slightly if handling large uploads, though validation should catch it)
// export const config = {
//   api: {
//     bodyParser: {
//       sizeLimit: '11mb', // Slightly larger than max file size to accommodate overhead
//     },
//   },
// };
