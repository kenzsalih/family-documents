# Project Requirements: Simple Family Document Vault

## 1. Project Objective

Build a simple, private website where a family can store, view, download, and share each other's important documents.

Examples of documents:
- Passports
- Aadhaar cards
- Driving licences
- PAN cards
- Educational certificates
- Other personal family documents

All authorized family members can access and download documents belonging to any family member.

The website is accessible over the internet from mobile phones and desktop computers. While the website URL is accessible online, all family information and documents must remain strictly private.

---

## 2. Core User Experience

The application has a single, straightforward workflow:
1. A family member opens the website.
2. They log in using the shared family account password.
3. They see the list of family members.
4. They select a family member to open that person's documents.
5. They can upload a new document with a simple name (e.g., "Passport", "Aadhaar Card").
6. They can view the document inline or download it.
7. They can press **Share** to send the file via WhatsApp or another app using the device's native sharing options.
8. They can delete a document when it is no longer needed.
9. They can log out.

---

## 3. Functional Requirements

### 3.1 Authentication
- **Single Shared Login**: One shared family account for all members.
- **Login Page**: Clean, simple password entry (or email + password).
- **Session Security**: Server-enforced session protection. All pages and documents are inaccessible to unauthenticated visitors.
- **Logout Action**: Immediate session termination.

### 3.2 Family Member Management
- **List Family Members**: View the list of family members.
- **Add Family Member**: Add a member by entering their name.
- **Delete Family Member**: Requires explicit confirmation. If the member has associated documents, clearly explain that all their documents will also be permanently deleted. Never silently delete associated documents.
- **Select Member**: Tap/click a member to open their document collection.
- *Strictly Excluded*: No avatars, birthdays, blood groups, relationship dropdowns, or complex profiles.

### 3.3 Document Management
- **Document List**: For the selected family member, show their documents with:
  - Document Name (e.g., "Aadhaar Card", "Passport")
  - Original file name
  - Upload date
- **Upload Document**:
  - File picker (supports PDF, JPG, JPEG, PNG).
  - Text input for Document Name.
  - Direct upload to private cloud storage with server-side authorization and validation.
- **View Document**: Inline viewing for PDFs and images.
- **Download Document**: Direct download with the original filename.
- **Delete Document**: Requires explicit user confirmation. Removes the file from private cloud storage and deletes the database record. Handles database and cloud storage failures safely, never reporting successful deletion if the file or database record remains unexpectedly.

### 3.4 Simple Document Sharing
- Each document row has a **Share** button.
- **Mobile Devices (Phones/Tablets)**:
  - Uses the standard browser **Web Share API** (`navigator.share({ files: [...] })`).
  - When the user taps Share, the phone opens its native sharing menu allowing immediate dispatch to **WhatsApp**, AirDrop, Email, or Messaging apps.
  - If direct file sharing is not supported by the browser, the file downloads automatically and prompts the user to attach it.
- **Desktop Browsers**:
  - Automatically downloads the file and displays a clear hint on how to drag or attach the downloaded file into WhatsApp Web, email, or other desktop apps.
- *Strictly Excluded*: No public web share links, no expiration dates, no view limits, no token management, and no external access dashboards.

---

## 4. Explicitly Excluded Features

To maintain maximum simplicity and ease of use, the following are **not** implemented:
- No document categories or subfolders.
- No document expiration dates or renewal reminders.
- No email or SMS notifications.
- No individual user accounts or multi-user permissions.
- No multi-factor authentication (MFA).
- No external public sharing links or token systems.
- No password-protected share links.
- No document tags or complex search queries.
- No audit logs or analytics dashboards.
- No trash bins or elaborate recovery systems (deletions are direct and simple).
- No extra profile fields beyond the family member's name.
- No native mobile app store apps (standard responsive browser support is sufficient).
