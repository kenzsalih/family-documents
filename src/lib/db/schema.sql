-- Database Schema: Simple Family Document Vault
-- Compatible with PostgreSQL 14+ (including Neon Serverless PostgreSQL)

-- 1. Family Members Table
CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_storage_key VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_documents_family_member ON documents (family_member_id);
CREATE INDEX IF NOT EXISTS idx_family_members_created ON family_members (created_at ASC);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents (created_at DESC);
