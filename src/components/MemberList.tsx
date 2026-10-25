'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FamilyMemberWithCount } from '@/lib/members';
import { DeleteMemberModal } from '@/components/DeleteMemberModal';
import { User, FileText, ArrowRight, Trash2, Users } from 'lucide-react';

interface MemberListProps {
  members: FamilyMemberWithCount[];
}

export function MemberList({ members }: MemberListProps) {
  const [memberToDelete, setMemberToDelete] = useState<FamilyMemberWithCount | null>(null);

  if (members.length === 0) {
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
          <Users size={24} />
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.35rem' }}>
          No Family Members Yet
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto' }}>
          Use the form above to add your first family member. Once added, you will be able to store and view their documents.
        </p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'grid', gap: '0.85rem' }}>
        {members.map((member) => (
          <div
            key={member.id}
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
            {/* Member Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  flexShrink: 0,
                }}
              >
                <User size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {member.name}
                </h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    fontSize: '0.825rem',
                    color: member.document_count > 0 ? 'var(--accent)' : 'var(--text-muted)',
                    fontWeight: 500,
                    marginTop: '0.15rem',
                  }}
                >
                  <FileText size={13} />
                  <span>
                    {member.document_count} {member.document_count === 1 ? 'document' : 'documents'}
                  </span>
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Link
                href={`/members/${member.id}`}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
              >
                <span>Open Documents</span>
                <ArrowRight size={15} />
              </Link>

              <button
                type="button"
                onClick={() => setMemberToDelete(member)}
                className="btn btn-secondary"
                style={{ color: 'var(--danger)', borderColor: '#fecaca', padding: '0.45rem 0.65rem' }}
                title={`Delete ${member.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <DeleteMemberModal
        member={memberToDelete}
        onClose={() => setMemberToDelete(null)}
      />
    </>
  );
}
