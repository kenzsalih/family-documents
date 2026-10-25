import { AlertCircle } from 'lucide-react';

export function StorageStatusBanner({ message }: { message?: string }) {
  return (
    <div
      style={{
        padding: '1rem',
        backgroundColor: '#fffbeb',
        color: '#b45309',
        border: '1px solid #fde68a',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        fontSize: '0.9rem',
        lineHeight: 1.5,
      }}
    >
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div>
        <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#92400e' }}>
          Cloud Storage (Supabase) Pending Configuration
        </strong>
        <p>
          {message || 'Supabase Storage credentials are not yet configured or are currently unreachable.'}
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          To enable document uploads and downloads, set <code>SUPABASE_URL</code>, <code>SUPABASE_SECRET_KEY</code>,{' '}
          and <code>SUPABASE_BUCKET_NAME</code> in your <code>.env.local</code>.
        </p>
      </div>
    </div>
  );
}
