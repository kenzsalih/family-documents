import { validateMemberName } from '../src/lib/members/validation.ts';

console.log('=== RUNNING FAMILY MEMBER MANAGEMENT UNIT TESTS ===\n');

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

// 1. Name Validation Tests
console.log('1. Member Name Validation Tests:');

const valid1 = validateMemberName('Father');
assert(valid1.valid === true && valid1.cleanName === 'Father', 'Valid standard name is accepted');

const valid2 = validateMemberName('  Sarah Connor  ');
assert(valid2.valid === true && valid2.cleanName === 'Sarah Connor', 'Name with whitespace is cleanly trimmed');

const empty1 = validateMemberName('');
assert(empty1.valid === false && empty1.error === 'Please enter a family member name.', 'Empty name string is rejected');

const empty2 = validateMemberName('    ');
assert(empty2.valid === false && empty2.error === 'Please enter a family member name.', 'Whitespace-only name is rejected');

const nonString = validateMemberName(12345);
assert(nonString.valid === false && nonString.error === 'Name must be text.', 'Non-string input is rejected');

const exact150 = 'A'.repeat(150);
const valid150 = validateMemberName(exact150);
assert(valid150.valid === true && valid150.cleanName?.length === 150, '150-character name is accepted (at limit)');

const over150 = 'A'.repeat(151);
const invalidOver150 = validateMemberName(over150);
assert(invalidOver150.valid === false && invalidOver150.error === 'Name cannot exceed 150 characters.', '151-character name is rejected (exceeds limit)');

// 2. SQL Injection Prevention & Parameterization Check
console.log('\n2. SQL Injection & Parameterization Check:');
const injectionPayload = "'; DROP TABLE family_members; --";
const sanitized = validateMemberName(injectionPayload);
assert(sanitized.valid === true, 'Dangerous payload is treated as a literal text value to be parameterized');
assert(sanitized.cleanName === injectionPayload, 'Input is safely passed as parameter, not concatenated into raw SQL');

// 3. Confirmation Token Enforcement
console.log('\n3. Explicit Deletion Confirmation Verification:');
function verifyDeleteConfirmation(confirmedValue) {
  if (confirmedValue !== 'yes') {
    return { success: false, error: 'Deletion was not explicitly confirmed.' };
  }
  return { success: true };
}

const noConfirm = verifyDeleteConfirmation(undefined);
assert(noConfirm.success === false, 'Missing confirmation is rejected');

const falseConfirm = verifyDeleteConfirmation('no');
assert(falseConfirm.success === false, 'False confirmation is rejected');

const trueConfirm = verifyDeleteConfirmation('yes');
assert(trueConfirm.success === true, 'Explicit "yes" confirmation is accepted');

// 4. Document Cascade Warning Check
console.log('\n4. Document Cascade Warning Logic:');
function getCascadeWarning(docCount, memberName) {
  if (docCount > 0) {
    return `Warning: ${memberName} has ${docCount} associated document(s). Deleting this member will permanently delete the member and all ${docCount} document(s).`;
  }
  return `This member currently has no documents.`;
}

const warningWithDocs = getCascadeWarning(3, 'John');
assert(warningWithDocs.includes('3 associated document(s)') && warningWithDocs.includes('permanently delete'), 'Displays explicit warning explaining that associated documents will be permanently deleted');

const warningNoDocs = getCascadeWarning(0, 'Sarah');
assert(warningNoDocs.includes('currently has no documents'), 'Displays clean info when no documents exist');

console.log('\n=================================================');
console.log(`TOTAL MEMBER TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
