'use client';

import { useState } from 'react';
import { Share2, Check, X } from 'lucide-react';

interface ShareButtonProps {
  documentId: string;
  documentName: string;
  originalFilename: string;
  mimeType: string;
}

export function ShareButton({
  documentId,
  documentName,
  originalFilename,
  mimeType,
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [infoModal, setInfoModal] = useState<string | null>(null);

  async function handleShare() {
    setIsSharing(true);
    setInfoModal(null);

    try {
      // 1. Fetch file binary through authenticated endpoint
      const response = await fetch(`/api/documents/${documentId}/download`);
      if (!response.ok) {
        throw new Error('Could not download file for sharing.');
      }

      const blob = await response.blob();
      const file = new File([blob], originalFilename, { type: mimeType || 'application/octet-stream' });

      // 2. Check if mobile Web Share API with files is supported
      const hasWebShareFiles =
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (hasWebShareFiles) {
        try {
          await navigator.share({
            files: [file],
            title: documentName,
            text: `Sharing ${documentName}`,
          });
          return;
        } catch (shareErr: unknown) {
          if (shareErr instanceof Error && shareErr.name === 'AbortError') {
            // User cancelled the share dialog naturally
            return;
          }
          // If share rejected, fall through to desktop download fallback
        }
      }

      // 3. Fallback for Desktop & Unsupported Browsers:
      // Download the file locally and prompt user with sharing instructions
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = originalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setInfoModal(
        `"${originalFilename}" has been downloaded. You can now attach this file to WhatsApp, email, or any other application.`
      );
    } catch (err: unknown) {
      console.error('Sharing error:', err);
      alert('Unable to share document. Please try downloading it directly.');
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        disabled={isSharing}
        className="btn btn-secondary"
        style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
        title="Share via WhatsApp or device app"
      >
        <Share2 size={15} />
        <span>{isSharing ? 'Preparing...' : 'Share'}</span>
      </button>

      {/* Sharing Fallback Modal for Desktop */}
      {infoModal && (
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
          zIndex: 60,
          padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 700 }}>
                <Check size={20} />
                <span>File Ready for Sharing</span>
              </div>
              <button
                onClick={() => setInfoModal(null)}
                style={{ color: 'var(--text-muted)', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              {infoModal}
            </p>

            <button
              type="button"
              onClick={() => setInfoModal(null)}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
