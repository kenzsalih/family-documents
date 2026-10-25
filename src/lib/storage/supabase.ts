import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

export interface StorageResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  isConfigMissing?: boolean;
}

export interface FileDownloadStream {
  stream: ReadableStream | Readable;
  contentType: string;
  contentLength?: number;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'family documents';

export function isStorageConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseSecretKey && bucketName);
}

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!isStorageConfigured()) {
    throw new Error('Supabase Storage is not configured. Please set SUPABASE_URL, SUPABASE_SECRET_KEY, and SUPABASE_BUCKET_NAME.');
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl!, supabaseSecretKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

/**
 * Uploads a file buffer directly to the private Supabase Storage bucket.
 */
export async function uploadFileToStorage(
  key: string,
  body: Uint8Array | Buffer,
  contentType: string
): Promise<StorageResult> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      error: 'Supabase Storage credentials are not configured.',
      isConfigMissing: true,
    };
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client.storage
      .from(bucketName)
      .upload(key, body, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload failed:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to upload document to cloud storage.',
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown storage upload error';
    console.error('Supabase upload exception:', message);
    return {
      success: false,
      error: 'Failed to upload document to cloud storage.',
    };
  }
}

/**
 * Retrieves a document stream from Supabase Storage for inline preview or download.
 */
export async function getFileFromStorage(key: string): Promise<StorageResult<FileDownloadStream>> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      error: 'Supabase Storage credentials are not configured.',
      isConfigMissing: true,
    };
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client.storage.from(bucketName).download(key);

    if (error || !data) {
      console.error('Supabase download failed:', error?.message);
      return {
        success: false,
        error: error?.message || 'Document could not be retrieved from cloud storage.',
      };
    }

    return {
      success: true,
      data: {
        stream: data.stream(),
        contentType: data.type || 'application/octet-stream',
        contentLength: data.size,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown storage fetch error';
    console.error('Supabase getFile exception:', message);
    return {
      success: false,
      error: 'Document could not be retrieved from cloud storage.',
    };
  }
}

/**
 * Deletes a file from Supabase Storage.
 */
export async function deleteFileFromStorage(key: string): Promise<StorageResult> {
  if (!isStorageConfigured()) {
    return {
      success: false,
      error: 'Supabase Storage credentials are not configured.',
      isConfigMissing: true,
    };
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client.storage.from(bucketName).remove([key]);

    if (error) {
      console.error('Supabase remove failed:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to delete file from cloud storage.',
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown storage delete error';
    console.error('Supabase delete exception:', message);
    return {
      success: false,
      error: 'Failed to delete file from cloud storage.',
    };
  }
}
