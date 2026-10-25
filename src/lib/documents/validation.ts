export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'] as const;
export const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export interface DocumentValidationResult {
  valid: boolean;
  error?: string;
  cleanName?: string;
  detectedMime?: string;
}

/**
 * Validates document name.
 * Rule: Non-empty, max 255 characters.
 */
export function validateDocumentName(name: unknown): { valid: boolean; error?: string; cleanName?: string } {
  if (typeof name !== 'string') {
    return { valid: false, error: 'Document name must be text.' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Please enter a document name (e.g., Passport, Aadhaar Card).' };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: 'Document name cannot exceed 255 characters.' };
  }

  return { valid: true, cleanName: trimmed };
}

/**
 * Inspects binary magic bytes to detect file signature.
 */
export function detectMagicBytes(buffer: Uint8Array): string | null {
  if (buffer.length < 4) return null;

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // PNG: \x89PNG (0x89 0x50 0x4E 0x47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // JPEG: \xFF\xD8\xFF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  return null;
}

/**
 * Validates file buffer, declared MIME type, and original filename.
 */
export function validateUploadedFile(
  filename: string,
  declaredMimeType: string,
  sizeBytes: number,
  bufferHeader: Uint8Array
): DocumentValidationResult {
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Filename is missing or invalid.' };
  }

  // Check file extension
  const lowerName = filename.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: 'Unsupported file type. Only PDF, JPG, and PNG documents are supported.',
    };
  }

  // Check file size
  if (sizeBytes <= 0) {
    return { valid: false, error: 'The uploaded file is empty (0 bytes).' };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds maximum allowed size of 25 MB (${(sizeBytes / (1024 * 1024)).toFixed(1)} MB uploaded).`,
    };
  }

  // Inspect file signature (magic bytes)
  const detectedMime = detectMagicBytes(bufferHeader);
  if (!detectedMime) {
    return {
      valid: false,
      error: 'File contents do not match allowed formats. Please upload a genuine PDF or image.',
    };
  }

  return {
    valid: true,
    detectedMime,
  };
}
