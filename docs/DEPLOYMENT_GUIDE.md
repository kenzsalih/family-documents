# Deployment & Live Configuration Guide: Family Documents Vault

This guide details the complete, step-by-step procedure to connect your live **Neon PostgreSQL** database and **Cloudflare R2** private object storage, verify connectivity, and deploy the application to **Vercel**.

---

## 1. Local Configuration Workflow

All secrets reside in your local `.env.local` file (which is excluded from Git by `.gitignore`).

### Step 1: Copy Template
Create your local environment file:
```bash
cp .env.example .env.local
```

### Step 2: Set Up Shared Family Password & Session Secret
1. Choose a strong family passphrase and generate its bcrypt hash:
   ```bash
   npm run hash-password "YourFamilyPasswordHere"
   ```
   Copy the output and paste it into `.env.local`:
   ```env
   FAMILY_PASSWORD_HASH="$2a$12$..."
   ```

2. Generate a secure 32-byte secret for session cookies:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Paste into `.env.local`:
   ```env
   SESSION_SECRET="your-generated-64-character-hex-string"
   ```

---

## 2. Neon PostgreSQL Setup

1. **Create Free Neon Account**: Go to [neon.tech](https://neon.tech) and create a free project named `family-documents`.
2. **Copy Connection String**:
   - In the Neon Console Dashboard, under **Connection Details**, select **Node.js** or **Postgres**.
   - Copy the connection string (it will look like `postgresql://neondb_owner:***@ep-sample-12345.us-east-2.aws.neon.tech/neondb?sslmode=require`).
3. **Configure `.env.local`**:
   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-12345.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
4. **Deploy Database Schema**:
   Run the migration script to create `family_members` and `documents` tables with indexes:
   ```bash
   npm run db:migrate
   ```
   *Expected output: `Verification PASSED: family_members and documents tables are ready.`*

---

## 3. Supabase Storage Setup (Private Object Storage)

Supabase Storage provides **1 GB of free private file storage** on the free tier.

1. **Sign In to Supabase**: Go to the [Supabase Dashboard](https://supabase.com/dashboard) and navigate to your project.
2. **Create a Private Storage Bucket**:
   - In the left sidebar, click **Storage**.
   - Click **New Bucket**.
   - Name: `family documents`.
   - Toggle **Public bucket** to **OFF** (Keep bucket strictly private).
   - Set **Max file size limit** to `25MB`.
   - Set **Allowed MIME types** to: `application/pdf`, `image/jpeg`, `image/png`.
   - Click **Save**.
3. **Get API Credentials**:
   - Navigate to **Project Settings** (gear icon) -> **API**.
   - Copy your **Project URL** (e.g. `https://xxxx.supabase.co`).
   - Under **Project API Keys**, copy the **`service_role`** secret key (labeled `secret`).
   - *Security Note: Never use `anon`/public keys or expose `service_role` to the browser.*
4. **Configure `.env.local`**:
   ```env
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SECRET_KEY="your-supabase-service-role-secret-key"
   SUPABASE_BUCKET_NAME="family documents"
   ```

---

## 4. Verify Live Services

Before deploying, run the automated verification script:
```bash
npm run verify:live
```

When properly configured, you will see:
```text
=== LIVE CLOUD SERVICES VERIFICATION ===

1. Neon PostgreSQL Live Connection:
  ✓ LIVE CONNECTED: Database "neondb" on PostgreSQL
  ✓ TABLES VERIFIED: family_members and documents exist in public schema.

2. Supabase Storage Private Bucket Live Connection:
  ✓ UPLOAD: Successfully uploaded test PDF object to bucket "family documents".
  ✓ DOWNLOAD: Successfully retrieved and verified object contents.
  ✓ DELETE: Successfully removed test object from bucket.

=================================================
VERIFICATION SUMMARY:
- PostgreSQL Database: LIVE VERIFIED
- Supabase Storage: LIVE VERIFIED
=================================================
```

---

## 5. Vercel Production Deployment

### Step 1: Push Repository to GitHub
Ensure you have initialized git and created your private GitHub repository:
```bash
git add .
git commit -m "Migrate to Supabase Storage and complete vault implementation"
git remote add origin https://github.com/your-username/family-documents.git
git push -u origin main
```
*(Verify with `git status` that `.env.local` is NOT tracked).*

### Step 2: Deploy on Vercel
1. Log in to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Import your `family-documents` repository.
3. Framework Preset: **Next.js** (detected automatically).
4. Under **Environment Variables**, enter the production values:
   - `DATABASE_URL`
   - `FAMILY_PASSWORD_HASH`
   - `SESSION_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_BUCKET_NAME`
5. Click **Deploy**.

---

## 6. Post-Deployment Smoke Test Checklist

Once deployed on your Vercel URL (e.g. `https://your-family-vault.vercel.app`):

- [ ] **Unauthenticated Access**: Visiting the root URL without logging in redirects to `/login`.
- [ ] **Wrong Password**: Entering an incorrect password shows a generic `"Invalid password. Please try again."` error.
- [ ] **Login**: Entering the shared family password sets the `httpOnly` secure session cookie and opens the family directory.
- [ ] **Add Member**: Add a test family member (e.g., "Father"). Confirm the member card appears.
- [ ] **Upload File**: Open the member, upload a test PDF or photo with a title (e.g., "Passport"). Verify the upload succeeds.
- [ ] **View File**: Click **View**. The document opens inline in a new tab without exposing raw Supabase URLs.
- [ ] **Download File**: Click **Download**. The file downloads with its original name.
- [ ] **Share File**:
  - On a smartphone: tap **Share** to confirm the native WhatsApp/app drawer opens with the attached file.
  - On a desktop computer: click **Share** to confirm the file downloads and the attachment instruction prompt appears.
- [ ] **Delete Document**: Click **Delete**, confirm deletion, and verify the file is purged from Supabase Storage and PostgreSQL.
- [ ] **Delete Member**: Confirm deleting a member with documents warns of cascade deletion, and cleans up Supabase Storage objects before database deletion.
- [ ] **Logout**: Click **Log Out**. Confirm the session cookie is destroyed and subsequent requests to `/` or `/api/documents/...` return `401 Unauthorized`.

---

## 7. Free Tier Limits & Resource Monitoring

| Service | Free Tier Limit | Monitoring Rule |
| :--- | :--- | :--- |
| **Neon PostgreSQL** | 0.5 GB storage | Enough for >100,000 document metadata rows. Scales to zero and wakes up on demand without 7-day pause. |
| **Supabase Storage** | **1 GB storage free** | Accommodates hundreds of document scans/PDFs. |
| **Vercel** | 100 GB bandwidth / month | Typical family usage is ~2–5 GB/month. |
