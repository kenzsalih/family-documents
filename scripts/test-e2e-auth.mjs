import { spawn } from 'child_process';
import http from 'http';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';

const PORT = 3045;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_PASSWORD = 'VaultSecretPassword2026';
const TEST_HASH = bcrypt.hashSync(TEST_PASSWORD, 10);
const TEST_SECRET = 'super_secret_testing_session_token_32chars_min!';

console.log('=== RUNNING END-TO-END HTTP AUTHENTICATION TESTS ===\n');

// Set env vars for child process
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

async function run() {
  console.log(`Starting Next.js server on port ${PORT}...`);
  const server = spawn('node', ['./node_modules/next/dist/bin/next', 'start', '-p', String(PORT)], {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', () => {});
  server.stderr.on('data', () => {});

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

  try {
    await waitForServer(`${BASE_URL}/login`);
    console.log('Server is responsive. Running HTTP test suite...\n');

    // Test 1: Unauthenticated request to '/' must redirect to '/login'
    console.log('Test 1: Unauthenticated visit to protected homepage:');
    const res1 = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
    assert(
      res1.status === 307 || res1.status === 302,
      `Unauthenticated access receives redirect status (got ${res1.status})`
    );
    const location1 = res1.headers.get('location');
    assert(
      location1?.includes('/login'),
      `Redirect target is /login (got ${location1})`
    );

    // Test 2: Accessing /login is public
    console.log('\nTest 2: Public access to /login page:');
    const res2 = await fetch(`${BASE_URL}/login`);
    assert(res2.status === 200, `Login page returns HTTP 200 OK (got ${res2.status})`);
    const html2 = await res2.text();
    assert(
      html2.includes('Family Documents Vault') && html2.includes('Family Password'),
      'Login page renders password input and header'
    );

    // Test 3: Forged / Invalid session cookie is rejected
    console.log('\nTest 3: Forged session cookie rejection:');
    const res3 = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: 'family_vault_session=fake_invalid_token_12345' },
      redirect: 'manual'
    });
    assert(
      res3.status === 307 || res3.status === 302,
      `Forged session cookie is rejected with redirect (got ${res3.status})`
    );

    // Test 4: Valid session cookie grants access to protected page
    console.log('\nTest 4: Valid session cookie authentication:');
    const validToken = await new SignJWT({ authenticated: true, role: 'family_member' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(TEST_SECRET));

    const res4 = await fetch(`${BASE_URL}/`, {
      headers: { Cookie: `family_vault_session=${validToken}` },
      redirect: 'manual'
    });
    assert(res4.status === 200, `Protected homepage returns HTTP 200 OK with valid session`);
    const html4 = await res4.text();
    assert(
      html4.includes('Family Members') && html4.includes('Log Out'),
      'Protected homepage displays Family Members and Logout button'
    );

    // Test 5: Visiting /login with valid session redirects to '/'
    console.log('\nTest 5: Already-authenticated user visiting /login:');
    const res5 = await fetch(`${BASE_URL}/login`, {
      headers: { Cookie: `family_vault_session=${validToken}` },
      redirect: 'manual'
    });
    assert(
      res5.status === 307 || res5.status === 302,
      `Logged-in user visiting /login is redirected back to homepage (got ${res5.status})`
    );

    console.log('\n=================================================');
    console.log(`TOTAL E2E TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  } finally {
    server.kill();
  }
}

run().catch(err => {
  console.error('E2E Test execution failed:', err);
  process.exit(1);
});
