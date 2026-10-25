'use client';

import { useActionState, useRef, useState } from 'react';
import { uploadDocumentAction } from '@/app/actions/documents';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { MAX_FILE_SIZE_BYTES } from '@/lib/documents/validation';

interface UploadDocumentFormProps {
  memberId: string;
  memberName: string;
}

export function UploadDocumentForm({ memberId, memberName }: UploadDocumentFormProps) {
  const [state, formAction, isPending] = useActionState(uploadDocumentAction, null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    const rawName = formData.get('name');
    const file = formData.get('file');

    if (!rawName || typeof rawName !== 'string' || rawName.trim().length === 0) {
      setClientError('Please enter a document name (e.g., Passport, Aadhaar Card).');
      return;
    }

    if (rawName.trim().length > 255) {
      setClientError('Document name cannot exceed 255 characters.');
      return;
    }

    if (!file || !(file instanceof File) || file.size === 0) {
      setClientError('Please select a file to upload.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setClientError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const validExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const hasValidExt = validExts.some(ext => lowerName.endsWith(ext));
    if (!hasValidExt) {
      setClientError('Unsupported format. Please select a PDF, JPG, or PNG file.');
      return;
    }

    setClientError(null);
    setSuccessNotice(`Uploaded "${rawName.trim()}" successfully.`);
    formAction(formData);
    formRef.current?.reset();
  }

  const errorMessage = clientError || state?.error;

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <UploadCloud size={20} color="var(--accent)" />
        <span>Upload Document for {memberName}</span>
      </h2>

      {errorMessage && (
        <div style={{
          padding: '0.65rem 0.85rem',
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          marginBottom: '1rem',
          border: '1px solid #fecaca'
        }}>
          {errorMessage}
        </div>
      )}

      {state?.success && successNotice && (
        <div style={{
          padding: '0.65rem 0.85rem',
          backgroundColor: '#f0fdf4',
          color: 'var(--success)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          marginBottom: '1rem',
          border: '1px solid #bbf7d0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{successNotice}</span>
        </div>
      )}

      <form ref={formRef} action={handleSubmit}>
        <input type="hidden" name="memberId" value={memberId} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1rem' }}>
          <div>
            <label htmlFor="docName" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Document Name
            </label>
            <input
              id="docName"
              type="text"
              name="name"
              placeholder="e.g., Passport, Aadhaar, Driving Licence"
              maxLength={255}
              className="form-input"
              required
              disabled={isPending}
            />
          </div>

          <div>
            <label htmlFor="docFile" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Select File (PDF, JPG, PNG — max 25 MB)
            </label>
            <input
              id="docFile"
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="form-input"
              style={{ padding: '0.45rem' }}
              required
              disabled={isPending}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          {isPending ? 'Uploading to Secure Cloud Storage...' : 'Upload Document'}
        </button>
      </form>
    </div>
  );
}
