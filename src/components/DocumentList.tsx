'use client';

import { useState } from 'react';
import type { DocumentRecord } from '@/lib/db';
import { ShareButton } from '@/components/ShareButton';
import { DeleteDocumentModal } from '@/components/DeleteDocumentModal';
import { FileText, Eye, Download, Trash2, FolderOpen } from 'lucide-react';

interface DocumentListProps {
  documents: DocumentRecord[];
  memberId: string;
  memberName: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function DocumentList({ documents, memberId, memberName }: DocumentListProps) {
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);

  if (documents.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-light)',
          color: 'var(--accent)',
          marginBottom: '0.75rem'
        }}>
          <FolderOpen size={24} />
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.35rem' }}>
          No Documents Stored Yet
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto' }}>
          No documents have been added for {memberName}. Use the upload form above to add their passport, ID card, or other certificates.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gap: '0.85rem' }}>
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Document Details */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <FileText size={20} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {doc.name}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  <span>{doc.original_filename}</span>
                  <span>•</span>
                  <span>{formatFileSize(Number(doc.file_size_bytes))}</span>
                  <span>•</span>
                  <span>Uploaded {formatDate(doc.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {/* View Inline (PDF / Image in browser) */}
              <a
                href={`/api/documents/${doc.id}/view`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                title="View document inline"
              >
                <Eye size={15} />
                <span>View</span>
              </a>

              {/* Download */}
              <a
                href={`/api/documents/${doc.id}/download`}
                download
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                title="Download original file"
              >
                <Download size={15} />
                <span>Download</span>
              </a>

              {/* Share */}
              <ShareButton
                documentId={doc.id}
                documentName={doc.name}
                originalFilename={doc.original_filename}
                mimeType={doc.mime_type}
              />

              {/* Delete */}
              <button
                type="button"
                onClick={() => setDocToDelete(doc)}
                className="btn btn-secondary"
                style={{ color: 'var(--danger)', borderColor: '#fecaca', padding: '0.45rem 0.65rem' }}
                title={`Delete ${doc.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <DeleteDocumentModal
        document={docToDelete}
        memberId={memberId}
        onClose={() => setDocToDelete(null)}
      />
    </>
  );
}
