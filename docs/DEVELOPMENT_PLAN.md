# Implementation Roadmap: Simple Family Document Vault

## 1. Project Philosophy

This roadmap breaks down the development of the private family document vault into **5 small, testable milestones**. Each milestone provides working, demonstrable functionality before proceeding to the next.

No extra features, dashboards, complex abstractions, or speculative future requirements will be built.

---

## 2. Infrastructure & Cost Analysis

The entire application runs reliably on zero-cost, reputable free tiers:

| Component | Service | Free Tier Limits | Family Usage Reality | Monthly Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Full-Stack App** | Vercel | 100 GB bandwidth | ~2 GB / month | **$0.00** |
| **Database** | Neon PostgreSQL | 0.5 GB storage, autoscaling | < 5 MB for all names & metadata | **$0.00** |
| **Object File Storage** | Supabase Storage | **1 GB storage free**, private buckets | Hundreds of PDF & image documents | **$0.00** |
| **Total Cost** | | | | **$0.00 / month** |

*Note: Neon Postgres autoscales to zero and wakes up on query; it does not pause or shut down after 7 days of inactivity.*

---

## 3. Implementation Milestones

### Milestone 1: Project Setup and Database Configuration [COMPLETED]
- **Objective**: Create the Next.js TypeScript project foundation and set up the two database tables.
- **Tasks Completed**:
  1. Initialized Next.js App Router project with TypeScript, ESLint, and responsive modern CSS.
  2. Configured environment variables template (`.env.example`) and ensured `.env*` is properly ignored in Git while allowing `!.env.example`.
  3. Created SQL schema file (`src/lib/db/schema.sql`) for `family_members` and `documents` tables with foreign key cascades and indexes.
  4. Created database client module (`src/lib/db/index.ts`) supporting PostgreSQL connection pooling.
  5. Created migration and verification script (`scripts/migrate.mjs`) accessible via `npm run db:migrate`.
  6. Verified linting (`npm run lint`) and production build compilation (`npm run build`) with zero errors.
- **Verification**: Type checks and production build pass with 0 errors. Database migration script (`npm run db:migrate`) is ready.
- **Database Status**: **Live connection is PENDING**. `DATABASE_URL` has not yet been set by the user; migrations will run once the connection string is provided.

### Milestone 2: Shared Login and Protected Application Access [COMPLETED]
- **Objective**: Implement the single shared family login and lock down all application pages.
- **Tasks Completed**:
  1. Built clean, responsive `/login` page (`src/app/login/page.tsx`) with lock icon, password input, and generic error messages.
  2. Implemented password hashing utility (`scripts/hash-password.mjs`) and verification against `FAMILY_PASSWORD_HASH` using `bcryptjs`.
  3. Implemented secure session token generation and verification using `jose` with minimum 32-byte secret enforcement.
  4. Configured encrypted `httpOnly`, `Secure` (production), `SameSite=Lax` cookie (`family_vault_session`) with 7-day expiration.
  5. Implemented Next.js 16 Proxy (`src/proxy.ts`) to automatically intercept and redirect unauthenticated requests to `/login`.
  6. Implemented strict server-side authorization guard (`requireAuth()`) in `src/lib/auth/session.ts` to ensure Server Actions and pages verify authentication independently of edge proxying.
  7. Added server-side **Logout** action (`logoutAction`) clearing the session cookie and redirecting to `/login`.
  8. Created comprehensive unit test suite (`scripts/test-auth.mjs`) and end-to-end HTTP test suite (`scripts/test-e2e-auth.mjs`) testing valid passwords, invalid passwords, forged tokens, expired tokens, unauthenticated redirects, authenticated homepage access, and post-logout access.
- **Verification**: All 11 unit tests and 8 end-to-end HTTP tests passed with 0 failures (`npm run test:auth`). Linting and production build passed with 0 errors.

### Milestone 3: Family Member Management [COMPLETED]
- **Objective**: Allow adding, viewing, and deleting family members with strict validation and cascade confirmation.
- **Tasks Completed**:
  1. Built data access module (`src/lib/members/index.ts`) querying `family_members` with document counts via `LEFT JOIN` and parameterized queries.
  2. Implemented name validation (`src/lib/members/validation.ts`) rejecting empty strings, whitespace, and names exceeding 150 characters.
  3. Created Server Actions (`src/app/actions/members.ts`) for adding and deleting members, guarded by server-side `requireAuth()`.
  4. Built responsive UI components:
     - `AddMemberForm.tsx`: Clean form with client and server validation.
     - `MemberList.tsx`: Responsive member directory showing document count badges, "Open Documents" links, and delete triggers.
     - `DeleteMemberModal.tsx`: Explicit confirmation modal warning users if the member has associated documents that will be permanently lost due to cascade deletion.
     - `DbStatusBanner.tsx`: Clear, non-intrusive warning displayed when the PostgreSQL database connection is unconfigured or unreachable.
  5. Implemented member document view route (`src/app/members/[id]/page.tsx`) with server-side authorization and breadcrumb navigation.
  6. Created unit test suite (`scripts/test-members.mjs`) testing valid names, trimmed inputs, empty names, length limits, SQL parameterization, deletion confirmation tokens, and cascade warning logic (14/14 tests passing).
- **Verification**: All 33 unit and integration tests passed (`npm run test`). Production build compiled cleanly with zero errors (`npm run build`).

### Milestone 4: Document Upload, Storage, Viewing, Downloading, Sharing & Deletion [COMPLETED]
- **Objective**: Complete all document actions for the selected family member with private R2 storage, strict validation, server authorization, and compensating failure handling.
- **Tasks Completed**:
  1. Configured Cloudflare R2 client module (`src/lib/storage/r2.ts`) using `@aws-sdk/client-s3` with private bucket operations (`PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`).
  2. Implemented document validation and binary inspection (`src/lib/documents/validation.ts`) verifying document names (non-empty, max 255 chars), file size limits (max 25 MB), extensions (`.pdf`, `.jpg`, `.jpeg`, `.png`), and magic byte headers (`%PDF`, `.PNG`, `\xFF\xD8\xFF`).
  3. Implemented document data access layer (`src/lib/documents/index.ts`) with unique UUID storage keys and compensating cleanup (automatically deleting the uploaded R2 object if the subsequent database insert fails).
  4. Updated member deletion in `src/lib/members/index.ts` to retrieve and purge all associated R2 storage objects before deleting the member.
  5. Built secure server-mediated viewing (`/api/documents/[id]/view`) and downloading (`/api/documents/[id]/download`) route handlers enforcing `requireAuth()`, setting `Content-Type`, `Cache-Control: private, no-store, max-age=0`, and `X-Content-Type-Options: nosniff`.
  6. Implemented Server Actions (`src/app/actions/documents.ts`) for document uploads and deletion with explicit confirmation.
  7. Built responsive document management UI:
     - `UploadDocumentForm.tsx`: File picker, document name input, size validation, and loading indicators.
     - `DocumentList.tsx`: Displays document cards with name, original filename, formatted size, upload date, and View/Download/Share/Delete actions.
     - `ShareButton.tsx`: Detects native Web Share API with files (`navigator.canShare({ files })`) for direct dispatch to WhatsApp/apps on mobile, falling back to local download with onscreen attachment instructions on desktop.
     - `DeleteDocumentModal.tsx`: Explicit confirmation modal warning users that the document will be permanently removed from storage and database.
     - `StorageStatusBanner.tsx`: Warning displayed when Cloudflare R2 credentials are unconfigured.
  8. Created comprehensive document test suite (`scripts/test-documents.mjs`) covering 22 test assertions.
- **Verification**: All 55 tests passed across auth, members, and document management (`npm run test`). Production build compiled cleanly with zero errors (`npm run build`).
- **Live Infrastructure Status**: **PENDING LIVE CREDENTIALS**. Both `DATABASE_URL` (Neon) and `R2_*` (Cloudflare) credentials remain pending in `.env.local`. Code handles missing credentials gracefully with status banners, and mock documents are never substituted for real files.

### Milestone 5: Testing, Security Verification and Deployment Preparation [COMPLETED]
- **Objective**: Harden deletion consistency across R2 and PostgreSQL, conduct full security review, execute 71 automated tests, and prepare production deployment guide.
- **Tasks Completed**:
  1. Resolved deletion consistency: Updated `deleteFamilyMember` in `src/lib/members/index.ts` to track individual R2 deletions; if any R2 file fails to delete, the operation halts, deletes database records only for the successfully purged files, and aborts deleting the member record, preventing uncontrolled database cascades from creating orphaned R2 files.
  2. Implemented security sanitization (`src/lib/security/sanitize.ts`):
     - Added strict UUID format validation (`isValidUuid`).
     - Hardened `Content-Disposition` header formatting adhering to RFC 6266 / RFC 5987, stripping CRLF injection, quotes, and path traversal characters.
  3. Hardened API route security:
     - Document view and download endpoints enforce UUID checks and return `401 Unauthorized` for unauthenticated requests.
     - Updated `src/proxy.ts` to return direct `401 Unauthorized` for API routes rather than HTML page redirects.
  4. Created live cloud services verification tool (`scripts/verify-live-services.mjs`), accessible via `npm run verify:live`.
  5. Created comprehensive deployment documentation (`docs/DEPLOYMENT_GUIDE.md`) detailing Neon setup, Cloudflare R2 private bucket creation, API token scoping, and Vercel environment variable configuration.
  6. Created Milestone 5 security test suite (`scripts/test-milestone5-security.mjs`).
- **Verification**: All 71 automated tests across authentication, member management, document storage, and security passed with 0 failures (`npm run test`). Production build compiled cleanly with zero errors (`npm run build`).
- **Live Infrastructure Status**: **PENDING USER CONFIGURATION**. The application is 100% implementation-ready and tested against unit/mock suites. Live verification script (`npm run verify:live`) correctly reports credentials as pending until configured in `.env.local`.

---

## 4. Required Environment Variables

```env
# PostgreSQL Database (Neon)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Shared Family Password Hash (Argon2id or bcrypt)
FAMILY_PASSWORD_HASH="$argon2id$..."

# Secret Key to sign/encrypt the session cookie
SESSION_SECRET="random-32-byte-hex-string"

# Supabase Storage (Private Object Storage)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SECRET_KEY="your-supabase-service-role-secret-key"
SUPABASE_BUCKET_NAME="family documents"
```
