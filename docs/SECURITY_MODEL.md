# Security Model: Simple Family Document Vault

## 1. Security Overview

While the application features are deliberately simple, the documents stored are sensitive identity papers (passports, Aadhaar cards, licences). The security architecture enforces strict protection where it counts, without adding unnecessary administrative overhead.

---

## 2. Mandatory Security Rules

### 2.1 100% Private File Storage
- The Supabase Storage bucket has **public access completely disabled**.
- Raw storage URLs are never exposed or accessible to the public.
- Storage secret keys (`SUPABASE_SECRET_KEY`) exist solely on the server inside environment variables and are **never transmitted to client browsers**.

### 2.2 Server-Side Access Authorization
- All document list, upload, view, download, and delete endpoints run through Next.js middleware and server actions that verify the shared family session.
- Unauthenticated requests are immediately rejected (`401 Unauthorized` or redirect to `/login`).

### 2.3 Safe Document Serving
- When an authorized family member views or downloads a document, the server streams the file directly from storage or issues an ephemeral 60-second signed URL.
- Headers are set to prevent public caching:
  ```http
  Cache-Control: private, no-store, max-age=0
  X-Content-Type-Options: nosniff
  ```

### 2.4 Upload Validation
- **Supported Formats**: Only `.pdf`, `.jpg`, `.jpeg`, and `.png` are accepted.
- **MIME Type Check**: Server inspects incoming files to reject disguised executables, HTML, or scripts.
- **File Size Cap**: Maximum 25 MB per document.
- **Randomized Storage Keys**: Files are stored under opaque UUIDs (`family/{member_id}/{uuid}.{ext}`). Original filenames from users' phones or computers are never used as storage paths.

### 2.5 In-Device Sharing Security
- Sharing uses the device's native capabilities (**Web Share API** on mobile devices, direct file download on desktop).
- **Zero External Public Links**: The system never generates public share URLs or web tokens. Sharing a document means handing the actual file binary to WhatsApp or the user's local downloads folder. No third party can access the website to view documents.

### 2.6 Environment & Secret Management
- Secrets are stored in `.env.local` for development and Vercel Environment Variables for production.
- `.env.local` is excluded by `.gitignore`.
- Passwords are verified using timing-safe comparisons against an Argon2id or bcrypt hash (`FAMILY_PASSWORD_HASH`).

---

## 3. Shared Login Threat Model & Realistic Safeguards

| Concern | Realistic Risk | Built-in Protection |
| :--- | :--- | :--- |
| **Public Internet Crawlers / Bots** | High | All app routes and documents are gated behind the login screen. No public endpoints exist for documents. |
| **Accidental Deletion by Family Member** | Medium | The UI requires a simple confirmation prompt ("Are you sure you want to delete [Document Name]?") before executing the deletion. |
| **Brute Force on Login Password** | Medium | Simple IP rate limiting on login attempts (e.g., maximum 5 attempts per 15 minutes per IP). |
| **Session Hijacking** | Low | Session cookies are configured as `httpOnly`, `Secure` (HTTPS only), and `SameSite=Lax`. |
