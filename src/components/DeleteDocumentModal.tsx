'use client';

import { useActionState, useEffect } from 'react';
import { deleteDocumentAction } from '@/app/actions/documents';
import type { DocumentRecord } from '@/lib/db';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteDocumentModalProps {
  document: DocumentRecord | null;
  memberId: string;
  onClose: () => void;
}

export function DeleteDocumentModal({ document, memberId, onClose }: DeleteDocumentModalProps) {
  const [state, formAction, isPending] = useActionState(deleteDocumentAction, null);

  useEffect(() => {
    if (state?.success) {
      onClose();
    }
  }, [state, onClose]);

  if (!document) return null;

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
            <span>Confirm Document Deletion</span>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
            title="Cancel"
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
          <p style={{ marginBottom: '0.5rem' }}>
            Are you sure you want to permanently delete:
          </p>
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            marginBottom: '0.75rem'
          }}>
            <strong style={{ display: 'block', fontSize: '1rem' }}>{document.name}</strong>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>File: {document.original_filename}</span>
          </div>
          <p style={{ color: 'var(--danger)', fontSize: '0.875rem', fontWeight: 600 }}>
            This will remove the file from private cloud storage and database. This action cannot be undone.
          </p>
        </div>

        <form action={formAction}>
          <input type="hidden" name="documentId" value={document.id} />
          <input type="hidden" name="memberId" value={memberId} />
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
              <span>{isPending ? 'Deleting...' : 'Yes, Delete Document'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
