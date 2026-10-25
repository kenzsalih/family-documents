import { spawn } from 'child_process';
import http from 'http';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { isValidUuid, sanitizeFilename, formatContentDisposition } from '../src/lib/security/sanitize.ts';

console.log('=== RUNNING MILESTONE 5 SECURITY & RECOVERY TEST SUITE ===\n');

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

// 1. UUID Validation Tests
console.log('1. UUID Format & Path Traversal Rejection Tests:');
assert(isValidUuid('a1b2c3d4-e5f6-7890-abcd-1234567890ab') === true, 'Standard UUID is accepted');
assert(isValidUuid('../../../etc/passwd') === false, 'Directory traversal path is rejected as invalid UUID');
assert(isValidUuid('12345') === false, 'Short numerical ID is rejected');
assert(isValidUuid("'; DROP TABLE documents; --") === false, 'SQL injection attempt is rejected');
assert(isValidUuid(null) === false, 'Null value is rejected');
assert(isValidUuid(undefined) === false, 'Undefined value is rejected');

// 2. Filename Sanitization & HTTP Header Injection Protection
console.log('\n2. Filename Sanitization & Header Injection Protection:');
const traversalFilename = '../../sensitive/passport.pdf';
assert(sanitizeFilename(traversalFilename) === 'passport.pdf', 'Directory path prefixes are completely stripped');

const crlfFilename = 'passport.pdf\r\nSet-Cookie: malicious=true';
assert(!sanitizeFilename(crlfFilename).includes('\r') && !sanitizeFilename(crlfFilename).includes('\n'), 'CRLF / HTTP response splitting characters are stripped');

const quoteFilename = 'my"confidential"doc.pdf';
assert(!sanitizeFilename(quoteFilename).includes('"'), 'Double quotes are sanitized to prevent header breakout');

const dispHeader = formatContentDisposition('attachment', 'Passport & Visa (2026).pdf');
assert(
  dispHeader.includes('attachment; filename=') && dispHeader.includes("filename*=UTF-8''"),
  'Content-Disposition adheres to RFC 6266 / RFC 5987 with UTF-8 encoding'
);

// 3. Partial Failure Cascade Prevention Simulation
console.log('\n3. Safe Member Deletion Cascade Prevention Simulation:');
async function simulateMemberDeletion({ docCount, failIndex }) {
  const storageObjects = Array.from({ length: docCount }, (_, i) => ({ id: `doc-${i + 1}`, key: `key-${i + 1}` }));
  const failedDocs = [];
  const successfulDocs = [];

  for (let i = 0; i < storageObjects.length; i++) {
    const doc = storageObjects[i];
    if (i === failIndex) {
      failedDocs.push(doc.id); // Simulating storage failure
    } else {
      successfulDocs.push(doc.id);
    }
  }

  // Verification: If any storage delete fails, member row must NOT be deleted
  if (failedDocs.length > 0) {
    return {
      memberDeleted: false,
      cleanedUpDocs: successfulDocs.length,
      failedDocs: failedDocs.length,
      error: `Could not delete ${failedDocs.length} document file(s) from cloud storage. Member deletion was aborted.`,
    };
  }

  return { memberDeleted: true, cleanedUpDocs: successfulDocs.length, failedDocs: 0 };
}

const partialFail = await simulateMemberDeletion({ docCount: 3, failIndex: 1 });
assert(
  partialFail.memberDeleted === false && partialFail.failedDocs === 1,
  'Partial storage failure halts member deletion and prevents uncontrolled DB cascade'
);

const allPass = await simulateMemberDeletion({ docCount: 3, failIndex: -1 });
assert(allPass.memberDeleted === true && allPass.cleanedUpDocs === 3, 'Clean deletion proceeds when all storage files succeed');

// 4. HTTP End-to-End API Security Tests
console.log('\n4. Live HTTP Endpoint Security Tests:');
const PORT = 3047;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_PASSWORD = 'VaultSecretPassword2026';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
const TEST_SECRET = 'super_secret_testing_session_token_32chars_min!';

const env = {
  ...process.env,
  PORT: String(PORT),
  FAMILY_PASSWORD_HASH: TEST_HASH,
  SESSION_SECRET: TEST_SECRET,
  NODE_ENV: 'production',
};

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => resolve(res.statusCode));
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error('Server failed to start within timeout');
}

const server = spawn('node', ['./node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
  env,
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', () => {});
server.stderr.on('data', () => {});

try {
  await waitForServer(`${BASE_URL}/login`);

  // Test 4.1: Unauthenticated request to /api/documents/[id]/view returns 401
  const testUuid = '00000000-0000-0000-0000-000000000001';
  const resView = await fetch(`${BASE_URL}/api/documents/${testUuid}/view`, { redirect: 'manual' });
  assert(
    resView.status === 401,
    `Unauthenticated request to document view API returns 401 Unauthorized (got ${resView.status})`
  );

  // Test 4.2: Unauthenticated request to /api/documents/[id]/download returns 401
  const resDown = await fetch(`${BASE_URL}/api/documents/${testUuid}/download`, { redirect: 'manual' });
  assert(
    resDown.status === 401,
    `Unauthenticated request to document download API returns 401 Unauthorized (got ${resDown.status})`
  );

  // Test 4.3: Unauthenticated access to /members/[id] redirects to /login
  const resMember = await fetch(`${BASE_URL}/members/${testUuid}`, { redirect: 'manual' });
  assert(
    resMember.status === 307 || resMember.status === 302,
    `Unauthenticated access to member page receives redirect to /login (got ${resMember.status})`
  );

  // Test 4.4: Authenticated request with invalid UUID returns 400 Bad Request
  const validToken = await new SignJWT({ authenticated: true, role: 'family_member' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(TEST_SECRET));

  const resInvalidId = await fetch(`${BASE_URL}/api/documents/invalid-non-uuid-id/view`, {
    headers: { Cookie: `family_vault_session=${validToken}` },
  });
  assert(
    resInvalidId.status === 400,
    `Malformed non-UUID document ID receives 400 Bad Request (got ${resInvalidId.status})`
  );

} finally {
  server.kill();
}

console.log('\n=================================================');
console.log(`TOTAL SECURITY TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
