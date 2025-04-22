import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import type { ImageFile, CompressionSettings, ImageMetadata } from '@/app/types';

// Define MVP supported formats for processing
const MVP_PROCESS_FORMATS = ['jpeg', 'png'];

async function fetchBlob(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob: ${response.statusText}`);
  }
  return response.arrayBuffer();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { imageFile, settings }: { imageFile: ImageFile; settings: CompressionSettings & { metadata: ImageMetadata } } = await request.json();

  if (!imageFile || !settings || !imageFile.blobUrl) {
    return NextResponse.json({ error: 'Missing image file data, settings, or blob URL.' }, { status: 400 });
  }

  const startTime = Date.now();
  const updatedImageFile: Partial<ImageFile> = { status: 'processing' };

  try {
    // 1. Fetch the original image from Vercel Blob
    const imageBuffer = await fetchBlob(imageFile.blobUrl);
    updatedImageFile.status = 'processing';

    // 2. Initialize Sharp and apply settings
    let sharpInstance = sharp(Buffer.from(imageBuffer));

    // Get original metadata (optional, but good for reference)
    // const originalMetadata = await sharpInstance.metadata();
    // updatedImageFile.originalMetadata = originalMetadata; // Store if needed

    // --- MVP Specific Logic: JPEG/PNG --- 
    const targetFormat = settings.targetFormat === 'original' 
      ? (imageFile.originalFormat.split('/')[1] as 'jpeg' | 'png') // Derive from original MIME
      : settings.targetFormat;

    if (!MVP_PROCESS_FORMATS.includes(targetFormat)) {
      throw new Error(`Unsupported target format for MVP: ${targetFormat}. Only jpeg and png are supported initially.`);
    }

    // Apply compression settings based on target format
    if (targetFormat === 'jpeg') {
      sharpInstance = sharpInstance.jpeg({ quality: settings.quality });
    } else if (targetFormat === 'png') {
      // Sharp's PNG quality is compression level (0-9), map from 60-100 quality
      const pngCompressionLevel = Math.max(0, Math.min(9, Math.round((100 - settings.quality) / 10)));
      sharpInstance = sharpInstance.png({ compressionLevel: pngCompressionLevel });
    }

    // Apply metadata (MVP: title, description)
    // Sharp primarily works with EXIF/IPTC. We'll add basic title/description.
    const metadataToEmbed: sharp.WriteableMetadata = {};
    if (settings.metadata.title) {
      // Using ImageDescription (common EXIF tag) for title
      metadataToEmbed.exif = { ...metadataToEmbed.exif, IFD0: { ...metadataToEmbed.exif?.IFD0, ImageDescription: settings.metadata.title } };
    }
    if (settings.metadata.description) {
       // Using UserComment (EXIF) or potentially IPTC Caption/Abstract (more complex mapping)
       // Sticking to a common EXIF tag for simplicity in MVP
       metadataToEmbed.exif = { ...metadataToEmbed.exif, IFD0: { ...metadataToEmbed.exif?.IFD0, UserComment: settings.metadata.description } };
       // Example for IPTC (requires knowing the correct codes):
       // metadataToEmbed.iptc = { ...metadataToEmbed.iptc, '2:120': settings.metadata.description }; // IPTC Caption-Abstract
    }

    // Embed metadata if any was provided
    if (Object.keys(metadataToEmbed).length > 0) {
      // Use withMetadata({ orientation: originalMetadata?.orientation }) to preserve orientation if needed
      // Fetching originalMetadata first would be required for that.
      sharpInstance = sharpInstance.withMetadata(metadataToEmbed);
    }

    // Update the ImageFile metadata object as well (for display consistency)
    updatedImageFile.metadata = {
      ...imageFile.metadata, // Keep existing non-MVP fields if any
      title: settings.metadata.title,
      description: settings.metadata.description
    };

    // 3. Process the image
    const processedBuffer = await sharpInstance.toBuffer();

    // 4. Upload the processed image to Vercel Blob
    const processedFileName = `processed/${imageFile.id}.${targetFormat}`;
    const processedBlob = await put(processedFileName, processedBuffer, {
      access: 'public',
      contentType: `image/${targetFormat}`,
      cacheControlMaxAge: 3600, // Use cacheControlMaxAge instead of cacheControl
    });

    // 5. Update ImageFile data
    const endTime = Date.now();
    updatedImageFile.status = 'completed';
    updatedImageFile.compressedSize = processedBuffer.byteLength;
    updatedImageFile.compressionRatio = imageFile.originalSize > 0 
      ? (1 - (processedBuffer.byteLength / imageFile.originalSize)) * 100 
      : 0;
    updatedImageFile.downloadUrl = processedBlob.url; // URL of the *processed* file
    updatedImageFile.processingTimeMs = endTime - startTime;
    updatedImageFile.processingSettings = settings; // Store the settings used

    // Optional: Delete the original uploaded blob if no longer needed
    // await del(imageFile.blobUrl);
    // updatedImageFile.blobUrl = undefined; // Clear original blob URL if deleted

    // Return the updated ImageFile data (merge with original)
    const finalImageFile = { ...imageFile, ...updatedImageFile };
    return NextResponse.json(finalImageFile);

  } catch (error) {
    console.error(`Processing failed for ${imageFile.originalName}:`, error);
    const endTime = Date.now();
    updatedImageFile.status = 'failed';
    updatedImageFile.errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    updatedImageFile.processingTimeMs = endTime - startTime;

    // Return the updated ImageFile data with error status
    const finalImageFile = { ...imageFile, ...updatedImageFile };
    return NextResponse.json(finalImageFile, { status: 500 });
  }
}
