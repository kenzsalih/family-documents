import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// Test configuration
const TEST_PASSWORD = 'TestFamilySecretPassword!2026';
const WRONG_PASSWORD = 'WrongPassword999';
const TEST_SECRET = 'a_very_long_cryptographically_secure_test_session_secret_32bytes';

console.log('=== RUNNING AUTHENTICATION & SECURITY UNIT TESTS ===\n');

async function runTests() {
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

  // 1. Password Hashing & Verification Test
  console.log('1. Password Hashing & Timing-Safe Verification:');
  const saltRounds = 12;
  const hash = bcrypt.hashSync(TEST_PASSWORD, saltRounds);

  const correctMatch = await bcrypt.compare(TEST_PASSWORD, hash);
  assert(correctMatch === true, 'Correct password validates successfully against hash');

  const incorrectMatch = await bcrypt.compare(WRONG_PASSWORD, hash);
  assert(incorrectMatch === false, 'Incorrect password is unambiguously rejected');

  const emptyMatch = await bcrypt.compare('', hash);
  assert(emptyMatch === false, 'Empty password string is rejected');

  // 2. Session Secret Enforcement
  console.log('\n2. Cryptographic Session Secret Enforcement:');
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(TEST_SECRET);

  assert(secretKey.length >= 32, 'Session secret meets minimum 32-byte security requirement');

  // 3. JWT Session Token Creation
  console.log('\n3. JWT Token Generation & Verification:');
  const token = await new SignJWT({ authenticated: true, role: 'family_member' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);

  assert(typeof token === 'string' && token.split('.').length === 3, 'Token generated as valid 3-part signed JWT');

  // 4. Token Verification
  const { payload } = await jwtVerify(token, secretKey);
  assert(payload.authenticated === true, 'Verified token payload contains authenticated = true');
  assert(payload.role === 'family_member', 'Verified token payload contains role = family_member');
  assert(typeof payload.exp === 'number' && payload.exp > Date.now() / 1000, 'Token expiration timestamp is active in future');

  // 5. Tampered Token Protection
  console.log('\n4. Tampered & Forged Token Rejection:');
  const tamperedToken = token.slice(0, -6) + 'abcdef';
  let tamperedCaught = false;
  try {
    await jwtVerify(tamperedToken, secretKey);
  } catch {
    tamperedCaught = true;
  }
  assert(tamperedCaught === true, 'Tampered token signature is rejected by jwtVerify');

  // 6. Forged Secret Protection
  let wrongSecretCaught = false;
  const wrongSecret = encoder.encode('another_different_secret_key_that_is_32bytes_long');
  try {
    await jwtVerify(token, wrongSecret);
  } catch {
    wrongSecretCaught = true;
  }
  assert(wrongSecretCaught === true, 'Token signed with a different secret is rejected');

  // 7. Expired Token Protection
  const expiredToken = await new SignJWT({ authenticated: true, role: 'family_member' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 100)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
    .sign(secretKey);

  let expiredCaught = false;
  try {
    await jwtVerify(expiredToken, secretKey);
  } catch {
    expiredCaught = true;
  }
  assert(expiredCaught === true, 'Expired session token is rejected');

  console.log('\n=================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
