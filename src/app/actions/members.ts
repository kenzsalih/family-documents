'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { addFamilyMember, deleteFamilyMember } from '@/lib/members';

export interface ActionResponse {
  success?: boolean;
  error?: string;
  isDbUnavailable?: boolean;
}

/**
 * Server Action: Add a new family member
 * Verifies session, validates input, executes parameterized SQL insert.
 */
export async function addMemberAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  // 1. Strict Server-Side Authorization Guard
  try {
    await requireAuth();
  } catch {
    return { error: 'Unauthorized: You must be logged in to add family members.' };
  }

  // 2. Extract and sanitize input
  const name = formData.get('name');
  if (!name || typeof name !== 'string') {
    return { error: 'Please enter a valid family member name.' };
  }

  // 3. Delegate to data layer
  const result = await addFamilyMember(name);
  if (!result.success) {
    return { error: result.error, isDbUnavailable: result.isDbUnavailable };
  }

  // 4. Revalidate home page cache
  revalidatePath('/');
  return { success: true };
}

/**
 * Server Action: Delete a family member
 * Requires explicit confirmation token, verifies session, executes parameterized SQL delete.
 */
export async function deleteMemberAction(
  _prevState: ActionResponse | null,
  formData: FormData
): Promise<ActionResponse> {
  // 1. Strict Server-Side Authorization Guard
  try {
    await requireAuth();
  } catch {
    return { error: 'Unauthorized: You must be logged in to delete family members.' };
  }

  // 2. Validate member ID and explicit confirmation
  const memberId = formData.get('memberId');
  const confirmed = formData.get('confirmed');

  if (!memberId || typeof memberId !== 'string') {
    return { error: 'Invalid family member ID.' };
  }

  if (confirmed !== 'yes') {
    return { error: 'Deletion was not explicitly confirmed.' };
  }

  // 3. Execute delete
  const result = await deleteFamilyMember(memberId);
  if (!result.success) {
    return { error: result.error, isDbUnavailable: result.isDbUnavailable };
  }

  // 4. Revalidate home page cache
  revalidatePath('/');
  return { success: true };
}
