import { AlertCircle } from 'lucide-react';

export function DbStatusBanner({ message }: { message?: string }) {
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
          Database Connection Pending
        </strong>
        <p>
          {message || 'The PostgreSQL database connection is not yet configured or is currently unreachable.'}
        </p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
          To connect your database, set <code>DATABASE_URL</code> in <code>.env.local</code> and run{' '}
          <code>npm run db:migrate</code>.
        </p>
      </div>
    </div>
  );
}
