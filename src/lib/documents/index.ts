import { query } from '@/lib/db';
import type { DocumentRecord } from '@/lib/db';
import { uploadFileToStorage, deleteFileFromStorage } from '@/lib/storage/supabase';
import { validateDocumentName, validateUploadedFile } from './validation';
import { isValidUuid } from '@/lib/security/sanitize';
import crypto from 'crypto';

export interface DocumentOpResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  isDbUnavailable?: boolean;
  isStorageUnavailable?: boolean;
}

/**
 * Retrieves all documents for a given family member.
 */
export async function getDocumentsByMemberId(memberId: string): Promise<DocumentOpResult<DocumentRecord[]>> {
  if (!isValidUuid(memberId)) {
    return { success: false, error: 'Invalid family member ID.' };
  }

  try {
    const rows = await query<DocumentRecord>(`
      SELECT 
        id, 
        family_member_id, 
        name, 
        file_storage_key, 
        original_filename, 
        mime_type, 
        file_size_bytes, 
        created_at
      FROM documents
      WHERE family_member_id = $1
      ORDER BY created_at DESC;
    `, [memberId]);

    return { success: true, data: rows };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    const isConnError = message.includes('DATABASE_URL') || message.includes('connect');
    return {
      success: false,
      error: isConnError ? 'Database connection is not configured or unavailable.' : 'Failed to retrieve documents.',
      isDbUnavailable: isConnError,
    };
  }
}

/**
 * Retrieves a single document by its ID.
 */
export async function getDocumentById(documentId: string): Promise<DocumentOpResult<DocumentRecord>> {
  if (!isValidUuid(documentId)) {
    return { success: false, error: 'Invalid document ID.' };
  }

  try {
    const rows = await query<DocumentRecord>(`
      SELECT 
        id, 
        family_member_id, 
        name, 
        file_storage_key, 
        original_filename, 
        mime_type, 
        file_size_bytes, 
        created_at
      FROM documents
      WHERE id = $1;
    `, [documentId]);

    if (rows.length === 0) {
      return { success: false, error: 'Document not found.' };
    }

    return { success: true, data: rows[0] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    const isConnError = message.includes('DATABASE_URL') || message.includes('connect');
    return {
      success: false,
      error: isConnError ? 'Database connection is not configured.' : 'Failed to retrieve document record.',
      isDbUnavailable: isConnError,
    };
  }
}

/**
 * Uploads a document:
 * 1. Validates inputs & checks member existence.
 * 2. Uploads file to private Supabase Storage bucket.
 * 3. Inserts metadata into PostgreSQL.
 * 4. Compensating cleanup: deletes file from Supabase Storage if database insert fails.
 */
export async function uploadDocument(
  memberId: string,
  rawName: string,
  file: File
): Promise<DocumentOpResult<DocumentRecord>> {
  if (!isValidUuid(memberId)) {
    return { success: false, error: 'Invalid family member ID.' };
  }

  // 1. Validate document name
  const nameValidation = validateDocumentName(rawName);
  if (!nameValidation.valid || !nameValidation.cleanName) {
    return { success: false, error: nameValidation.error };
  }

  // 2. Verify family member exists in database
  try {
    const memberCheck = await query<{ id: string }>(`
      SELECT id FROM family_members WHERE id = $1;
    `, [memberId]);

    if (memberCheck.length === 0) {
      return { success: false, error: 'Target family member does not exist.' };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    const isConnError = message.includes('DATABASE_URL') || message.includes('connect');
    return {
      success: false,
      error: isConnError ? 'Database connection is not configured or unavailable.' : 'Database error verifying family member.',
      isDbUnavailable: isConnError,
    };
  }

  // 3. Process and validate file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 16));

  const fileValidation = validateUploadedFile(
    file.name,
    file.type,
    file.size,
    headerBytes
  );

  if (!fileValidation.valid || !fileValidation.detectedMime) {
    return { success: false, error: fileValidation.error };
  }

  // 4. Generate unique, non-guessable storage key
  const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  const uniqueKey = `documents/${memberId}/${crypto.randomUUID()}${ext}`;

  // 5. Upload to Supabase Storage
  const storageUpload = await uploadFileToStorage(uniqueKey, buffer, fileValidation.detectedMime);
  if (!storageUpload.success) {
    return {
      success: false,
      error: storageUpload.error || 'Failed to upload file to cloud storage.',
      isStorageUnavailable: storageUpload.isConfigMissing,
    };
  }

  // 6. Insert metadata into PostgreSQL
  try {
    const insertResult = await query<DocumentRecord>(`
      INSERT INTO documents (
        family_member_id,
        name,
        file_storage_key,
        original_filename,
        mime_type,
        file_size_bytes
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [
      memberId,
      nameValidation.cleanName,
      uniqueKey,
      file.name,
      fileValidation.detectedMime,
      file.size,
    ]);

    return { success: true, data: insertResult[0] };
  } catch (dbErr: unknown) {
    console.error('Database insert failed after storage upload. Initiating compensating cleanup...', dbErr);

    // Compensating Cleanup: purge the uploaded storage object to prevent orphaned storage
    const cleanup = await deleteFileFromStorage(uniqueKey);
    if (!cleanup.success) {
      console.error(`CRITICAL: Compensating cleanup failed for orphaned storage key: ${uniqueKey}`);
      return {
        success: false,
        error: 'Database save failed and cloud storage cleanup failed. Please contact the administrator.',
      };
    }

    return {
      success: false,
      error: 'Could not save document record to database. Cloud upload was rolled back.',
    };
  }
}

/**
 * Deletes a document safely:
 * 1. Verifies document exists.
 * 2. Deletes file from Supabase Storage.
 * 3. Deletes record from PostgreSQL.
 */
export async function deleteDocument(documentId: string): Promise<DocumentOpResult> {
  if (!isValidUuid(documentId)) {
    return { success: false, error: 'Invalid document ID.' };
  }

  // 1. Fetch document record to obtain storage key
  const docResult = await getDocumentById(documentId);
  if (!docResult.success || !docResult.data) {
    return { success: false, error: docResult.error || 'Document not found.' };
  }

  const { file_storage_key } = docResult.data;

  // 2. Remove file from Supabase Storage
  const storageDelete = await deleteFileFromStorage(file_storage_key);
  if (!storageDelete.success) {
    return {
      success: false,
      error: 'Failed to delete file from cloud storage. Database record was preserved.',
      isStorageUnavailable: storageDelete.isConfigMissing,
    };
  }

  // 3. Remove metadata record from PostgreSQL
  try {
    const dbDelete = await query<{ id: string }>(`
      DELETE FROM documents WHERE id = $1 RETURNING id;
    `, [documentId]);

    if (dbDelete.length === 0) {
      return {
        success: false,
        error: 'File was removed from storage, but database record removal could not be confirmed.',
      };
    }

    return { success: true };
  } catch (dbErr: unknown) {
    console.error('Database delete failed after storage delete:', dbErr);
    return {
      success: false,
      error: 'File was deleted from storage, but database record removal failed.',
    };
  }
}
