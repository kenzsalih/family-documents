import { query } from '@/lib/db';
import type { FamilyMember } from '@/lib/db';
import { validateMemberName } from './validation';
import { deleteFileFromStorage } from '@/lib/storage/supabase';
import { isValidUuid } from '@/lib/security/sanitize';

export { validateMemberName };

export interface FamilyMemberWithCount extends FamilyMember {
  document_count: number;
}

export interface MemberOpResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  isDbUnavailable?: boolean;
}

/**
 * Retrieves all family members along with their associated document count.
 */
export async function getFamilyMembers(): Promise<MemberOpResult<FamilyMemberWithCount[]>> {
  try {
    const rows = await query<FamilyMemberWithCount>(`
      SELECT 
        m.id, 
        m.name, 
        m.created_at, 
        COUNT(d.id)::int as document_count
      FROM family_members m
      LEFT JOIN documents d ON m.id = d.family_member_id
      GROUP BY m.id, m.name, m.created_at
      ORDER BY m.created_at ASC;
    `);
    return { success: true, data: rows };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    const isConnError = message.includes('DATABASE_URL') || message.includes('connect') || message.includes('ECONNREFUSED');
    return {
      success: false,
      error: isConnError
        ? 'Database connection is not configured or unavailable.'
        : 'Failed to retrieve family members.',
      isDbUnavailable: isConnError,
    };
  }
}

/**
 * Retrieves a single family member by ID with their document count.
 */
export async function getFamilyMemberById(id: string): Promise<MemberOpResult<FamilyMemberWithCount>> {
  if (!isValidUuid(id)) {
    return { success: false, error: 'Invalid family member ID.' };
  }

  try {
    const rows = await query<FamilyMemberWithCount>(`
      SELECT 
        m.id, 
        m.name, 
        m.created_at, 
        COUNT(d.id)::int as document_count
      FROM family_members m
      LEFT JOIN documents d ON m.id = d.family_member_id
      WHERE m.id = $1
      GROUP BY m.id, m.name, m.created_at;
    `, [id]);

    if (rows.length === 0) {
      return { success: false, error: 'Family member not found.' };
    }

    return { success: true, data: rows[0] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    const isConnError = message.includes('DATABASE_URL') || message.includes('connect');
    return {
      success: false,
      error: isConnError ? 'Database connection is not configured.' : 'Failed to retrieve family member details.',
      isDbUnavailable: isConnError,
    };
  }
}

/**
 * Adds a new family member using parameterized query.
 */
export async function addFamilyMember(name: string): Promise<MemberOpResult<FamilyMember>> {
  const validation = validateMemberName(name);
  if (!validation.valid || !validation.cleanName) {
    return { success: false, error: validation.error };
  }

  try {
    const rows = await query<FamilyMember>(`
      INSERT INTO family_members (name)
      VALUES ($1)
      RETURNING id, name, created_at;
    `, [validation.cleanName]);

    return { success: true, data: rows[0] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    const isConnError = message.includes('DATABASE_URL') || message.includes('connect');
    return {
      success: false,
      error: isConnError ? 'Database connection is not configured.' : 'Could not add family member. Please try again.',
      isDbUnavailable: isConnError,
    };
  }
}

/**
 * Deletes a family member.
 * Note: Database schema uses ON DELETE CASCADE, so documents belonging to this member will also be deleted.
 */
export async function deleteFamilyMember(id: string): Promise<MemberOpResult<{ deletedId: string; documentCount: number }>> {
  if (!isValidUuid(id)) {
    return { success: false, error: 'Invalid family member ID.' };
  }

  try {
    // 1. Check member and current document count before deletion
    const memberCheck = await query<{ id: string; name: string; document_count: number }>(`
      SELECT 
        m.id, 
        m.name, 
        COUNT(d.id)::int as document_count
      FROM family_members m
      LEFT JOIN documents d ON m.id = d.family_member_id
      WHERE m.id = $1
      GROUP BY m.id, m.name;
    `, [id]);

    if (memberCheck.length === 0) {
      return { success: false, error: 'Family member does not exist or has already been deleted.' };
    }

    const docCount = memberCheck[0].document_count;

    // 2. Fetch all document storage keys for this member to delete from Supabase Storage
    const docRecords = await query<{ id: string; file_storage_key: string }>(`
      SELECT id, file_storage_key FROM documents WHERE family_member_id = $1;
    `, [id]);

    const failedDocIds: string[] = [];
    const successfulDocIds: string[] = [];

    for (const doc of docRecords) {
      if (doc.file_storage_key) {
        const storageRes = await deleteFileFromStorage(doc.file_storage_key);
        if (storageRes.success) {
          successfulDocIds.push(doc.id);
        } else {
          failedDocIds.push(doc.id);
          console.error(`[STORAGE_DELETION_ERROR] Failed to delete storage object for document ID ${doc.id}`);
        }
      }
    }

    // 3. Partial Failure Check: If any storage delete failed, DO NOT delete the family member
    // To maintain data consistency, delete DB records only for files successfully deleted from storage
    if (failedDocIds.length > 0) {
      if (successfulDocIds.length > 0) {
        await query(`
          DELETE FROM documents WHERE id = ANY($1::uuid[]);
        `, [successfulDocIds]);
      }

      return {
        success: false,
        error: `Could not delete ${failedDocIds.length} document file(s) from cloud storage. Member deletion was aborted to prevent orphaned data.`,
      };
    }

    // 4. All storage objects deleted successfully. Now delete the member row from PostgreSQL.
    const result = await query<{ id: string }>(`
      DELETE FROM family_members
      WHERE id = $1
      RETURNING id;
    `, [id]);

    if (result.length === 0) {
      return { success: false, error: 'Failed to delete family member from database.' };
    }

    return { success: true, data: { deletedId: id, documentCount: docCount } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    const isConnError = message.includes('DATABASE_URL') || message.includes('connect');
    return {
      success: false,
      error: isConnError ? 'Database connection is not configured.' : 'Could not delete family member.',
      isDbUnavailable: isConnError,
    };
  }
}
