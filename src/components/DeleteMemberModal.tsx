'use client';

import { useActionState, useEffect } from 'react';
import { deleteMemberAction } from '@/app/actions/members';
import type { FamilyMemberWithCount } from '@/lib/members';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteMemberModalProps {
  member: FamilyMemberWithCount | null;
  onClose: () => void;
}

export function DeleteMemberModal({ member, onClose }: DeleteMemberModalProps) {
  const [state, formAction, isPending] = useActionState(deleteMemberAction, null);

  // Close modal when deletion is successful
  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state, onClose]);

  if (!member) return null;

  const hasDocs = member.document_count > 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem',
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 700, fontSize: '1.1rem' }}>
            <AlertTriangle size={20} />
            <span>Confirm Deletion</span>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
            title="Cancel and close"
          >
            <X size={20} />
          </button>
        </div>

        {state?.error && (
          <div style={{
            padding: '0.6rem 0.85rem',
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            border: '1px solid #fecaca'
          }}>
            {state.error}
          </div>
        )}

        <div style={{ fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
          <p style={{ marginBottom: '0.75rem' }}>
            Are you sure you want to delete <strong>{member.name}</strong>?
          </p>

          {hasDocs ? (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fff1f2',
              border: '1px solid #fecdd3',
              borderRadius: 'var(--radius-sm)',
              color: '#9f1239',
              fontSize: '0.875rem'
            }}>
              <strong>⚠️ Permanent Document Loss Warning:</strong>
              <p style={{ marginTop: '0.25rem' }}>
                This member currently has <strong>{member.document_count} associated document{member.document_count === 1 ? '' : 's'}</strong>.
                Deleting this member will <strong>permanently delete the member and all {member.document_count} of their documents</strong> from the vault.
              </p>
              <p style={{ marginTop: '0.25rem', fontWeight: 600 }}>
                This action cannot be undone.
              </p>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              This member currently has no documents. Their profile will be removed from the directory.
            </p>
          )}
        </div>

        <form action={formAction}>
          <input type="hidden" name="memberId" value={member.id} />
          <input type="hidden" name="confirmed" value="yes" />

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-danger"
            >
              <Trash2 size={16} />
              <span>{isPending ? 'Deleting...' : 'Yes, Delete Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
