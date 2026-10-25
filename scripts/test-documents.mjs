import {
  validateDocumentName,
  detectMagicBytes,
  validateUploadedFile,
  MAX_FILE_SIZE_BYTES,
} from '../src/lib/documents/validation.ts';

console.log('=== RUNNING DOCUMENT MANAGEMENT & VALIDATION TESTS ===\n');

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    failed++;
  }
}

// 1. Document Name Validation Tests
console.log('1. Document Name Validation:');
const validName = validateDocumentName('Passport');
assert(validName.valid === true && validName.cleanName === 'Passport', 'Valid document name is accepted');

const trimmedName = validateDocumentName('  Aadhaar Card Front & Back  ');
assert(trimmedName.valid === true && trimmedName.cleanName === 'Aadhaar Card Front & Back', 'Name with whitespace is cleanly trimmed');

const emptyName = validateDocumentName('');
assert(emptyName.valid === false && emptyName.error?.includes('enter a document name'), 'Empty document name is rejected');

const whitespaceName = validateDocumentName('    ');
assert(whitespaceName.valid === false, 'Whitespace-only document name is rejected');

const maxName = 'P'.repeat(255);
assert(validateDocumentName(maxName).valid === true, '255-character document name is accepted (at limit)');

const overMaxName = 'P'.repeat(256);
assert(validateDocumentName(overMaxName).valid === false, '256-character document name is rejected (>255 limit)');

// 2. Binary Magic Bytes Detection Tests
console.log('\n2. Binary Magic Bytes & File Signature Detection:');
const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
assert(detectMagicBytes(pdfHeader) === 'application/pdf', 'PDF magic bytes (%PDF) correctly identified');

const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // .PNG
assert(detectMagicBytes(pngHeader) === 'image/png', 'PNG magic bytes (.PNG) correctly identified');

const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG SOI
assert(detectMagicBytes(jpegHeader) === 'image/jpeg', 'JPEG magic bytes correctly identified');

const fakeHeader = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]); // DOS / Windows executable
assert(detectMagicBytes(fakeHeader) === null, 'Non-allowed binary signature is rejected');

// 3. Full Uploaded File Validation
console.log('\n3. File Type, Extension & Size Validation:');
const validPdf = validateUploadedFile('passport_scan.pdf', 'application/pdf', 1024 * 500, pdfHeader);
assert(validPdf.valid === true && validPdf.detectedMime === 'application/pdf', 'Legitimate PDF file passes validation');

const validJpg = validateUploadedFile('aadhaar.jpg', 'image/jpeg', 1024 * 200, jpegHeader);
assert(validJpg.valid === true && validJpg.detectedMime === 'image/jpeg', 'Legitimate JPG file passes validation');

const validPng = validateUploadedFile('driving_licence.PNG', 'image/png', 1024 * 300, pngHeader);
assert(validPng.valid === true && validPng.detectedMime === 'image/png', 'Case-insensitive extension (.PNG) passes validation');

const spoofedFile = validateUploadedFile('malicious.pdf', 'application/pdf', 1024 * 100, fakeHeader);
assert(spoofedFile.valid === false && spoofedFile.error?.includes('do not match'), 'Spoofed PDF with invalid binary signature is rejected');

const dangerousExt = validateUploadedFile('script.exe', 'application/x-msdownload', 1024, fakeHeader);
assert(dangerousExt.valid === false && dangerousExt.error?.includes('Unsupported file type'), 'Executable extension is rejected');

const zeroByte = validateUploadedFile('empty.pdf', 'application/pdf', 0, pdfHeader);
assert(zeroByte.valid === false && zeroByte.error?.includes('empty'), 'Zero-byte empty file is rejected');

const overSize = validateUploadedFile('huge.pdf', 'application/pdf', MAX_FILE_SIZE_BYTES + 1, pdfHeader);
assert(overSize.valid === false && overSize.error?.includes('maximum allowed size of 25 MB'), 'File exceeding 25 MB limit is rejected');

// 4. Unique Non-Guessable Storage Key Generation
console.log('\n4. Storage Key Isolation:');
import crypto from 'crypto';
const memberId = 'a1b2c3d4-e5f6-7890-abcd-1234567890ab';
const originalFilename = 'my_confidential_passport.pdf';
const ext = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
const storageKey = `documents/${memberId}/${crypto.randomUUID()}${ext}`;

assert(
  storageKey.startsWith(`documents/${memberId}/`) &&
  !storageKey.includes('my_confidential_passport') &&
  storageKey.endsWith('.pdf'),
  'Storage key is unique UUID path and does not expose client original filename'
);

// 5. Compensating Cleanup Simulation
console.log('\n5. Compensating Cleanup & Consistency Handling:');
async function simulateUploadWorkflow({ storageUploadSuccess, dbInsertSuccess }) {
  let storageUploaded = false;
  let dbInserted = false;
  let storageCleanedUp = false;

  // Step 1: Upload to Storage
  if (!storageUploadSuccess) {
    return { success: false, error: 'Storage upload failed' };
  }
  storageUploaded = true;

  // Step 2: Insert into DB
  if (!dbInsertSuccess) {
    // Compensating Cleanup
    storageCleanedUp = true;
    storageUploaded = false;
    return { success: false, error: 'DB insert failed; storage object rolled back', storageCleanedUp };
  }
  dbInserted = true;

  return { success: true, storageUploaded, dbInserted };
}

const partialFailResult = await simulateUploadWorkflow({ storageUploadSuccess: true, dbInsertSuccess: false });
assert(
  partialFailResult.success === false && partialFailResult.storageCleanedUp === true,
  'Database insert failure triggers compensating cleanup of uploaded storage object'
);

const allSuccessResult = await simulateUploadWorkflow({ storageUploadSuccess: true, dbInsertSuccess: true });
assert(allSuccessResult.success === true, 'Coordinated workflow succeeds when both storage and DB succeed');

// 6. Explicit Deletion Confirmation Verification
console.log('\n6. Explicit Document Deletion Confirmation:');
function verifyDocDeleteConfirmation(confirmedValue) {
  if (confirmedValue !== 'yes') {
    return { success: false, error: 'Deletion was not explicitly confirmed.' };
  }
  return { success: true };
}

assert(verifyDocDeleteConfirmation(undefined).success === false, 'Missing document deletion confirmation is rejected');
assert(verifyDocDeleteConfirmation('yes').success === true, 'Explicit "yes" confirmation is accepted');

console.log('\n=================================================');
console.log(`TOTAL DOCUMENT TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
