import { requireAuth } from '@/lib/auth/session';
import { logoutAction } from '@/app/actions/auth';
import { getFamilyMembers } from '@/lib/members';
import { AddMemberForm } from '@/components/AddMemberForm';
import { MemberList } from '@/components/MemberList';
import { DbStatusBanner } from '@/components/DbStatusBanner';
import { ShieldCheck, LogOut, Users } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Server-side authorization check (never relies solely on edge proxy)
  try {
    await requireAuth();
  } catch {
    redirect('/login');
  }

  // Retrieve family members from PostgreSQL
  const membersResult = await getFamilyMembers();

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
        {/* Database Status Warning if DB is pending or unavailable */}
        {membersResult.isDbUnavailable && (
          <DbStatusBanner message={membersResult.error} />
        )}

        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={22} color="var(--accent)" />
              <span>Family Members</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              Select a family member to view their documents, or add a new member below.
            </p>
          </div>
        </div>

        {/* Add Member Form */}
        <AddMemberForm />

        {/* Member Directory */}
        <MemberList members={membersResult.data || []} />
      </main>
    </>
  );
}
