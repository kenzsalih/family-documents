'use client';

import { useActionState, useRef, useState } from 'react';
import { addMemberAction } from '@/app/actions/members';
import { UserPlus } from 'lucide-react';

export function AddMemberForm() {
  const [state, formAction, isPending] = useActionState(addMemberAction, null);
  const [clientError, setClientError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    const rawName = formData.get('name');
    if (!rawName || typeof rawName !== 'string' || rawName.trim().length === 0) {
      setClientError('Please enter a family member name.');
      return;
    }
    if (rawName.trim().length > 150) {
      setClientError('Name cannot exceed 150 characters.');
      return;
    }
    setClientError(null);
    formAction(formData);
    formRef.current?.reset();
  }

  const errorMessage = clientError || state?.error;

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <UserPlus size={18} color="var(--accent)" />
        <span>Add Family Member</span>
      </h2>

      {errorMessage && (
        <div style={{
          padding: '0.6rem 0.85rem',
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          marginBottom: '0.85rem',
          border: '1px solid #fecaca'
        }}>
          {errorMessage}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px' }}>
          <input
            type="text"
            name="name"
            onChange={() => {
              if (clientError) setClientError(null);
            }}
            placeholder="Enter family member's name (e.g., Father, John, Sarah)"
            maxLength={150}
            className="form-input"
            required
            disabled={isPending}
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn btn-primary"
          style={{ flexShrink: 0 }}
        >
          {isPending ? 'Adding...' : 'Add Member'}
        </button>
      </form>
    </div>
  );
}
