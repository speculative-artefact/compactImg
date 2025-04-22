# compactImg Image Compressor - Product Requirements Document

## Overview

Image Compressor is a Next.js-based web application that allows users to compress images in multiple formats (AVIF, WebP, PNG, JPEG) while preserving quality. The application will provide size reduction metrics and allow users to edit image metadata before downloading the compressed files.

## Target Users

- Web developers looking to optimise images for websites
- Content creators who need to reduce file sizes for online sharing
- Photographers managing large image libraries
- Digital marketers preparing visual content

## Core Features

### 1. Image Upload

- **Drag and drop** interface for uploading images
- **Multiple file upload** support
- **File size limit**: 10MB per image (configurable)
- **Supported formats**: JPEG, PNG, WebP, AVIF
- **Upload progress** indicator

### 2. Image Processing

- **Serverless compression** using Sharp.js
- **Format conversion** options (e.g., PNG to WebP)
- **Quality settings** (slider from 60-100%)
- **Processing queue** for multiple images (Consider using a dedicated queue like Redis/BullMQ or SQS for robustness beyond simple sequential processing in API routes, especially for Phase 2/3)
- **Progress tracking** during compression (Real-time updates via WebSockets or Server-Sent Events recommended)

### 3. Metadata Editing

- **Input fields** for common metadata attributes:
  - Title
  - Description/Caption
  - Author/Creator
  - Copyright information
  - Keywords/Tags
  - Location data (optional)
- **Batch metadata** application option
- **Metadata preview** before saving
- **Specify supported standards**: Clarify which metadata standards (e.g., EXIF, IPTC, XMP) will be read and written. Note potential limitations with cross-format preservation.

### 4. Results Display

- **Before/after file size** comparison
- **Size reduction percentage**
- **Compression metrics** summary
- **Thumbnail preview** of processed images
- **Processing time** indicator

### 5. Download Options

- **Individual download** buttons for each image
- **Batch download** as ZIP archive
- **Download format options** (original or converted)
- **Auto-download** toggle option

## User Flow

1. **Landing Page**
   
   - User arrives at the application
   - Sees upload area and feature highlights

2. **Upload Process**
   
   - User drags images or clicks to select files
   - System validates files (format, size)
   - Upload progress is displayed

3. **Processing Queue**
   
   - Uploaded images appear in processing queue
   - User can add/remove images from queue
   - User selects compression settings

4. **Metadata Editing**
   
   - User inputs/edits metadata fields
   - System validates input
   - User applies metadata to selected images

5. **Processing**
   
   - User initiates compression
   - System processes images through serverless functions
   - Progress is displayed for each image

6. **Results Review**
   
   - Compression results are displayed
   - File size comparison is shown
   - Metadata confirmation is provided

7. **Download**
   
   - User reviews and downloads individual images
   - Or selects batch download option

## Technical Requirements

### Frontend

- **Framework**: Next.js with React
- **Styling**: Tailwind CSS
- **State Management**: React Context API or Zustand/Jotai (lighter alternatives to Redux Toolkit if complex global state is not anticipated)
- **File Handling**: Browser File API with drag-and-drop library
- **UI Components**:
  - Upload zone
  - Processing queue
  - Metadata form
  - Results display
  - Download options

### Backend (Serverless)

- **API Routes**: Next.js API routes
- **Image Processing**: Sharp.js
- **Storage**: Temporary cloud storage (**Required**, e.g., Vercel Blob, AWS S3, Cloudflare R2) for uploads and processed files.
- **Security**: File type validation, size restrictions, input sanitisation (especially for metadata).
- **Rate Limiting**: To prevent abuse.
- **Queue System (Optional but Recommended for Scale/Robustness)**: Implement a queue (e.g., using Vercel KV + BullMQ, or cloud-native like SQS) to manage processing jobs asynchronously. **Note:** Robust queue systems typically require a persistent store (like Redis/Vercel KV), adding complexity compared to synchronous processing. Synchronous processing within API routes is feasible for MVP but has timeout limitations.

### Performance Considerations

- **Lazy Loading**: For UI components
- **Pagination/Virtualisation**: For large batches of images in the UI
- **Asynchronous Processing**: Use a queue system or background jobs for compression tasks.
- **CDN**: Utilise a CDN for frontend assets and potentially for serving downloadable processed images.
- **Timeout Handling**: For serverless functions and potential long-running processes.

## API Structure

### Image Upload Endpoint

```
POST /api/upload
```

- Accepts multipart form data
- Uploads to temporary cloud storage
- Returns temporary file identifiers/URLs and original metadata

### Image Processing Endpoint

```
POST /api/process
```

- Accepts file identifiers and compression settings (quality, format, resize options, metadata handling)
- **Option A (Synchronous - Simpler, No DB needed for queue):** Processes images directly within the API route. Relies on sufficient function timeouts. Returns processing status and result information (download URL, metrics). Suitable for MVP on Vercel, using Vercel Blob for storage.
- **Option B (Asynchronous - Robust, Requires Queue Store):** Adds job to a queue (backed by e.g., Vercel KV/Redis). Returns a job ID. Client polls a status endpoint or receives updates via WebSocket/SSE. Better for scalability and long tasks.

### Metadata Update Endpoint (Consider merging with processing)

```
POST /api/metadata
```
- Accepts file identifiers and metadata fields
- Updates metadata *before* final compression or applies to already compressed file if separate.
- Returns success status. (Alternatively, include metadata updates within the `/api/process` payload).

### Job Status Endpoint (If using Async Processing)

```
GET /api/status/:jobId
```
- Returns the current status of a processing job (pending, processing, completed, failed) and results upon completion.

### Download Endpoint

```
GET /api/download/:fileId
```
- Retrieves the processed image from temporary storage.
- Streams compressed image file with appropriate headers.
- Supports single file or generates and streams a ZIP archive for batch downloads.

## Data Models

### ImageFile

```typescript
interface ImageFile {
  id: string; // Identifier for the temporary file (e.g., storage key)
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
}
```

### ImageMetadata

```typescript
interface ImageMetadata {
  title?: string;
  description?: string; // e.g., IPTC Caption/Abstract, EXIF ImageDescription
  author?: string; // e.g., IPTC Creator, EXIF Artist
  copyright?: string; // e.g., IPTC CopyrightNotice, EXIF Copyright
  keywords?: string[]; // e.g., IPTC Keywords
  // Consider adding specific EXIF/IPTC fields if needed
  // latitude?: number; // Requires careful handling (privacy)
  // longitude?: number; // Requires careful handling (privacy)
  // creationDate?: string; // e.g., EXIF DateTimeOriginal
  customFields?: Record<string, string>; // Using British spelling 'Record' is standard in TS
}
```

### CompressionSettings

```typescript
interface CompressionSettings {
  quality: number; // 60-100
  targetFormat: 'jpeg' | 'png' | 'webp' | 'avif' | 'original';
  stripMetadata?: boolean; // Option to remove all metadata
  preserveMetadata?: boolean; // Best-effort preservation (ignored if stripMetadata is true)
  resize?: {
    maxWidth?: number;
    maxHeight?: number;
    // Add fit options if needed (e.g., cover, contain)
  };
}
```

## Non-Functional Requirements

### Performance

- Page load time < 2 seconds
- Image upload feedback < 500ms
- Compression processing < 5 seconds per MB (average)
- Support for simultaneous processing of 5+ images

### Accessibility

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode

### Security

- Input validation for all fields (settings, metadata)
- File type verification (server-side, based on magic bytes, not just extension)
- Protection against malicious uploads (e.g., archive bombs if ZIP upload were added)
- Sanitise metadata inputs to prevent XSS.
- No persistent storage of user images beyond configured temporary TTL (e.g., 1 hour).
- Secure handling of temporary storage credentials/access.

### Browser Compatibility

- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

## Implementation Phases

### Phase 1: MVP

- Basic upload interface
- JPEG and PNG compression
- Simple metadata editing (title, description)
- Individual file downloads
- Before/after size comparison

### Phase 2: Enhanced Features

- Additional file formats (WebP, AVIF)
- Complete metadata editing suite
- Batch processing improvements
- ZIP download option
- UI/UX refinements

### Phase 3: Optimisation & Scale

- Performance optimisations
- Advanced compression options
- API rate limiting and security enhancements
- Usage analytics
- Mobile responsive improvements

## Testing Requirements

- Unit tests for compression functions
- Integration tests for API endpoints
- UI component tests
- Cross-browser compatibility testing
- Performance testing for large files
- Security testing for file uploads

## Metrics for Success

- Average compression ratio > 50%
- Upload success rate > 99%
- Processing completion rate > 98%
- User session time < 5 minutes (efficiency)
- Return user rate > 20%

## Limitations

- Maximum file size: 10MB per image (configurable)
- Maximum batch size: 20 images (configurable, depends on infra)
- Temporary storage period: e.g., 1 hour (configurable TTL)
- No account system in initial release
- No cloud storage integration (beyond temporary processing storage) in initial release
- Metadata preservation limitations, especially between formats.

---

This PRD provides a comprehensive framework for implementing the Image Compressor application with Next.js as the primary technology stack. The serverless architecture will allow for scalable image processing without dedicated server infrastructure, while the metadata editing feature provides a valuable differentiator from similar compression tools.
