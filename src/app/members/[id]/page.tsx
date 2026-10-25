import { requireAuth } from '@/lib/auth/session';
import { logoutAction } from '@/app/actions/auth';
import { getFamilyMemberById } from '@/lib/members';
import { getDocumentsByMemberId } from '@/lib/documents';
import { isStorageConfigured } from '@/lib/storage/supabase';
import { UploadDocumentForm } from '@/components/UploadDocumentForm';
import { DocumentList } from '@/components/DocumentList';
import { StorageStatusBanner } from '@/components/StorageStatusBanner';
import { DbStatusBanner } from '@/components/DbStatusBanner';
import { ShieldCheck, LogOut, ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function MemberDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 1. Strict Server-Side Authorization Guard
  try {
    await requireAuth();
  } catch {
    redirect('/login');
  }

  const { id } = await params;
  if (!id) {
    notFound();
  }

  // 2. Fetch member profile
  const memberResult = await getFamilyMemberById(id);
  if (!memberResult.success || !memberResult.data) {
    if (memberResult.isDbUnavailable) {
      redirect('/');
    }
    notFound();
  }

  const member = memberResult.data;

  // 3. Fetch documents for this member
  const docsResult = await getDocumentsByMemberId(id);
  const storageReady = isStorageConfigured();

  return (
    <>
      <header className="app-header">
        <div className="app-header-content">
          <div className="brand-title">
            <ShieldCheck size={22} color="var(--accent)" />
            <span>Family Documents Vault</span>
          </div>

          <form action={logoutAction}>
            <button type="submit" className="btn btn-secondary" title="Log out of the family vault">
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </form>
        </div>
      </header>

      <main className="container">
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '1.25rem' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Family Members</span>
          </Link>
        </div>

        {/* Database Notice if DB is unavailable */}
        {docsResult.isDbUnavailable && (
          <DbStatusBanner message={docsResult.error} />
        )}

        {/* Storage Notice if Supabase Storage is pending configuration */}
        {!storageReady && (
          <StorageStatusBanner />
        )}

        {/* Member Profile Header */}
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            <User size={22} />
          </div>

          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {member.name}
            </h1>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {docsResult.data ? `${docsResult.data.length} ${docsResult.data.length === 1 ? 'document' : 'documents'} stored in vault` : 'Document vault'}
            </span>
          </div>
        </div>

        {/* Upload Document Form */}
        <UploadDocumentForm memberId={member.id} memberName={member.name} />

        {/* Document List with View, Download, Share, Delete */}
        <DocumentList
          documents={docsResult.data || []}
          memberId={member.id}
          memberName={member.name}
        />
      </main>
    </>
  );
}
