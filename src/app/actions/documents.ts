'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { uploadDocument, deleteDocument } from '@/lib/documents';

export interface DocumentActionResponse {
  success?: boolean;
  error?: string;
  isDbUnavailable?: boolean;
  isStorageUnavailable?: boolean;
}

/**
 * Server Action: Upload a document for a family member
 */
export async function uploadDocumentAction(
  _prevState: DocumentActionResponse | null,
  formData: FormData
): Promise<DocumentActionResponse> {
  // 1. Strict Server-Side Authorization Guard
  try {
    await requireAuth();
  } catch {
    return { error: 'Unauthorized: You must be logged in to upload documents.' };
  }

  const memberId = formData.get('memberId');
  const name = formData.get('name');
  const file = formData.get('file');

  if (!memberId || typeof memberId !== 'string') {
    return { error: 'Invalid family member ID.' };
  }

  if (!name || typeof name !== 'string') {
    return { error: 'Please enter a document name.' };
  }

  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'Please select a file to upload.' };
  }

  const result = await uploadDocument(memberId, name, file);
  if (!result.success) {
    return {
      error: result.error,
      isDbUnavailable: result.isDbUnavailable,
      isStorageUnavailable: result.isStorageUnavailable,
    };
  }

  revalidatePath(`/members/${memberId}`);
  return { success: true };
}

/**
 * Server Action: Delete a document
 * Requires explicit confirmation token.
 */
export async function deleteDocumentAction(
  _prevState: DocumentActionResponse | null,
  formData: FormData
): Promise<DocumentActionResponse> {
  // 1. Strict Server-Side Authorization Guard
  try {
    await requireAuth();
  } catch {
    return { error: 'Unauthorized: You must be logged in to delete documents.' };
  }

  const documentId = formData.get('documentId');
  const memberId = formData.get('memberId');
  const confirmed = formData.get('confirmed');

  if (!documentId || typeof documentId !== 'string') {
    return { error: 'Invalid document ID.' };
  }

  if (confirmed !== 'yes') {
    return { error: 'Deletion was not explicitly confirmed.' };
  }

  const result = await deleteDocument(documentId);
  if (!result.success) {
    return {
      error: result.error,
      isDbUnavailable: result.isDbUnavailable,
      isStorageUnavailable: result.isStorageUnavailable,
    };
  }

  if (memberId && typeof memberId === 'string') {
    revalidatePath(`/members/${memberId}`);
  }
  return { success: true };
}
